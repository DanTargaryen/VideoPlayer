import { randomUUID } from 'node:crypto';

import { PrismaClient } from '../generated/index.js';

export type RoomStatus = 'IDLE' | 'LIVING' | 'ENDED';
export type SessionStatus = 'LIVING' | 'ENDED';
export type SourceMode = 'camera' | 'screen';
export type MessageKind = 'CHAT' | 'SYSTEM';
export type ViewerEventType = 'JOIN' | 'LEAVE';
export type ReplayStatus = 'NONE' | 'PENDING' | 'REGISTERING' | 'COMPLETED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL';
export type TransactionType = 'DAILY_CLAIM' | 'VIDEO_COIN' | 'STREAK_REWARD' | 'LIVE_GIFT';

export interface RoomRecord {
  id: number;
  broadcasterId: number;
  title: string;
  category: string;
  coverUrl: string | null;
  sourceMode: SourceMode;
  streamKey: string;
  rtmpUrl: string;
  playUrl: string;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: number;
  roomId: number;
  status: SessionStatus;
  sourceMode: SourceMode;
  startedAt: Date;
  endedAt: Date | null;
  replayStatus: ReplayStatus;
}

export interface MessageRecord {
  id: number;
  sessionId: number;
  senderId: number | null;
  kind: MessageKind;
  content: string;
  createdAt: Date;
}

export interface ViewerEventRecord {
  id: number;
  sessionId: number;
  viewerId: string;
  eventType: ViewerEventType;
  createdAt: Date;
}

export interface ReplayRecord {
  id: number;
  sessionId: number;
  objectKey: string;
  contentVideoId: string | null;
  status: ReplayStatus;
  requestId: string;
  mimeType: string | null;
  attempts: number;
  lastError: string | null;
  nextRetryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionRecord {
  id: number;
  userId: number;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  videoId: number | null;
  requestId: string;
  createdAt: Date;
}

export interface Store {
  readonly persistent: boolean;
  close(): Promise<void>;
  ready(): Promise<boolean>;
  createRoom(input: Omit<RoomRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<RoomRecord>;
  listRooms(): Promise<RoomRecord[]>;
  getRoom(id: number): Promise<RoomRecord | null>;
  updateRoom(id: number, data: Partial<Pick<RoomRecord, 'status' | 'updatedAt'>>): Promise<RoomRecord>;
  createSession(input: Omit<SessionRecord, 'id'>): Promise<SessionRecord>;
  getLatestSession(roomId: number): Promise<SessionRecord | null>;
  getSession(id: number): Promise<SessionRecord | null>;
  updateSession(id: number, data: Partial<Pick<SessionRecord, 'status' | 'endedAt' | 'replayStatus'>>): Promise<SessionRecord>;
  addMessage(input: Omit<MessageRecord, 'id' | 'createdAt'>): Promise<MessageRecord>;
  listMessages(sessionId: number, limit: number): Promise<MessageRecord[]>;
  purgeMessages(before: Date): Promise<number>;
  addViewerEvent(input: Omit<ViewerEventRecord, 'id' | 'createdAt'>): Promise<ViewerEventRecord>;
  countViewers(sessionId: number): Promise<number>;
  listActiveViewers(sessionId: number): Promise<string[]>;
  createReplay(input: Omit<ReplayRecord, 'id' | 'createdAt' | 'updatedAt' | 'attempts' | 'lastError' | 'nextRetryAt'>): Promise<ReplayRecord>;
  getReplay(id: number): Promise<ReplayRecord | null>;
  getReplayBySession(sessionId: number): Promise<ReplayRecord | null>;
  getReplayByKey(objectKey: string): Promise<ReplayRecord | null>;
  updateReplay(id: number, data: Partial<Pick<ReplayRecord, 'status' | 'contentVideoId' | 'attempts' | 'lastError' | 'nextRetryAt'>>): Promise<ReplayRecord>;
  getBalance(userId: number): Promise<number>;
  listTransactions(userId: number): Promise<TransactionRecord[]>;
  claimDaily(userId: number, claimDate: Date, requestId: string): Promise<{ claimed: boolean; amount: number; balance: number }>;
  getDailyClaims(userId: number): Promise<Date[]>;
  getClaimedMilestones(userId: number): Promise<number[]>;
  claimMilestone(userId: number, milestone: number, requestId: string): Promise<{ claimed: boolean; amount: number; balance: number; message?: string }>;
  coinVideo(userId: number, videoId: number, amount: number, requestId: string): Promise<{ amount: number; balance: number; userVideoCoinCount: number }>;
  gift(userId: number, amount: number, requestId: string): Promise<{ amount: number; balance: number }>;
}

type MemoryRoom = RoomRecord & { sessions: SessionRecord[] };

export class MemoryStore implements Store {
  readonly persistent = false;
  private nextRoomId = 1;
  private nextSessionId = 1;
  private nextMessageId = 1;
  private nextViewerEventId = 1;
  private nextReplayId = 1;
  private nextTransactionId = 1;
  private readonly rooms = new Map<number, MemoryRoom>();
  private readonly sessions = new Map<number, SessionRecord>();
  private readonly messages: MessageRecord[] = [];
  private readonly chatCounts = new Map<number, number>();
  private readonly viewerEvents: ViewerEventRecord[] = [];
  private readonly replays = new Map<number, ReplayRecord>();
  private readonly balances = new Map<number, number>();
  private readonly transactions: TransactionRecord[] = [];
  private readonly dailyClaims = new Map<string, Date>();
  private readonly milestones = new Set<string>();
  private readonly contributions = new Map<string, number>();

