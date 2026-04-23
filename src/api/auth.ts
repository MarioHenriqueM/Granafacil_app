import { randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from './db.js';
import { sha256 } from './hash.js';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthContext {
  userId: string;
  sessionId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { userId, tokenHash, expiresAt } });
  return { token, expiresAt };
}

function extractBearer(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = extractBearer(req);
  if (!token) {
    reply.code(401).send({ error: 'missing_bearer_token' });
    return;
  }
  const tokenHash = sha256(token);
  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session || session.revokedAt !== null || session.expiresAt < new Date()) {
    reply.code(401).send({ error: 'invalid_or_expired_token' });
    return;
  }
  req.auth = { userId: session.userId, sessionId: session.id };
}