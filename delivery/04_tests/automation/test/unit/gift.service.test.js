const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { GiftService } = require('../../backend/dist/modules/gift/gift.service.js');

function createMockFn(impl = async () => undefined) {
  const fn = async (...args) => {
    fn.calls.push(args);
    return impl(...args);
  };
  fn.calls = [];
  return fn;
}

function makePrisma() {
  const tx = {
    dailyCoinClaim: { create: createMockFn(async () => undefined) },
    user: { update: createMockFn(async () => ({ id: 1, coinBalance: 12 })) },
    coinTransaction: { create: createMockFn(async () => undefined) },
    streakMilestoneClaim: { create: createMockFn(async () => undefined) },
  };
  return {
    tx,
    user: { findUniqueOrThrow: createMockFn(async () => ({ id: 1, coinBalance: 10 })) },
    coinTransaction: { aggregate: createMockFn(async () => ({ _sum: { amount: 4 } })) },
    dailyCoinClaim: {
      findUnique: createMockFn(async () => null),
      findMany: createMockFn(async () => []),
    },
    streakMilestoneClaim: { findMany: createMockFn(async () => []) },
    $transaction: createMockFn(async (callback) => callback(tx)),
  };
}

describe('GiftService wallet and daily claim', () => {
  it('returns wallet balance, totals and daily claim status', async () => {
    const prisma = makePrisma();
    const service = new GiftService(prisma);

    const wallet = await service.getWallet(1);

    assert.equal(wallet.balance, 10);
    assert.equal(wallet.totalClaimed, 4);
    assert.equal(wallet.totalSpent, 4);
    assert.equal(wallet.claimedToday, false);
    assert.equal(wallet.todayClaimAmount, 2);
  });

  it('claims daily coins in a transaction and records balance after', async () => {
    const prisma = makePrisma();
    const service = new GiftService(prisma);

    const result = await service.claimDaily(1);

    assert.deepEqual(result, { claimed: true, amount: 2, balance: 12, claimedToday: true });
    assert.equal(prisma.tx.dailyCoinClaim.create.calls[0][0].data.amount, 2);
    assert.equal(prisma.tx.coinTransaction.create.calls[0][0].data.balanceAfter, 12);
  });
});

describe('GiftService streak and milestone rules', () => {
  it('calculates continuous streak from claim dates', () => {
    const service = new GiftService(makePrisma());
    const today = service.getTodayClaimDate();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    assert.equal(service.calculateStreak([{ claimDate: today }, { claimDate: yesterday }, { claimDate: twoDaysAgo }]), 3);

    const oldDate = new Date(today);
    oldDate.setDate(today.getDate() - 3);
    assert.equal(service.calculateStreak([{ claimDate: oldDate }]), 0);
  });

  it('returns milestone nodes and rejects invalid milestone rewards', async () => {
    const service = new GiftService(makePrisma());

    assert.deepEqual(service.getMilestoneNodes(3), [3, 7, 14, 30]);
    assert.deepEqual(service.getMilestoneNodes(31), [60, 90, 120, 150]);
    const result = await service.claimMilestoneReward(1, 5);
    assert.equal(result.claimed, false);
    assert.equal(typeof result.message, 'string');
  });
});
