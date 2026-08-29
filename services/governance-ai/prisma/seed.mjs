import { PrismaClient } from '../generated/client/index.js';

const prisma = new PrismaClient();

try {
  await prisma.moderationDecision.upsert({
    where: { requestId: 'fixture:governance:review:1' },
    update: {},
    create: {
      decisionId: 'fixture-governance-decision-1',
      requestId: 'fixture:governance:review:1',
      targetType: 'VIDEO',
      targetId: '1001',
      videoId: '1001',
      applyStatus: 'PENDING',
    },
  });
} finally {
  await prisma.$disconnect();
}
