import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/api/app.js';
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

async function grant(opts: {
  email: string;
  deviceHash?: string;
  remoteAddress?: string;
  userAgent?: string;
}) {
  return app.inject({
    method: 'POST',
    url: '/consent',
    remoteAddress: opts.remoteAddress ?? '127.0.0.1',
    headers: opts.userAgent ? { 'user-agent': opts.userAgent } : undefined,
    payload: {
      email: opts.email,
      scope: { openFinance: true },
      ...(opts.deviceHash ? { deviceHash: opts.deviceHash } : {}),
    },
  });
}

describe('fraud gate — device fingerprinting', () => {
  const DEVICE = 'abc123deadbeefcafebabe1122334455';

  it('allows up to 3 distinct users on the same device, blocks the 4th', async () => {
    const r1 = await grant({ email: 'dev-a@test.com', deviceHash: DEVICE });
    const r2 = await grant({ email: 'dev-b@test.com', deviceHash: DEVICE });
    const r3 = await grant({ email: 'dev-c@test.com', deviceHash: DEVICE });
    expect(r1.statusCode).toBe(201);
    expect(r2.statusCode).toBe(201);
    expect(r3.statusCode).toBe(201);

    const blocked = await grant({ email: 'dev-d@test.com', deviceHash: DEVICE });
    expect(blocked.statusCode).toBe(429);
    const body = blocked.json() as { error: string; distinctUsers: number; limit: number };
    expect(body.error).toBe('device_limit_exceeded');
    expect(body.distinctUsers).toBe(4);
    expect(body.limit).toBe(3);
  });

  it('does not block when deviceHash differs even if IP and email pattern repeat', async () => {
    const r1 = await grant({ email: 'diff-a@test.com', deviceHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' });
    const r2 = await grant({ email: 'diff-b@test.com', deviceHash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' });
    expect(r1.statusCode).toBe(201);
    expect(r2.statusCode).toBe(201);
  });

  it('allows same user to reappear on the same device (upsert, not a new userId)', async () => {
    const dh = 'ccccccccccccccccccccccccccccccccccccccccc';
    const r1 = await grant({ email: 'loyal@test.com', deviceHash: dh });
    const r2 = await grant({ email: 'loyal@test.com', deviceHash: dh });
    const r3 = await grant({ email: 'loyal@test.com', deviceHash: dh });
    const r4 = await grant({ email: 'loyal@test.com', deviceHash: dh });
    expect([r1.statusCode, r2.statusCode, r3.statusCode, r4.statusCode]).toEqual([201, 201, 201, 201]);
  });
});

describe('fraud gate — IP limit', () => {
  const IP = '10.42.7.99';

  it('allows up to 20 distinct users on the same IP, blocks the 21st', async () => {
    for (let i = 0; i < 20; i++) {
      const r = await grant({ email: `ip-${i}@test.com`, remoteAddress: IP });
      expect(r.statusCode).toBe(201);
    }
    const blocked = await grant({ email: 'ip-21@test.com', remoteAddress: IP });
    expect(blocked.statusCode).toBe(429);
    const body = blocked.json() as { error: string; limit: number };
    expect(body.error).toBe('ip_limit_exceeded');
    expect(body.limit).toBe(20);
  });
});

describe('fraud gate — circularity end-to-end', () => {
  async function grantAndFlow(email: string, deviceHash: string): Promise<{
    decisionStatus: number;
    body: { approved: boolean; denialReason?: string; explanation: string };
  }> {
    const c = await grant({ email, deviceHash });
    const token = (c.json() as { sessionToken: string }).sessionToken;
    const ingest = await app.inject({
      method: 'POST',
      url: '/ingest',
      headers: { authorization: `Bearer ${token}` },
      payload: { profileId: 'fraude-circular' },
    });
    const { snapshotId } = ingest.json() as { snapshotId: string };
    const decision = await app.inject({
      method: 'POST',
      url: '/decision',
      headers: { authorization: `Bearer ${token}` },
      payload: { snapshotId },
    });
    return {
      decisionStatus: decision.statusCode,
      body: decision.json() as { approved: boolean; denialReason?: string; explanation: string },
    };
  }

  it('denies the fraude-circular profile with CIRCULARITY_SUSPECT', async () => {
    const { decisionStatus, body } = await grantAndFlow(
      'circ-1@test.com',
      'deadbeefdeadbeefdeadbeefdeadbeef',
    );
    expect(decisionStatus).toBe(201);
    expect(body.approved).toBe(false);
    expect(body.denialReason).toBe('CIRCULARITY_SUSPECT');
    expect(body.explanation).toMatch(/Antifraude:/);
  });
});
