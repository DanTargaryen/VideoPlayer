import { PrismaClient } from '../generated/index.js';

const databaseUrl = process.env.LIVE_REWARD_DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('LIVE_REWARD_DATABASE_URL is required for live-reward seed');

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const userId = Number(process.env.LIVE_REWARD_FIXTURE_USER_ID ?? 1);

try {
  await prisma.coinAccount.upsert({ where: { userId }, create: { userId, balance: 10 }, update: {} });
  console.log(JSON.stringify({ service: 'live-reward', fixture: true, userId }));
} finally {
  await prisma.$disconnect();
}
