const TOKEN_KEY = 'granafacil.sessionToken';
const DEVICE_HASH_KEY = 'granafacil.deviceHash';

function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function computeDeviceHash(): Promise<string | undefined> {
  try {
    const cached = window.localStorage.getItem(DEVICE_HASH_KEY);
    if (cached) return cached;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let canvasFp = '';
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('granafacil-fp', 2, 2);
      canvasFp = canvas.toDataURL();
    }
    const input =
      canvasFp +
      '|' +
      navigator.userAgent +
      '|' +
      navigator.language +
      '|' +
      `${screen.width}x${screen.height}` +
      '|' +
      new Date().getTimezoneOffset();
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    window.localStorage.setItem(DEVICE_HASH_KEY, hex);
    return hex;
  } catch {
    return undefined;
  }
}

function setToken(token: string | null): void {
  try {
    if (token === null) window.localStorage.removeItem(TOKEN_KEY);
    else window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage unavailable (private mode etc) — in-memory only
  }
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const err = (data as { error?: string }).error ?? `HTTP ${res.status}`;
    throw new Error(err);
  }
  return data as T;
}

export interface GrantConsentResponse {
  userId: string;
  consentId: string;
  sessionToken: string;
  expiresAt: string;
}

export interface IngestResponse {
  snapshotId: string;
  hash: string;
  profile: { profileId: string; persona: string };
}

export interface DecisionResponse {
  decisionId: string;
  score: number;
  approved: boolean;
  creditLimit?: number;
  denialReason?: string;
  explanation: string;
  rowHash: string;
}

export interface PixResponse {
  txid: string;
  valor: string;
  status: string;
  chave: string;
  decisionId: string;
  criadoEm: string;
  disclaimer: string;
}

export const api = {
  grantConsent: async (email: string, scope: Record<string, boolean>) => {
    const deviceHash = await computeDeviceHash();
    const r = await request<GrantConsentResponse>('/consent', {
      method: 'POST',
      body: JSON.stringify({ email, scope, ...(deviceHash ? { deviceHash } : {}) }),
    });
    setToken(r.sessionToken);
    return r;
  },
  revokeConsent: async () => {
    await request<{ revoked: number }>('/consent/me', { method: 'DELETE' });
    setToken(null);
  },
  clearSession: () => {
    setToken(null);
  },
  ingest: (profileId: string) =>
    request<IngestResponse>('/ingest', {
      method: 'POST',
      body: JSON.stringify({ profileId }),
    }),
  decide: (snapshotId: string) =>
    request<DecisionResponse>('/decision', {
      method: 'POST',
      body: JSON.stringify({ snapshotId }),
    }),
  simulatePix: (decisionId: string) =>
    request<PixResponse>('/pix/simulate', {
      method: 'POST',
      body: JSON.stringify({ decisionId }),
    }),
};