import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { consentRoutes } from './consent.js';
import { decisionRoutes } from './decision.js';
import { ingestRoutes } from './ingest.js';
import { pixRoutes } from './pix.js';

export interface AppOptions {
  logger?: boolean | object;
}

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const defaultLogger = {
    level: process.env['LOG_LEVEL'] ?? 'info',
  };
  const isTest = process.env['NODE_ENV'] === 'test';
  const app = Fastify({
    logger: options.logger ?? defaultLogger,
    disableRequestLogging: isTest,
  });

  await app.register(rateLimit, {
    max: isTest ? 1000 : 100,
    timeWindow: '1 minute',
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(consentRoutes, { prefix: '/consent' });
  await app.register(ingestRoutes, { prefix: '/ingest' });
  await app.register(decisionRoutes, { prefix: '/decision' });
  await app.register(pixRoutes, { prefix: '/pix' });

  return app;
}