const TOKEN_KEY = 'openscore.sessionToken';

function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
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
    const r = await request<GrantConsentResponse>('/consent', {
      method: 'POST',
      body: JSON.stringify({ email, scope }),
    });
    setToken(r.sessionToken);
    return r;
  },
  revokeConsent: async () => {
    await request<{ revoked: number }>('/consent/me', { method: 'DELETE' });
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