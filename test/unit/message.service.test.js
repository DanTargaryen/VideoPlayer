const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { BadRequestException, NotFoundException } = require('@nestjs/common');

const { MessageService } = require('../../backend/dist/modules/message/message.service.js');

function createMockFn(impl = async () => undefined) {
  const fn = async (...args) => {
    fn.calls.push(args);
    return impl(...args);
  };
  fn.calls = [];
  fn.setImpl = (nextImpl) => {
    impl = nextImpl;
  };
  return fn;
}

function makeService() {
  const prisma = {
    user: { findUnique: createMockFn(async () => ({ id: 2, messagePrivacy: 'ALLOW_ALL' })) },
    directMessage: {
      create: createMockFn(async ({ data }) => ({ id: 1, ...data })),
      count: createMockFn(async () => 3),
      updateMany: createMockFn(async () => ({ count: 2 })),
    },
  };
  const followService = {
    isFollowing: createMockFn(async () => false),
  };
  return { service: new MessageService(prisma, followService), prisma, followService };
}

describe('MessageService send permission', () => {
  it('blocks sending messages to self', async () => {
    const { service } = makeService();

    const permission = await service.resolveSendPermission(1, 1, 'ALLOW_ALL');

    assert.equal(permission.canSend, false);
    assert.equal(permission.senderFollowsRecipient, false);
    assert.equal(permission.recipientFollowsSender, false);
    assert.equal(permission.messagePrivacy, 'ALLOW_ALL');
  });

  it('blocks disabled privacy and following-only privacy when recipient does not follow sender', async () => {
    const { service } = makeService();

    assert.equal((await service.resolveSendPermission(1, 2, 'DISABLED')).canSend, false);
    assert.equal((await service.resolveSendPermission(1, 2, 'FOLLOWING_ONLY')).canSend, false);
  });

  it('allows following-only privacy when recipient follows sender', async () => {
    const { service, followService } = makeService();
    followService.isFollowing.setImpl(async (targetUserId, currentUserId) => targetUserId === 1 && currentUserId === 2);

    const permission = await service.resolveSendPermission(1, 2, 'FOLLOWING_ONLY');

    assert.equal(permission.canSend, true);
    assert.equal(permission.recipientFollowsSender, true);
  });
});

describe('MessageService message operations', () => {
  it('rejects blank and overlong message content', async () => {
    const { service } = makeService();

    await assert.rejects(service.sendMessage({ id: 1 }, 2, '   '), (error) => error instanceof BadRequestException);
    await assert.rejects(service.sendMessage({ id: 1 }, 2, 'x'.repeat(1001)), (error) => error instanceof BadRequestException);
  });

  it('throws NotFoundException when target user does not exist', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.setImpl(async () => null);

    await assert.rejects(service.sendMessage({ id: 1 }, 99, 'hello'), (error) => error instanceof NotFoundException);
  });

  it('trims content before creating a direct message and reports unread count updates', async () => {
    const { service, prisma } = makeService();

    const result = await service.sendMessage({ id: 1 }, 2, ' hello ');
    const unread = await service.getUnreadCount(2);
    const marked = await service.markAllAsRead(2);

    assert.equal(prisma.directMessage.create.calls[0][0].data.content, 'hello');
    assert.equal(result.message.content, 'hello');
    assert.deepEqual(unread, { unreadCount: 3 });
    assert.deepEqual(marked, { success: true, updatedCount: 2 });
  });
});
