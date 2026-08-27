const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { BadRequestException, ForbiddenException, NotFoundException } = require('@nestjs/common');

const { LiveService } = require('../../backend/dist/modules/live/live.service.js');

function createMockFn(impl = async () => undefined) {
  const fn = async (...args) => {
    fn.calls.push(args);
    return impl(...args);
  };
  fn.calls = [];
  return fn;
}

function makeService(assetOverrides = {}) {
  const prisma = {
    user: { findMany: createMockFn(async () => [{ id: 1, avatarUrl: '/avatar.png' }]) },
    followRelation: { findMany: createMockFn(async () => [{ followingId: 1 }]) },
    videoAsset: {
      findUnique: createMockFn(async ({ where }) => ({
        id: where.id ?? 9,
        objectKey: where.objectKey ?? 'recording.webm',
        url: '/recording.webm',
        mimeType: 'video/webm',
        ...assetOverrides,
      })),
    },
  };
  const videoService = { createVideo: createMockFn(async () => ({ id: 100 })) };
  return { service: new LiveService(prisma, videoService), prisma, videoService };
}

describe('LiveService room lifecycle and interaction', () => {
  it('creates, starts, lists and stops a live room', () => {
    const { service } = makeService();
    const user = { id: 1, nickname: 'Anchor' };
    const room = service.createRoom(user, { title: 'Study Live', category: 'study' });

    assert.equal(room.status, 'IDLE');
    assert.match(room.rtmpUrl, /room-1-/);
    assert.deepEqual(service.startRoom(room.id, user), { roomId: room.id, sessionId: room.id, status: 'LIVING' });
    assert.equal(service.listRooms({ status: 'LIVING' }).length, 1);
    assert.deepEqual(service.stopRoom(room.id, user), { roomId: room.id, sessionId: room.id, status: 'ENDED' });
  });

  it('blocks non-owner operations and non-live viewer creation', () => {
    const { service } = makeService();
    const room = service.createRoom({ id: 1, nickname: 'Anchor' }, { title: 'Room' });

    assert.throws(() => service.startRoom(room.id, { id: 2 }), ForbiddenException);
    assert.throws(() => service.createViewer(room.id), ForbiddenException);
    assert.throws(() => service.getRoom(999), NotFoundException);
  });

  it('creates viewers, messages and trims long chat content', () => {
    const { service } = makeService();
    const user = { id: 1, nickname: 'Anchor' };
    const room = service.createRoom(user, { title: 'Room' });
    service.startRoom(room.id, user);

    const viewer = service.createViewer(room.id);
    const message = service.createMessage(room.id, { id: 2, nickname: 'Viewer' }, { content: ` ${'x'.repeat(250)} ` });

    assert.equal(viewer.viewerId, 1);
    assert.equal(message.content.length, 200);
    assert.throws(() => service.createMessage(room.id, { id: 2, nickname: 'Viewer' }, { content: '   ' }), BadRequestException);
    assert.deepEqual(service.removeViewer(room.id, viewer.viewerId), { roomId: room.id, viewerId: viewer.viewerId, removed: true });
  });

  it('saves replay as draft video when requested', async () => {
    const { service, videoService } = makeService();
    const user = { id: 1, nickname: 'Anchor' };
    const room = service.createRoom(user, { title: 'Room', category: 'tech' });

    const result = await service.saveReplay(room.id, user, {
      assetId: 9,
      saveMode: 'UPLOAD',
      title: 'Replay',
    });

    assert.equal(result.replayVideoId, 100);
    assert.equal(result.replayUrl, '/recording.webm');
    assert.equal(videoService.createVideo.calls[0][1].assetId, 9);
    assert.equal(videoService.createVideo.calls[0][1].category, 'tech');
  });

  it('rejects non-video replay assets before room mutation or draft creation', async () => {
    const { service, videoService } = makeService({ mimeType: 'text/plain', url: '/recording.webm' });
    const user = { id: 1, nickname: 'Anchor' };
    const room = service.createRoom(user, { title: 'Room', category: 'tech' });

    await assert.rejects(
      service.saveReplay(room.id, user, { assetId: 9, saveMode: 'UPLOAD', title: 'Replay' }),
      BadRequestException,
    );

    assert.equal(service.getRoom(room.id).replayUrl, null);
    assert.equal(videoService.createVideo.calls.length, 0);
  });

  it('accepts an MP4 replay asset', async () => {
    const { service } = makeService({ mimeType: 'video/mp4', url: '/recording.mp4' });
    const user = { id: 1, nickname: 'Anchor' };
    const room = service.createRoom(user, { title: 'Room' });

    const result = await service.saveReplay(room.id, user, { assetId: 9, saveMode: 'REPLAY' });

    assert.equal(result.replayUrl, '/recording.mp4');
  });
});
