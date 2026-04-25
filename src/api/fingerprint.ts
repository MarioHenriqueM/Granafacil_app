import { createHash } from 'node:crypto';
import antifraudJson from '../../config/antifraud.json';
import type { AntifraudConfig } from '../logic/types.js';
import { prisma } from './db.js';

const antifraud = antifraudJson as unknown as AntifraudConfig;

function getSalt(): string {
  return process.env['FRAUD_SALT'] ?? 'dev-fraud-salt-change-me';
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(`${ip}:${getSalt()}`).digest('hex');
}

export interface FingerprintContext {
  userId: string;
  ip: string;
  deviceHash?: string;
  userAgent?: string;
}

export type FingerprintGateResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'device_limit_exceeded' | 'ip_limit_exceeded';
      distinctUsers: number;
      limit: number;
    };

export async function checkAndRegisterFingerprint(
  ctx: FingerprintContext,
): Promise<FingerprintGateResult> {
  const ipHash = hashIp(ctx.ip);
  const lookbackMs = antifraud.deviceFingerprint.lookbackDays * 24 * 60 * 60 * 1000;
  const since = new Date(Date.now() - lookbackMs);

  if (ctx.deviceHash) {
    const rows = await prisma.deviceFingerprint.findMany({
      where: { deviceHash: ctx.deviceHash, lastSeenAt: { gte: since } },
      select: { userId: true },
      distinct: ['userId'],
    });
    const users = new Set(rows.map((r) => r.userId));
    users.add(ctx.userId);
    const limit = antifraud.deviceFingerprint.maxUsersPerDevice;
    if (users.size > limit) {
      return { ok: false, reason: 'device_limit_exceeded', distinctUsers: users.size, limit };
    }
  }

  const ipRows = await prisma.deviceFingerprint.findMany({
    where: { ipHash, lastSeenAt: { gte: since } },
    select: { userId: true },
    distinct: ['userId'],
  });
  const ipUsers = new Set(ipRows.map((r) => r.userId));
  ipUsers.add(ctx.userId);
  const ipLimit = antifraud.deviceFingerprint.maxUsersPerIp;
  if (ipUsers.size > ipLimit) {
    return { ok: false, reason: 'ip_limit_exceeded', distinctUsers: ipUsers.size, limit: ipLimit };
  }

  await prisma.deviceFingerprint.create({
    data: {
      userId: ctx.userId,
      ipHash,
      deviceHash: ctx.deviceHash ?? null,
      userAgent: ctx.userAgent ?? null,
    },
  });
  return { ok: true };
}
