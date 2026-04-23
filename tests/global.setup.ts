import { execSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

export default function globalSetup(): void {
  const testDb = resolve(process.cwd(), 'prisma', 'test.db');
  if (existsSync(testDb)) unlinkSync(testDb);
  const journal = `${testDb}-journal`;
  if (existsSync(journal)) unlinkSync(journal);

  process.env['DATABASE_URL'] = `file:${testDb}`;

  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: `file:${testDb}` },
    stdio: 'pipe',
  });
}
