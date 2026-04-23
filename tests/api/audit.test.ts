import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/api/app.js';
import { verifyChainIntegrity } from '../../src/api/audit.js';
import { prisma } from '../../src/api/db.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

async function grant(email: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/consent',
    payload: { email, scope: { openFinance: true } },
  });
  return (res.json() as { sessionToken: string }).sessionToken;
}

async function runFlow(email: string, profileId: string): Promise<string> {
  const token = await grant(email);
  const ingest = await app.inject({
    method: 'POST',
    url: '/ingest',
    headers: { authorization: `Bearer ${token}` },
    payload: { profileId },
  });
  const { snapshotId } = ingest.json() as { snapshotId: string };
  const decision = await app.inject({
    method: 'POST',
    url: '/decision',
    headers: { authorization: `Bearer ${token}` },
    payload: { snapshotId },
  });
  return (decision.json() as { rowHash: string; decisionId: string }).decisionId;
}

describe('audit hash chain', () => {
  it('produces a verifiable chain for a sequence of decisions', async () => {
    const id1 = await runFlow('chain1@test.com', 'aprovado-tipico');
    const id2 = await runFlow('chain2@test.com', 'negado-tipico');
    const id3 = await runFlow('chain3@test.com', 'aprovado-tipico');

    const integrity = await verifyChainIntegrity();
    expect(integrity.ok).toBe(true);

    const rows = await prisma.decisionLog.findMany({
      where: { id: { in: [id1, id2, id3] } },
      orderBy: { createdAt: 'asc' },
    });
    for (const r of rows) {
      expect(r.rowHash).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(rows[0]!.prevHash === null || typeof rows[0]!.prevHash === 'string').toBe(true);
    expect(rows[1]!.prevHash).toBe(rows[0]!.rowHash);
    expect(rows[2]!.prevHash).toBe(rows[1]!.rowHash);
  });

  it('detects tampering when a row field is altered', async () => {
    const decisionId = await runFlow('tamper@test.com', 'aprovado-tipico');
    await prisma.decisionLog.update({
      where: { id: decisionId },
      data: { score: 9999 },
    });
    const integrity = await verifyChainIntegrity();
    expect(integrity.ok).toBe(false);
    expect(integrity.brokenAt).toBe(decisionId);
  });
});