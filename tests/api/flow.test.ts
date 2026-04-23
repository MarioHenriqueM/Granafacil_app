import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/api/app.js';
import { prisma } from '../../src/api/db.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

async function grant(email: string, scope: Record<string, boolean> = { openFinance: true }) {
  const res = await app.inject({
    method: 'POST',
    url: '/consent',
    payload: { email, scope },
  });
  expect(res.statusCode).toBe(201);
  return res.json() as { userId: string; consentId: string; sessionToken: string };
}

function authHeader(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

describe('end-to-end flow: consent → ingest → decision → pix', () => {
  it('approves a strong profile and simulates Pix', async () => {
    const { sessionToken } = await grant('strong@test.com', { openFinance: true, transactional: true });

    const ingest = await app.inject({
      method: 'POST',
      url: '/ingest',
      headers: authHeader(sessionToken),
      payload: { profileId: 'aprovado-tipico' },
    });
    expect(ingest.statusCode).toBe(201);
    const { snapshotId, hash } = ingest.json() as { snapshotId: string; hash: string };
    expect(hash).toMatch(/^[a-f0-9]{64}$/);

    const decision = await app.inject({
      method: 'POST',
      url: '/decision',
      headers: authHeader(sessionToken),
      payload: { snapshotId },
    });
    expect(decision.statusCode).toBe(201);
    const body = decision.json() as {
      decisionId: string;
      score: number;
      approved: boolean;
      creditLimit?: number;
      explanation: string;
      rowHash: string;
    };
    expect(body.approved).toBe(true);
    expect(body.creditLimit).toBeGreaterThan(0);
    expect(body.rowHash).toMatch(/^[a-f0-9]{64}$/);

    const pix = await app.inject({
      method: 'POST',
      url: '/pix/simulate',
      headers: authHeader(sessionToken),
      payload: { decisionId: body.decisionId },
    });
    expect(pix.statusCode).toBe(200);
    const pixBody = pix.json() as { status: string; txid: string };
    expect(pixBody.status).toBe('SIMULADO');
    expect(pixBody.txid).toMatch(/^[a-f0-9]{32}$/);
  });

  it('denies the negado-tipico profile and blocks Pix simulation', async () => {
    const { sessionToken } = await grant('weak@test.com');
    const ingest = await app.inject({
      method: 'POST',
      url: '/ingest',
      headers: authHeader(sessionToken),
      payload: { profileId: 'negado-tipico' },
    });
    const { snapshotId } = ingest.json() as { snapshotId: string };

    const decision = await app.inject({
      method: 'POST',
      url: '/decision',
      headers: authHeader(sessionToken),
      payload: { snapshotId },
    });
    const body = decision.json() as { approved: boolean; decisionId: string };
    expect(body.approved).toBe(false);

    const pix = await app.inject({
      method: 'POST',
      url: '/pix/simulate',
      headers: authHeader(sessionToken),
      payload: { decisionId: body.decisionId },
    });
    expect(pix.statusCode).toBe(409);
  });

  it('rejects requests without Bearer token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ingest',
      payload: { profileId: 'aprovado-tipico' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid/expired tokens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ingest',
      headers: authHeader('deadbeef'.repeat(8)),
      payload: { profileId: 'aprovado-tipico' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('revocation invalidates session and blocks ingest', async () => {
    const { sessionToken } = await grant('revoked@test.com');
    const revoke = await app.inject({
      method: 'DELETE',
      url: '/consent/me',
      headers: authHeader(sessionToken),
    });
    expect(revoke.statusCode).toBe(200);

    const ingest = await app.inject({
      method: 'POST',
      url: '/ingest',
      headers: authHeader(sessionToken),
      payload: { profileId: 'aprovado-tipico' },
    });
    expect(ingest.statusCode).toBe(401);
  });

  it('rejects invalid profileIds (path traversal safe)', async () => {
    const { sessionToken } = await grant('pathtraversal@test.com');
    const ingest = await app.inject({
      method: 'POST',
      url: '/ingest',
      headers: authHeader(sessionToken),
      payload: { profileId: '../../../etc/passwd' },
    });
    expect(ingest.statusCode).toBe(400);
  });

  it('returns 404 for unknown profileId', async () => {
    const { sessionToken } = await grant('unknown@test.com');
    const ingest = await app.inject({
      method: 'POST',
      url: '/ingest',
      headers: authHeader(sessionToken),
      payload: { profileId: 'nonexistent' },
    });
    expect(ingest.statusCode).toBe(404);
  });

  it('health endpoint returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('rejects consent with invalid email via zod', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/consent',
      payload: { email: 'not-an-email', scope: {} },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe('invalid_body');
  });
});