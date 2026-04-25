import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import antifraudJson from '../../config/antifraud.json';
import limitsJson from '../../config/limits.json';
import presetsJson from '../../config/risk-presets.json';
import weightsJson from '../../data/weights.json';
import { decide, type LimitsConfig } from '../logic/decide.js';
import { explainScore } from '../logic/explain.js';
import type { AntifraudConfig, Profile, RiskPreset, Weights } from '../logic/types.js';
import { appendDecisionWithChain } from './audit.js';
import { requireAuth } from './auth.js';
import { hasActiveConsent } from './consent.js';
import { prisma } from './db.js';
import { decisionSchema } from './schemas.js';

const weights = weightsJson as unknown as Weights;
const limits = limitsJson as unknown as LimitsConfig;
const presets = presetsJson.presets as Record<string, RiskPreset>;
const activePreset = presets[presetsJson.activePreset];
const antifraud = antifraudJson as unknown as AntifraudConfig;

if (!activePreset) {
  throw new Error(`Active preset "${presetsJson.activePreset}" not found in risk-presets.json`);
}

export const decisionRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: z.treeifyError(parsed.error) });
    }
    const { snapshotId } = parsed.data;
    const { userId } = req.auth!;

    if (!(await hasActiveConsent(userId))) {
      return reply.code(403).send({ error: 'CONSENT_MISSING' });
    }

    const snapshot = await prisma.snapshot.findUnique({ where: { id: snapshotId } });
    if (!snapshot || snapshot.userId !== userId) {
      return reply.code(404).send({ error: 'snapshot not found' });
    }

    const profile = JSON.parse(snapshot.payload) as Profile;
    const result = decide(profile, weights, activePreset, limits, antifraud.circularity);
    const explanation = explainScore(result.scoreResult, {
      approved: result.approved,
      limit: result.creditLimit,
      denialReason: result.denialReason,
    });

    const audit = await appendDecisionWithChain({
      userId,
      snapshotId,
      profileId: snapshot.profileId,
      score: result.score,
      approved: result.approved,
      creditLimit: result.creditLimit ?? null,
      denialReason: result.denialReason ?? null,
      explanation,
    });

    req.log.info({
      event: 'decision.created',
      userId,
      decisionId: audit.id,
      score: result.score,
      approved: result.approved,
      denialReason: result.denialReason,
      rowHash: audit.rowHash,
    });

    return reply.code(201).send({
      decisionId: audit.id,
      score: result.score,
      approved: result.approved,
      creditLimit: result.creditLimit,
      denialReason: result.denialReason,
      explanation,
      rowHash: audit.rowHash,
    });
  });
};