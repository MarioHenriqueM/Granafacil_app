import { execSync } from 'node:child_process';

export default function globalSetup(): void {
  const databaseUrl =
    process.env['TEST_DATABASE_URL'] ??
    'postgresql://granafacil:granafacil_dev@localhost:5433/granafacil_test?schema=public';

  process.env['DATABASE_URL'] = databaseUrl;

  execSync('npx prisma db push --force-reset --skip-generate --accept-data-loss', {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'sim',
    },
    stdio: 'pipe',
  });
}
