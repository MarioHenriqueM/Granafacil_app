import { resolve } from 'node:path';

const testDb = resolve(process.cwd(), 'prisma', 'test.db');
process.env['DATABASE_URL'] = `file:${testDb}`;
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';
