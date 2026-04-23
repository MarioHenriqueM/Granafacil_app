import { prisma } from './db.js';
import { sha256 } from './hash.js';

export interface DecisionRowInput {
  userId: string;
  snapshotId: string;
  profileId: string;
  score: number;
  approved: boolean;
  creditLimit: number | null;
  denialReason: string | null;
  explanation: string;
}

function canonical(row: DecisionRowInput, prevHash: string | null, createdAt: Date): string {
  return [
    prevHash ?? '',
    row.userId,
    row.snapshotId,
    row.profileId,
    String(row.score),
    String(row.approved),
    row.creditLimit === null ? '' : row.creditLimit.toFixed(2),
    row.denialReason ?? '',
    row.explanation,
    createdAt.toISOString(),
  ].join('|');
}

export async function appendDecisionWithChain(row: DecisionRowInput): Promise<{
  id: string;
  prevHash: string | null;
  rowHash: string;
  createdAt: Date;
}> {
  const last = await prisma.decisionLog.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { rowHash: true },
  });
  const prevHash = last?.rowHash ?? null;
  const createdAt = new Date();
  const rowHash = sha256(canonical(row, prevHash, createdAt));

  const created = await prisma.decisionLog.create({
    data: { ...row, prevHash, rowHash, createdAt },
  });
  return { id: created.id, prevHash, rowHash, createdAt };
}

export async function verifyChainIntegrity(): Promise<{ ok: boolean; brokenAt?: string }> {
  const rows = await prisma.decisionLog.findMany({ orderBy: { createdAt: 'asc' } });
  let prev: string | null = null;
  for (const r of rows) {
    const expected = sha256(
      canonical(
        {
          userId: r.userId,
          snapshotId: r.snapshotId,
          profileId: r.profileId,
          score: r.score,
          approved: r.approved,
          creditLimit: r.creditLimit,
          denialReason: r.denialReason,
          explanation: r.explanation,
        },
        prev,
        r.createdAt,
      ),
    );
    if (r.prevHash !== prev || r.rowHash !== expected) {
      return { ok: false, brokenAt: r.id };
    }
    prev = r.rowHash;
  }
  return { ok: true };
}