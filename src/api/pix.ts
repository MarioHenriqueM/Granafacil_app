import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from './auth.js';
import { prisma } from './db.js';
import { pixSchema } from './schemas.js';

export const pixRoutes: FastifyPluginAsync = async (app) => {
  app.post('/simulate', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = pixSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: z.treeifyError(parsed.error) });
    }
    const { decisionId } = parsed.data;
    const { userId } = req.auth!;

    const decision = await prisma.decisionLog.findUnique({ where: { id: decisionId } });
    if (!decision || decision.userId !== userId) {
      return reply.code(404).send({ error: 'decision not found' });
    }

    if (!decision.approved || decision.creditLimit === null) {
      return reply.code(409).send({ error: 'decision not approved; no Pix trigger' });
    }

    const payload = {
      txid: randomUUID().replace(/-/g, ''),
      valor: decision.creditLimit.toFixed(2),
      status: 'SIMULADO',
      chave: `user:${decision.userId}`,
      decisionId: decision.id,
      criadoEm: new Date().toISOString(),
      disclaimer:
        'Simulação — integração real requer parceria PSP autorizado BACEN (ver REQUIREMENTS §7.1).',
    };

    req.log.info({ event: 'pix.simulated', userId: decision.userId, decisionId, txid: payload.txid });

    return reply.code(200).send(payload);
  });
};