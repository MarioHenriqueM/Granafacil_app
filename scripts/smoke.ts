const base = process.env['SMOKE_BASE_URL'] ?? 'http://localhost:3000';

type Ok<T> = { ok: true; data: T };
type Fail = { ok: false; status: number; body: unknown };

async function http<T>(path: string, init: RequestInit, token?: string): Promise<Ok<T> | Fail> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, body };
  return { ok: true, data: body as T };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`[smoke] ${msg}`);
}

async function main(): Promise<void> {
  console.log(`[smoke] base=${base}`);

  const health = await fetch(`${base}/health`).then((r) => r.json());
  assert((health as { status: string }).status === 'ok', 'health failed');
  console.log('[smoke] ✓ /health');

  const consent = await http<{ sessionToken: string; userId: string }>('/consent', {
    method: 'POST',
    body: JSON.stringify({
      email: `smoke+${Date.now()}@test.com`,
      scope: { openFinance: true },
    }),
  });
  assert(consent.ok, 'consent grant failed');
  console.log('[smoke] ✓ POST /consent');

  const token = consent.data.sessionToken;

  const ingest = await http<{ snapshotId: string }>(
    '/ingest',
    { method: 'POST', body: JSON.stringify({ profileId: 'aprovado-tipico' }) },
    token,
  );
  assert(ingest.ok, 'ingest failed');
  console.log('[smoke] ✓ POST /ingest');

  const decision = await http<{ decisionId: string; approved: boolean; score: number }>(
    '/decision',
    { method: 'POST', body: JSON.stringify({ snapshotId: ingest.data.snapshotId }) },
    token,
  );
  assert(decision.ok, 'decision failed');
  assert(decision.data.approved, 'expected approval for aprovado-tipico');
  console.log(`[smoke] ✓ POST /decision (score=${decision.data.score})`);

  const pix = await http<{ status: string }>(
    '/pix/simulate',
    { method: 'POST', body: JSON.stringify({ decisionId: decision.data.decisionId }) },
    token,
  );
  assert(pix.ok && pix.data.status === 'SIMULADO', 'pix failed');
  console.log('[smoke] ✓ POST /pix/simulate');

  console.log('[smoke] all checks passed');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
