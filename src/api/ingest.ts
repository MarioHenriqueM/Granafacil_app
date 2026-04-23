import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from './auth.js';
import { hasActiveConsent } from './consent.js';
import { prisma } from './db.js';
import { sha256 } from './hash.js';
import { InvalidProfileIdError, loadProfile, ProfileNotFoundError } from './profiles.js';
import { ingestSchema } from './schemas.js';

export const ingestRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = ingestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: z.treeifyError(parsed.error) });
    }
    const { profileId } = parsed.data;
    const { userId } = req.auth!;

    if (!(await hasActiveConsent(userId))) {
      return reply.code(403).send({ error: 'CONSENT_MISSING' });
    }

    let profile;
    try {
      profile = await loadProfile(profileId);
    } catch (err) {
      if (err instanceof InvalidProfileIdError) {
        return reply.code(400).send({ error: 'invalid profileId' });
      }
      if (err instanceof ProfileNotFoundError) {
        return reply.code(404).send({ error: 'profile not found' });
      }
      throw err;
    }

    const payload = JSON.stringify(profile);
    const hash = sha256(payload);

    const snapshot = await prisma.snapshot.create({
      data: { userId, profileId, hash, payload },
    });

    req.log.info({ event: 'ingest.snapshot', userId, profileId, snapshotId: snapshot.id, hash });

    return reply.code(201).send({
      snapshotId: snapshot.id,
      hash,
      profile,
    });
  });
};