  async close(): Promise<void> {}
  async ready(): Promise<boolean> { return true; }

  async createRoom(input: Omit<RoomRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<RoomRecord> {
    const now = new Date();
    const room: MemoryRoom = { ...input, id: this.nextRoomId++, createdAt: now, updatedAt: now, sessions: [] };
    this.rooms.set(room.id, room);
    return room;
  }
  async listRooms(): Promise<RoomRecord[]> { return Array.from(this.rooms.values()).map(toRoomRecord); }
  async getRoom(id: number): Promise<RoomRecord | null> {
    const room = this.rooms.get(id);
    if (!room) return null;
    return toRoomRecord(room);
  }
  async updateRoom(id: number, data: Partial<Pick<RoomRecord, 'status' | 'updatedAt'>>): Promise<RoomRecord> {
    const room = this.rooms.get(id);
    if (!room) throw new Error('Room not found');
    Object.assign(room, data, { updatedAt: data.updatedAt ?? new Date() });
    return toRoomRecord(room);
  }
  async createSession(input: Omit<SessionRecord, 'id'>): Promise<SessionRecord> {
    const session = { ...input, id: this.nextSessionId++ };
    this.sessions.set(session.id, session);
    const room = this.rooms.get(session.roomId);
    room?.sessions.push(session);
    return session;
  }
  async getLatestSession(roomId: number): Promise<SessionRecord | null> { return Array.from(this.sessions.values()).filter((session) => session.roomId === roomId).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0] ?? null; }
  async getSession(id: number): Promise<SessionRecord | null> { return this.sessions.get(id) ?? null; }
  async updateSession(id: number, data: Partial<Pick<SessionRecord, 'status' | 'endedAt' | 'replayStatus'>>): Promise<SessionRecord> {
    const session = this.sessions.get(id);
    if (!session) throw new Error('Session not found');
    Object.assign(session, data);
    return session;
  }
  async addMessage(input: Omit<MessageRecord, 'id' | 'createdAt'>): Promise<MessageRecord> {
    await this.purgeMessages(new Date(Date.now() - 7 * 86400000));
    const message = { ...input, id: this.nextMessageId++, createdAt: new Date() };
    this.messages.push(message);
    if (message.kind === 'CHAT') this.chatCounts.set(message.sessionId, (this.chatCounts.get(message.sessionId) ?? 0) + 1);
    this.trimMessages(input.sessionId);
    return message;
  }
  async listMessages(sessionId: number, limit: number): Promise<MessageRecord[]> {
    await this.purgeMessages(new Date(Date.now() - 7 * 86400000));
    return this.messages.filter((message) => message.sessionId === sessionId).slice(-limit);
  }
  async purgeMessages(before: Date): Promise<number> {
    const initial = this.messages.length;
    for (let index = this.messages.length - 1; index >= 0; index -= 1) {
      const message = this.messages[index]!;
      if (message.kind === 'CHAT' && message.createdAt < before) {
        this.messages.splice(index, 1);
        this.chatCounts.set(message.sessionId, Math.max(0, (this.chatCounts.get(message.sessionId) ?? 1) - 1));
      }
    }
    return initial - this.messages.length;
  }
  async addViewerEvent(input: Omit<ViewerEventRecord, 'id' | 'createdAt'>): Promise<ViewerEventRecord> {
    const event = { ...input, id: this.nextViewerEventId++, createdAt: new Date() };
    this.viewerEvents.push(event);
    return event;
  }
  async countViewers(sessionId: number): Promise<number> {
    return (await this.listActiveViewers(sessionId)).length;
  }
  async listActiveViewers(sessionId: number): Promise<string[]> {
    const active = new Set<string>();
    for (const event of this.viewerEvents.filter((item) => item.sessionId === sessionId)) {
      if (event.eventType === 'JOIN') active.add(event.viewerId); else active.delete(event.viewerId);
    }
    return Array.from(active);
  }
  async createReplay(input: Omit<ReplayRecord, 'id' | 'createdAt' | 'updatedAt' | 'attempts' | 'lastError' | 'nextRetryAt'>): Promise<ReplayRecord> {
    const existing = await this.getReplayBySession(input.sessionId) ?? await this.getReplayByKey(input.objectKey);
    if (existing) return existing;
    const now = new Date();
    const replay: ReplayRecord = { ...input, id: this.nextReplayId++, attempts: 0, lastError: null, nextRetryAt: null, createdAt: now, updatedAt: now };
    this.replays.set(replay.id, replay);
    return replay;
  }
  async getReplayBySession(sessionId: number): Promise<ReplayRecord | null> { return Array.from(this.replays.values()).find((item) => item.sessionId === sessionId) ?? null; }
  async getReplay(id: number): Promise<ReplayRecord | null> { return this.replays.get(id) ?? null; }
  async getReplayByKey(objectKey: string): Promise<ReplayRecord | null> { return Array.from(this.replays.values()).find((item) => item.objectKey === objectKey) ?? null; }
  async updateReplay(id: number, data: Partial<Pick<ReplayRecord, 'status' | 'contentVideoId' | 'attempts' | 'lastError' | 'nextRetryAt'>>): Promise<ReplayRecord> {
    const replay = this.replays.get(id);
    if (!replay) throw new Error('Replay not found');
    Object.assign(replay, data, { updatedAt: new Date() });
    return replay;
  }
  async getBalance(userId: number): Promise<number> { return this.balances.get(userId) ?? 10; }
  async listTransactions(userId: number): Promise<TransactionRecord[]> { return this.transactions.filter((item) => item.userId === userId); }
  async claimDaily(userId: number, claimDate: Date, requestId: string): Promise<{ claimed: boolean; amount: number; balance: number }> {
    const key = `${userId}:${claimDate.toISOString().slice(0, 10)}`;
    const existingTransaction = this.transactions.find((item) => item.requestId === requestId);
    if (existingTransaction) return { claimed: false, amount: 0, balance: existingTransaction.balanceAfter };
    if (this.dailyClaims.has(key)) return { claimed: false, amount: 0, balance: await this.getBalance(userId) };
    this.dailyClaims.set(key, claimDate);
    return this.credit(userId, 2, 'DAILY_CLAIM', null, requestId);
  }
  async getDailyClaims(userId: number): Promise<Date[]> { return Array.from(this.dailyClaims.entries()).filter(([key]) => key.startsWith(`${userId}:`)).map(([, date]) => date); }
  async getClaimedMilestones(userId: number): Promise<number[]> { return Array.from(this.milestones).filter((key) => key.startsWith(`${userId}:`)).map((key) => Number(key.split(':')[1])); }
  async claimMilestone(userId: number, milestone: number, requestId: string): Promise<{ claimed: boolean; amount: number; balance: number; message?: string }> {
    const existingTransaction = this.transactions.find((item) => item.requestId === requestId);
    if (existingTransaction) return { claimed: false, amount: 0, balance: existingTransaction.balanceAfter };
    const key = `${userId}:${milestone}`;
    if (this.milestones.has(key)) return { claimed: false, amount: 0, balance: await this.getBalance(userId), message: '该里程碑已领取' };
    this.milestones.add(key);
    return { ...(await this.credit(userId, 10, 'STREAK_REWARD', null, requestId)), claimed: true };
  }
  async coinVideo(userId: number, videoId: number, amount: number, requestId: string): Promise<{ amount: number; balance: number; userVideoCoinCount: number }> {
    const existingTransaction = this.transactions.find((item) => item.requestId === requestId);
    if (existingTransaction) return { amount: Math.abs(existingTransaction.amount), balance: existingTransaction.balanceAfter, userVideoCoinCount: this.contributions.get(`${videoId}:${userId}`) ?? 0 };
    const key = `${videoId}:${userId}`;
    const current = this.contributions.get(key) ?? 0;
    if (current + amount > 2) throw new Error('每个视频最多投币 2 个');
    const balance = await this.debit(userId, amount, 'VIDEO_COIN', videoId, requestId);
    this.contributions.set(key, current + amount);
    return { amount, balance, userVideoCoinCount: current + amount };
  }
  async gift(userId: number, amount: number, requestId: string): Promise<{ amount: number; balance: number }> {
    return { amount, balance: await this.debit(userId, amount, 'LIVE_GIFT', null, requestId) };
  }
  private credit(userId: number, amount: number, type: TransactionType, videoId: number | null, requestId: string) {
    const balance = (this.balances.get(userId) ?? 10) + amount;
    this.balances.set(userId, balance);
    this.transactions.push({ id: this.nextTransactionId++, userId, type, amount, balanceAfter: balance, videoId, requestId, createdAt: new Date() });
    return { claimed: true, amount, balance };
  }
  private async debit(userId: number, amount: number, type: TransactionType, videoId: number | null, requestId: string) {
    const existing = this.transactions.find((item) => item.requestId === requestId);
    if (existing) return existing.balanceAfter;
    const balance = await this.getBalance(userId);
    if (balance < amount) throw new Error('余额不足，请每日打卡获取货币');
    const next = balance - amount;
    this.balances.set(userId, next);
    this.transactions.push({ id: this.nextTransactionId++, userId, type, amount: -amount, balanceAfter: next, videoId, requestId, createdAt: new Date() });
    return next;
  }
  private trimMessages(sessionId: number) {
    const count = this.chatCounts.get(sessionId) ?? 0;
    if (count <= 10000) return;
    let remaining = count - 10000;
    for (let index = 0; index < this.messages.length && remaining > 0;) {
      const message = this.messages[index]!;
      if (message.sessionId === sessionId && message.kind === 'CHAT') {
        this.messages.splice(index, 1);
        remaining -= 1;
      } else {
        index += 1;
      }
    }
    this.chatCounts.set(sessionId, 10000);
  }
}

export class PrismaStore implements Store {
  readonly persistent = true;
  constructor(private readonly prisma: PrismaClient) {}
  async close(): Promise<void> { await this.prisma.$disconnect(); }
  async ready(): Promise<boolean> { try { await this.prisma.$queryRaw`SELECT 1`; return true; } catch { return false; } }
  async createRoom(input: Omit<RoomRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<RoomRecord> { return this.prisma.liveRoom.create({ data: input }); }
  async listRooms(): Promise<RoomRecord[]> { return this.prisma.liveRoom.findMany({ orderBy: { createdAt: 'desc' } }); }
  async getRoom(id: number): Promise<RoomRecord | null> { return this.prisma.liveRoom.findUnique({ where: { id } }); }
  async updateRoom(id: number, data: Partial<Pick<RoomRecord, 'status' | 'updatedAt'>>): Promise<RoomRecord> { return this.prisma.liveRoom.update({ where: { id }, data }); }
  async createSession(input: Omit<SessionRecord, 'id'>): Promise<SessionRecord> { return this.prisma.liveSession.create({ data: input }); }
  async getLatestSession(roomId: number): Promise<SessionRecord | null> { return this.prisma.liveSession.findFirst({ where: { roomId }, orderBy: { startedAt: 'desc' } }); }
  async getSession(id: number): Promise<SessionRecord | null> { return this.prisma.liveSession.findUnique({ where: { id } }); }
  async updateSession(id: number, data: Partial<Pick<SessionRecord, 'status' | 'endedAt' | 'replayStatus'>>): Promise<SessionRecord> { return this.prisma.liveSession.update({ where: { id }, data }); }
  async addMessage(input: Omit<MessageRecord, 'id' | 'createdAt'>): Promise<MessageRecord> { const message = await this.prisma.liveMessage.create({ data: input }); await this.purgeMessages(new Date(Date.now() - 7 * 86400000)); await this.trimPersistedMessages(input.sessionId); return message; }
  async listMessages(sessionId: number, limit: number): Promise<MessageRecord[]> { await this.purgeMessages(new Date(Date.now() - 7 * 86400000)); return this.prisma.liveMessage.findMany({ where: { sessionId }, orderBy: { createdAt: 'desc' }, take: limit }).then((items) => items.reverse()); }
  async purgeMessages(before: Date): Promise<number> { return (await this.prisma.liveMessage.deleteMany({ where: { kind: 'CHAT', createdAt: { lt: before } } })).count; }
  private async trimPersistedMessages(sessionId: number) { const ids = await this.prisma.liveMessage.findMany({ where: { sessionId, kind: 'CHAT' }, orderBy: { createdAt: 'asc' }, select: { id: true } }); if (ids.length > 10000) await this.prisma.liveMessage.deleteMany({ where: { id: { in: ids.slice(0, ids.length - 10000).map((item) => item.id) } } }); }
  async addViewerEvent(input: Omit<ViewerEventRecord, 'id' | 'createdAt'>): Promise<ViewerEventRecord> { return this.prisma.liveViewerEvent.create({ data: input }); }
  async countViewers(sessionId: number): Promise<number> {
    return (await this.listActiveViewers(sessionId)).length;
  }
  async listActiveViewers(sessionId: number): Promise<string[]> {
    const events = await this.prisma.liveViewerEvent.findMany({ where: { sessionId }, orderBy: { createdAt: 'asc' } });
    const active = new Set<string>();
    events.forEach((event) => event.eventType === 'JOIN' ? active.add(event.viewerId) : active.delete(event.viewerId));
    return Array.from(active);
  }
  async createReplay(input: Omit<ReplayRecord, 'id' | 'createdAt' | 'updatedAt' | 'attempts' | 'lastError' | 'nextRetryAt'>): Promise<ReplayRecord> {
    const existing = await this.getReplayBySession(input.sessionId) ?? await this.getReplayByKey(input.objectKey);
    if (existing) return existing;
    try {
      return await this.prisma.replayRegistration.create({ data: { ...input, attempts: 0, lastError: null, nextRetryAt: null } });
    } catch (error) {
      if (isUniqueError(error)) {
        const bySession = await this.getReplayBySession(input.sessionId);
        if (bySession) return bySession;
        const byKey = await this.getReplayByKey(input.objectKey);
        if (byKey) return byKey;
      }
      throw error;
    }
  }
  async getReplayBySession(sessionId: number): Promise<ReplayRecord | null> { return this.prisma.replayRegistration.findUnique({ where: { sessionId } }); }
  async getReplay(id: number): Promise<ReplayRecord | null> { return this.prisma.replayRegistration.findUnique({ where: { id } }); }
  async getReplayByKey(objectKey: string): Promise<ReplayRecord | null> { return this.prisma.replayRegistration.findUnique({ where: { objectKey } }); }
  async updateReplay(id: number, data: Partial<Pick<ReplayRecord, 'status' | 'contentVideoId' | 'attempts' | 'lastError' | 'nextRetryAt'>>): Promise<ReplayRecord> { return this.prisma.replayRegistration.update({ where: { id }, data }); }
  async getBalance(userId: number): Promise<number> { return (await this.prisma.coinAccount.upsert({ where: { userId }, create: { userId }, update: {} })).balance; }
  async listTransactions(userId: number): Promise<TransactionRecord[]> { return this.prisma.coinTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }); }
  async claimDaily(userId: number, claimDate: Date, requestId: string) {
    const existing = await this.prisma.coinTransaction.findUnique({ where: { requestId } });
    if (existing) return { claimed: false, amount: 0, balance: existing.balanceAfter };
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.dailyCoinClaim.create({ data: { userId, claimDate, amount: 2 } });
        const account = await tx.coinAccount.upsert({ where: { userId }, create: { userId, balance: 12 }, update: { balance: { increment: 2 } } });
        await tx.coinTransaction.create({ data: { userId, type: 'DAILY_CLAIM', amount: 2, balanceAfter: account.balance, requestId } });
        return { claimed: true, amount: 2, balance: account.balance };
      });
    } catch (error) { if (isUniqueError(error)) return { claimed: false, amount: 0, balance: await this.getBalance(userId) }; throw error; }
  }
  async getDailyClaims(userId: number): Promise<Date[]> { return (await this.prisma.dailyCoinClaim.findMany({ where: { userId }, orderBy: { claimDate: 'desc' }, select: { claimDate: true } })).map((item) => item.claimDate); }
  async getClaimedMilestones(userId: number): Promise<number[]> { return (await this.prisma.streakMilestoneClaim.findMany({ where: { userId }, select: { milestone: true } })).map((item) => item.milestone); }
  async claimMilestone(userId: number, milestone: number, requestId: string) {
    const existingTransaction = await this.prisma.coinTransaction.findUnique({ where: { requestId } });
    if (existingTransaction) return { claimed: false, amount: 0, balance: existingTransaction.balanceAfter };
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.streakMilestoneClaim.create({ data: { userId, milestone } });
        const account = await tx.coinAccount.upsert({ where: { userId }, create: { userId, balance: 20 }, update: { balance: { increment: 10 } } });
        await tx.coinTransaction.create({ data: { userId, type: 'STREAK_REWARD', amount: 10, balanceAfter: account.balance, requestId } });
        return { claimed: true, amount: 10, balance: account.balance };
      });
    } catch (error) { if (isUniqueError(error)) return { claimed: false, amount: 0, balance: await this.getBalance(userId), message: '该里程碑已领取' }; throw error; }
  }
  async coinVideo(userId: number, videoId: number, amount: number, requestId: string) {
    const existingTx = await this.prisma.coinTransaction.findUnique({ where: { requestId } });
    if (existingTx) return { amount: Math.abs(existingTx.amount), balance: existingTx.balanceAfter, userVideoCoinCount: (await this.prisma.videoCoinContribution.findUnique({ where: { videoId_userId: { videoId, userId } } }))?.amount ?? 0 };
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.videoCoinContribution.findUnique({ where: { videoId_userId: { videoId, userId } } });
        const current = existing?.amount ?? 0;
        if (current + amount > 2) throw new Error('每个视频最多投币 2 个');
        const account = await tx.coinAccount.upsert({ where: { userId }, create: { userId, balance: 10 - amount }, update: { balance: { decrement: amount } } });
        if (account.balance < 0) throw new Error('余额不足，请每日打卡获取货币');
        const contribution = existing ? await tx.videoCoinContribution.update({ where: { id: existing.id }, data: { amount: { increment: amount } } }) : await tx.videoCoinContribution.create({ data: { videoId, userId, amount } });
        await tx.coinTransaction.create({ data: { userId, type: 'VIDEO_COIN', amount: -amount, balanceAfter: account.balance, videoId, requestId } });
        return { amount, balance: account.balance, userVideoCoinCount: contribution.amount };
      });
    } catch (error) {
      if (isUniqueError(error)) {
        const existing = await this.prisma.coinTransaction.findUnique({ where: { requestId } });
        if (existing) return { amount: Math.abs(existing.amount), balance: existing.balanceAfter, userVideoCoinCount: (await this.prisma.videoCoinContribution.findUnique({ where: { videoId_userId: { videoId, userId } } }))?.amount ?? 0 };
      }
      throw error;
    }
  }
  async gift(userId: number, amount: number, requestId: string) {
    const existing = await this.prisma.coinTransaction.findUnique({ where: { requestId } });
    if (existing) return { amount: Math.abs(existing.amount), balance: existing.balanceAfter };
    try {
      return await this.prisma.$transaction(async (tx) => {
        const account = await tx.coinAccount.upsert({ where: { userId }, create: { userId, balance: 10 - amount }, update: { balance: { decrement: amount } } });
        if (account.balance < 0) throw new Error('余额不足，请每日打卡获取货币');
        await tx.coinTransaction.create({ data: { userId, type: 'LIVE_GIFT', amount: -amount, balanceAfter: account.balance, requestId } });
        return { amount, balance: account.balance };
      });
    } catch (error) {
      if (isUniqueError(error)) {
        const existing = await this.prisma.coinTransaction.findUnique({ where: { requestId } });
        if (existing) return { amount: Math.abs(existing.amount), balance: existing.balanceAfter };
      }
      throw error;
    }
  }
}

function isUniqueError(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'; }

function toRoomRecord(room: MemoryRoom): RoomRecord {
  return { id: room.id, broadcasterId: room.broadcasterId, title: room.title, category: room.category, coverUrl: room.coverUrl, sourceMode: room.sourceMode, streamKey: room.streamKey, rtmpUrl: room.rtmpUrl, playUrl: room.playUrl, status: room.status, createdAt: room.createdAt, updatedAt: room.updatedAt };
}

export function createStore(): Store {
  const databaseUrl = process.env.LIVE_REWARD_DATABASE_URL?.trim();
  if (!databaseUrl) return new MemoryStore();
  return new PrismaStore(new PrismaClient({ datasources: { db: { url: databaseUrl } } }));
}

export function newRequestId(): string { return randomUUID(); }
