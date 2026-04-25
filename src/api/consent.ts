import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createSession, requireAuth } from './auth.js';
import { prisma } from './db.js';
import { checkAndRegisterFingerprint } from './fingerprint.js';
import { grantConsentSchema } from './schemas.js';

export const consentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', async (req, reply) => {
    const parsed = grantConsentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: z.treeifyError(parsed.error) });
    }
    const { email, scope, deviceHash } = parsed.data;

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const fpResult = await checkAndRegisterFingerprint({
      userId: user.id,
      ip: req.ip,
      deviceHash,
      userAgent: req.headers['user-agent'],
    });
    if (!fpResult.ok) {
      req.log.warn({
        event: 'fraud.fingerprint_blocked',
        reason: fpResult.reason,
        distinctUsers: fpResult.distinctUsers,
        limit: fpResult.limit,
      });
      return reply.code(429).send({
        error: fpResult.reason,
        distinctUsers: fpResult.distinctUsers,
        limit: fpResult.limit,
      });
    }

    const consent = await prisma.consent.create({
      data: { userId: user.id, scope: JSON.stringify(scope) },
    });
    const session = await createSession(user.id);

    req.log.info({ event: 'consent.granted', userId: user.id, consentId: consent.id });
    return reply.code(201).send({
      userId: user.id,
      consentId: consent.id,
      sessionToken: session.token,
      expiresAt: session.expiresAt.toISOString(),
    });
  });

  app.get('/me', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = req.auth!;
    const consents = await prisma.consent.findMany({
      where: { userId, revokedAt: null },
      orderBy: { grantedAt: 'desc' },
    });
    return reply.send({
      userId,
      active: consents.length > 0,
      consents: consents.map((c) => ({
        id: c.id,
        grantedAt: c.grantedAt,
        scope: JSON.parse(c.scope) as Record<string, boolean>,
        legalBasis: c.legalBasis,
      })),
    });
  });

  app.delete('/me', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = req.auth!;
    const { count } = await prisma.consent.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    req.log.info({ event: 'consent.revoked', userId, count });
    return reply.send({ revoked: count });
  });
};

export async function hasActiveConsent(userId: string): Promise<boolean> {
  const consent = await prisma.consent.findFirst({
    where: { userId, revokedAt: null },
    select: { id: true },
  });
  return consent !== null;
}
