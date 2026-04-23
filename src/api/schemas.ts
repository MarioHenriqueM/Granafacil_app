import { z } from 'zod';

export const grantConsentSchema = z.object({
  email: z.string().email().max(254),
  scope: z.record(z.string(), z.boolean()),
});

export const ingestSchema = z.object({
  profileId: z.string().min(1).max(64),
});

export const decisionSchema = z.object({
  snapshotId: z.string().min(1).max(64),
});

export const pixSchema = z.object({
  decisionId: z.string().min(1).max(64),
});

export type GrantConsentInput = z.infer<typeof grantConsentSchema>;
export type IngestInput = z.infer<typeof ingestSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
export type PixInput = z.infer<typeof pixSchema>;