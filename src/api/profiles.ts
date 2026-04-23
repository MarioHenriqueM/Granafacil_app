import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Profile } from '../logic/types.js';

const PROFILE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export class ProfileNotFoundError extends Error {
  override readonly name = 'ProfileNotFoundError';
}

export class InvalidProfileIdError extends Error {
  override readonly name = 'InvalidProfileIdError';
}

export async function loadProfile(profileId: string): Promise<Profile> {
  if (!PROFILE_ID_PATTERN.test(profileId)) {
    throw new InvalidProfileIdError(`Invalid profileId: ${profileId}`);
  }
  const filePath = resolve(process.cwd(), 'data', 'profiles', `${profileId}.json`);
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch {
    throw new ProfileNotFoundError(`Profile not found: ${profileId}`);
  }
  return JSON.parse(raw) as Profile;
}
