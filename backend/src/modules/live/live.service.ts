import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { VideoService } from '../video/video.service';

type SessionDescriptionPayload = {
  type: 'offer' | 'answer';
  sdp: string;
};

type SrsRtcApiResponse = {
  code?: number;
  sdp?: string;
  sessionid?: string;
  server?: string;
};

type AuthUser = {
  id: number;
  nickname: string;
};

type LiveSourceMode = 'camera' | 'screen';

type LiveCategoryCode = 'all' | 'following' | 'study' | 'game' | 'tech' | 'life' | 'entertainment' | 'chat' | 'beauty';

type LiveMessage = {
  id: number;
  roomId: number;
  kind: 'CHAT' | 'SYSTEM';
  content: string;
  createdAt: string;
  sender: {
    id: number | null;
    nickname: string;
  };
};

type ViewerSignalState = {
  id: number;
  offer: SessionDescriptionPayload | null;
  answer: SessionDescriptionPayload | null;
  createdAt: string;
  updatedAt: string;
};

type SseClient = {
  response: Response;
  heartbeat: ReturnType<typeof setInterval>;
};

type LiveRoomState = {
  id: number;
  sessionId: number;
  title: string;
  category: string;
  coverUrl?: string;
  sourceMode: LiveSourceMode;
  streamKey: string;
  rtmpUrl: string;
  playUrl: string;
  broadcasterId: number;
  broadcasterNickname: string;
  status: 'IDLE' | 'LIVING' | 'ENDED';
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  replayUrl?: string;
  replayAssetId?: number;
  replayVideoId?: number;
  latestFrame?: string;
  latestFrameAt?: string;
  viewers: Map<number, ViewerSignalState>;
  nextViewerId: number;
  messages: LiveMessage[];
  roomFeedClients: Set<SseClient>;
  publisherSignalClients: Set<SseClient>;
  viewerSignalClients: Map<number, Set<SseClient>>;
};

@Injectable()
export class LiveService {
  private nextRoomId = 1;
  private nextMessageId = 1;
  private readonly rooms = new Map<number, LiveRoomState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly videoService: VideoService,
  ) {}

  createRoom(user: AuthUser, payload: { title: string; category?: string; coverUrl?: string; sourceMode?: LiveSourceMode }) {
    const roomId = this.nextRoomId++;
    const createdAt = new Date().toISOString();
    const streamKey = `room-${roomId}-${Date.now()}`;
    const rtmpBase = this.getSrsRtmpBase();
    const playBase = this.getSrsPlayBase();
    const room: LiveRoomState = {
      id: roomId,
      sessionId: roomId,
      title: payload.title,
      category: payload.category ?? 'live',
      coverUrl: payload.coverUrl,
      sourceMode: payload.sourceMode ?? 'camera',
      streamKey,
      rtmpUrl: `${rtmpBase}/${streamKey}`,
      playUrl: `${playBase}/${streamKey}.flv`,
      broadcasterId: user.id,
      broadcasterNickname: user.nickname,
      status: 'IDLE',
      createdAt,
      replayUrl: undefined,
      replayAssetId: undefined,
      replayVideoId: undefined,
      latestFrame: undefined,
      latestFrameAt: undefined,
      viewers: new Map<number, ViewerSignalState>(),
      nextViewerId: 1,
      messages: [],
      roomFeedClients: new Set<SseClient>(),
      publisherSignalClients: new Set<SseClient>(),
      viewerSignalClients: new Map<number, Set<SseClient>>(),
    };

    this.addSystemMessage(room, `${user.nickname} 创建了直播间`, false);
    this.rooms.set(roomId, room);

    return this.serializeRoom(room);
  }

  listRooms(options?: {
    keyword?: string;
    category?: string;
    broadcasterId?: number;
    status?: 'IDLE' | 'LIVING' | 'ENDED';
    limit?: number;
  }) {
    const keyword = options?.keyword?.trim().toLowerCase();
    const limit = this.normalizeLimit(options?.limit);

    return Array.from(this.rooms.values())
      .filter((room) => !options?.status || room.status === options.status)
      .filter((room) => !options?.category || room.category === options.category)
      .filter((room) => !options?.broadcasterId || room.broadcasterId === options.broadcasterId)
      .filter((room) => {
        if (!keyword) {
          return true;
        }

        return `${room.title} ${room.broadcasterNickname}`.toLowerCase().includes(keyword);
      })
      .sort((left, right) => this.compareRooms(left, right))
      .slice(0, limit)
      .map((room) => this.serializeRoom(room));
  }

  countRooms(options?: {
    keyword?: string;
    category?: string;
    broadcasterId?: number;
    status?: 'IDLE' | 'LIVING' | 'ENDED';
  }) {
    const keyword = options?.keyword?.trim().toLowerCase();

    return Array.from(this.rooms.values())
      .filter((room) => !options?.status || room.status === options.status)
      .filter((room) => !options?.category || room.category === options.category)
      .filter((room) => !options?.broadcasterId || room.broadcasterId === options.broadcasterId)
      .filter((room) => {
        if (!keyword) {
          return true;
        }

        return `${room.title} ${room.broadcasterNickname}`.toLowerCase().includes(keyword);
      }).length;
  }

  async getCenterOverview(currentUser?: AuthUser | null) {
    const rooms = Array.from(this.rooms.values());
    const livingRooms = rooms.filter((room) => room.status === 'LIVING');
    const myRooms = currentUser ? rooms.filter((room) => room.broadcasterId === currentUser.id) : [];
    const myActiveRoom =
      myRooms.find((room) => room.status === 'LIVING') ??
      myRooms.find((room) => room.status === 'IDLE') ??
      myRooms.sort((left, right) => this.getRoomTimestamp(right) - this.getRoomTimestamp(left))[0] ??
      null;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const todayViewerCount = rooms
      .filter((room) => this.getRoomTimestamp(room) >= dayStart.getTime())
      .reduce((sum, room) => sum + room.viewers.size, 0);
    const [myRoom] = myActiveRoom ? await this.serializeRoomsWithAvatars([myActiveRoom]) : [null];

    return {
      metrics: {
        livingRoomCount: livingRooms.length,
        myLivingRoomCount: myRooms.filter((room) => room.status === 'LIVING').length,
        identity: {
          label: currentUser ? '主播' : '游客',
          description: currentUser ? '已认证' : '未登录',
        },
        todayViewerCount,
      },
      myRoom,
      categories: this.getLiveCategories(),
      tips: [
        '保持网络稳定，推荐使用有线网络',
        '开播前检查摄像头和麦克风',
        '标题越清晰，越容易被观众发现',
        '遵守平台规则，营造良好直播环境',
      ],
    };
  }

  async getPlazaRooms(
    options?: {
      category?: LiveCategoryCode | string;
      keyword?: string;
      limit?: number;
    },
    currentUser?: AuthUser | null,
  ) {
    const category = options?.category ?? 'all';
    const followingIds = category === 'following' && currentUser ? await this.getFollowingIds(currentUser.id) : [];
    const followingIdSet = new Set(followingIds);
    const keyword = options?.keyword?.trim().toLowerCase();
    const limit = this.normalizeLimit(options?.limit);
    const rooms = Array.from(this.rooms.values())
      .filter((room) => room.status === 'LIVING')
      .filter((room) => category !== 'following' || followingIdSet.has(room.broadcasterId))
      .filter((room) => category === 'all' || category === 'following' || room.category === category)
      .filter((room) => {
        if (!keyword) {
          return true;
        }

        return `${room.title} ${room.broadcasterNickname} ${room.category}`.toLowerCase().includes(keyword);
      })
      .sort((left, right) => this.compareLiveDiscoveryRooms(left, right));

    return {
      list: await this.serializeRoomsWithAvatars(rooms.slice(0, limit)),
      total: rooms.length,
      categories: this.getLiveCategories(),
    };
  }

  async getHotRooms(limit?: number) {
    const rooms = Array.from(this.rooms.values())
      .filter((room) => room.status === 'LIVING')
      .sort((left, right) => this.compareLiveDiscoveryRooms(left, right))
      .slice(0, this.normalizeLimit(limit ?? 8));

    return {
      list: await this.serializeRoomsWithAvatars(rooms),
    };
  }

  getLiveCategories() {
    return [
      { code: 'all', label: '全部' },
      { code: 'following', label: '关注' },
      { code: 'study', label: '学习' },
      { code: 'game', label: '游戏' },
      { code: 'tech', label: '科技' },
      { code: 'life', label: '生活' },
      { code: 'entertainment', label: '娱乐' },
      { code: 'chat', label: '聊天' },
      { code: 'beauty', label: '颜值' },
    ];
  }

  getRoom(roomId: number) {
    return this.serializeRoom(this.requireRoom(roomId));
  }

  startRoom(id: number, user: AuthUser) {
    const room = this.requireOwnedRoom(id, user.id);
    room.status = 'LIVING';
    room.startedAt = new Date().toISOString();
    room.endedAt = undefined;
    room.latestFrame = undefined;
    room.latestFrameAt = undefined;
    this.addSystemMessage(room, '直播已开始');
    this.emitSessionUpdate(room);

    return {
      roomId: room.id,
      sessionId: room.sessionId,
      status: room.status,
    };
  }

  stopRoom(id: number, user: AuthUser) {
    const room = this.requireOwnedRoom(id, user.id);
    room.status = 'ENDED';
    room.endedAt = new Date().toISOString();

    room.viewers.forEach((viewer) => {
      this.emitViewerSignal(room, viewer.id, 'room-ended', {
        roomId: room.id,
        viewerId: viewer.id,
        status: room.status,
      });
    });
    room.viewers.clear();

    this.addSystemMessage(room, '直播已结束');
    this.emitSessionUpdate(room);

    return {
      roomId: room.id,
      sessionId: room.sessionId,
      status: room.status,
    };
  }

  createViewer(roomId: number) {
    const room = this.requireLiveRoom(roomId);
    const viewerId = room.nextViewerId++;
    const timestamp = new Date().toISOString();
    room.viewers.set(viewerId, {
      id: viewerId,
      offer: null,
      answer: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    this.emitSessionUpdate(room);

    return {
      roomId: room.id,
      viewerId,
      status: room.status,
    };
  }

  removeViewer(roomId: number, viewerId: number) {
    const room = this.requireRoom(roomId);

    if (!room.viewers.delete(viewerId)) {
      throw new NotFoundException('Viewer not found');
    }

    room.viewerSignalClients.delete(viewerId);
    this.emitSessionUpdate(room);

    return {
      roomId,
      viewerId,
      removed: true,
    };
  }

  submitViewerOffer(roomId: number, viewerId: number, offer: SessionDescriptionPayload) {
    const room = this.requireRoom(roomId);
    const viewer = this.requireViewerFromRoom(room, viewerId);
    viewer.offer = offer;
    viewer.answer = null;
    viewer.updatedAt = new Date().toISOString();

    this.emitPublisherSignal(room, 'viewer-offer', {
      viewerId,
      offer,
      updatedAt: viewer.updatedAt,
    });

    return {
      roomId,
      viewerId,
      received: true,
    };
  }

  getPendingViewers(roomId: number, user: AuthUser) {
    const room = this.requireOwnedRoom(roomId, user.id);

    return Array.from(room.viewers.values())
      .filter((viewer) => viewer.offer && !viewer.answer)
      .map((viewer) => ({
        viewerId: viewer.id,
        offer: viewer.offer!,
        updatedAt: viewer.updatedAt,
      }));
  }

  submitViewerAnswer(roomId: number, viewerId: number, user: AuthUser, answer: SessionDescriptionPayload) {
    const room = this.requireOwnedRoom(roomId, user.id);
    const viewer = this.requireViewerFromRoom(room, viewerId);

    viewer.answer = answer;
    viewer.updatedAt = new Date().toISOString();
    this.emitViewerSignal(room, viewerId, 'viewer-answer', {
      viewerId,
      answer,
      updatedAt: viewer.updatedAt,
    });

    return {
      roomId,
      viewerId,
      delivered: true,
    };
  }

  getViewerAnswer(roomId: number, viewerId: number) {
    const viewer = this.requireViewer(roomId, viewerId);

    return {
      ready: Boolean(viewer.answer),
      answer: viewer.answer,
      updatedAt: viewer.updatedAt,
    };
  }

  async publishToSrs(roomId: number, user: AuthUser, offer: SessionDescriptionPayload) {
    const room = this.requireOwnedRoom(roomId, user.id);
    return this.exchangeRtcSdp('publish', room, offer);
  }

  async playFromSrs(roomId: number, offer: SessionDescriptionPayload) {
    const room = this.requireLiveRoom(roomId);
    return this.exchangeRtcSdp('play', room, offer);
  }

  getFrame(roomId: number) {
    const room = this.requireRoom(roomId);
    return {
      image: room.latestFrame ?? null,
      updatedAt: room.latestFrameAt ?? null,
    };
  }

  updateFrame(roomId: number, user: AuthUser, payload: { image: string }) {
    const room = this.requireOwnedRoom(roomId, user.id);
    if (room.status !== 'LIVING') {
      throw new ForbiddenException('Live room is not active');
    }

    room.latestFrame = payload.image;
    room.latestFrameAt = new Date().toISOString();

    this.emitRoomFeed(room, 'frame', this.getFrame(roomId));
    return this.getFrame(roomId);
  }

  getSession(id: number) {
    const room = this.requireRoom(id);

    return {
      id: room.sessionId,
      roomId: room.id,
      title: room.title,
      status: room.status,
      playUrl: room.playUrl,
      coverUrl: room.coverUrl,
      sourceMode: room.sourceMode,
      replayUrl: room.replayUrl ?? null,
      replayVideoId: room.replayVideoId ?? null,
      broadcaster: {
        id: room.broadcasterId,
        nickname: room.broadcasterNickname,
      },
      viewerCount: room.viewers.size,
      startedAt: room.startedAt ?? null,
      endedAt: room.endedAt ?? null,
    };
  }

  async saveReplay(
    roomId: number,
    user: AuthUser,
    payload: {
      saveMode: 'REPLAY' | 'UPLOAD';
      assetId?: number;
      uploadToken?: string;
      title?: string;
      description?: string;
      category?: string;
      coverUrl?: string;
      coverAssetId?: number;
      coverUploadToken?: string;
    },
  ) {
    const room = this.requireOwnedRoom(roomId, user.id);
    const asset = await this.resolveAsset(payload.assetId, payload.uploadToken);
    this.assertPlayableReplayAsset(asset);

    room.replayAssetId = asset.id;
    room.replayUrl = asset.url;

    let videoId: number | null = null;

    if (payload.saveMode === 'UPLOAD') {
      const video = await this.videoService.createVideo(user, {
        assetId: asset.id,
        uploadToken: asset.objectKey,
        title: payload.title?.trim() || `${room.title} 回放`,
        description: payload.description?.trim() || `直播回放：${room.title}`,
        category: payload.category ?? room.category,
        coverUrl: payload.coverUrl ?? room.coverUrl,
        coverAssetId: payload.coverAssetId,
        coverUploadToken: payload.coverUploadToken,
      });

      videoId = video?.id ?? null;
      room.replayVideoId = videoId ?? undefined;
    }

    this.addSystemMessage(
      room,
      payload.saveMode === 'UPLOAD' ? '直播回放已保存为视频稿件' : '直播回放已保存，可在房间内播放',
    );
    this.emitSessionUpdate(room);

    return {
      roomId: room.id,
      replayUrl: room.replayUrl,
      replayVideoId: room.replayVideoId ?? null,
      saveMode: payload.saveMode,
    };
  }

  listMessages(roomId: number) {
    const room = this.requireRoom(roomId);
    return room.messages.slice(-60);
  }

  createMessage(roomId: number, user: AuthUser, payload: { content: string }) {
    const room = this.requireLiveRoom(roomId);
    const content = payload.content.trim();

    if (!content) {
      throw new BadRequestException('Message content is required');
    }

    const message: LiveMessage = {
      id: this.nextMessageId++,
      roomId,
      kind: 'CHAT',
      content: content.slice(0, 200),
      createdAt: new Date().toISOString(),
      sender: {
        id: user.id,
        nickname: user.nickname,
      },
    };

    room.messages.push(message);
    room.messages = room.messages.slice(-100);
    this.emitRoomFeed(room, 'chat-message', message);

    return message;
  }

  subscribeRoomFeed(roomId: number, response: Response) {
    const room = this.requireRoom(roomId);
    this.registerSseClient(room.roomFeedClients, response, 'snapshot', {
      session: this.getSession(roomId),
      messages: this.listMessages(roomId),
    });
  }

  subscribePublisherSignals(roomId: number, user: AuthUser, response: Response) {
    const room = this.requireOwnedRoom(roomId, user.id);
    this.registerSseClient(room.publisherSignalClients, response, 'snapshot', {
      roomId,
      pendingViewers: this.getPendingViewers(roomId, user),
    });
  }

  subscribeViewerSignals(roomId: number, viewerId: number, response: Response) {
    const room = this.requireRoom(roomId);
    const viewer = this.requireViewerFromRoom(room, viewerId);
    const clients = room.viewerSignalClients.get(viewerId) ?? new Set<SseClient>();
    room.viewerSignalClients.set(viewerId, clients);

    this.registerSseClient(clients, response, 'snapshot', {
      roomId,
      viewerId,
      ready: Boolean(viewer.answer),
      answer: viewer.answer,
      updatedAt: viewer.updatedAt,
    });
  }

  private requireRoom(roomId: number) {
    const room = this.rooms.get(roomId);

    if (!room) {
      throw new NotFoundException('Live room not found');
    }

    return room;
  }

  private requireLiveRoom(roomId: number) {
    const room = this.requireRoom(roomId);

    if (room.status !== 'LIVING') {
      throw new ForbiddenException('Live room is not active');
    }

    return room;
  }

  private requireOwnedRoom(roomId: number, userId: number) {
    const room = this.requireRoom(roomId);

    if (room.broadcasterId !== userId) {
      throw new ForbiddenException('Only broadcaster can operate this room');
    }

    return room;
  }

  private requireViewer(roomId: number, viewerId: number) {
    return this.requireViewerFromRoom(this.requireRoom(roomId), viewerId);
  }

  private requireViewerFromRoom(room: LiveRoomState, viewerId: number) {
    const viewer = room.viewers.get(viewerId);

    if (!viewer) {
      throw new NotFoundException('Viewer not found');
    }

    return viewer;
  }

  private serializeRoom(room: LiveRoomState) {
    return {
      id: room.id,
      sessionId: room.sessionId,
      title: room.title,
      category: room.category,
      coverUrl: room.coverUrl,
      sourceMode: room.sourceMode,
      streamKey: room.streamKey,
      rtmpUrl: room.rtmpUrl,
      playUrl: room.playUrl,
      status: room.status,
      viewerCount: room.viewers.size,
      createdAt: room.createdAt,
      startedAt: room.startedAt ?? null,
      endedAt: room.endedAt ?? null,
      replayUrl: room.replayUrl ?? null,
      replayVideoId: room.replayVideoId ?? null,
      broadcaster: {
        id: room.broadcasterId,
        nickname: room.broadcasterNickname,
      },
    };
  }

  private async serializeRoomsWithAvatars(rooms: LiveRoomState[]) {
    const broadcasterIds = Array.from(new Set(rooms.map((room) => room.broadcasterId)));
    const users =
      broadcasterIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: broadcasterIds } },
            select: { id: true, avatarUrl: true },
          })
        : [];
    const avatarIndex = new Map(users.map((user) => [user.id, user.avatarUrl] as const));

    return rooms.map((room) => ({
      ...this.serializeRoom(room),
      broadcaster: {
        id: room.broadcasterId,
        nickname: room.broadcasterNickname,
        avatarUrl: avatarIndex.get(room.broadcasterId) ?? null,
      },
    }));
  }

  private async getFollowingIds(userId: number) {
    const relations = await this.prisma.followRelation.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    return relations.map((relation) => relation.followingId);
  }

  private async resolveAsset(assetId?: number, uploadToken?: string) {
    if (assetId !== undefined) {
      const asset = await this.prisma.videoAsset.findUnique({ where: { id: assetId } });
      if (!asset) {
        throw new NotFoundException('Recording asset not found');
      }
      return asset;
    }

    if (uploadToken) {
      const asset = await this.prisma.videoAsset.findUnique({ where: { objectKey: uploadToken } });
      if (!asset) {
        throw new NotFoundException('Recording asset not found');
      }
      return asset;
    }

    throw new BadRequestException('Recording asset is required');
  }

  private assertPlayableReplayAsset(asset: { mimeType: string }) {
    const mimeType = asset.mimeType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
    if (!['video/webm', 'video/mp4'].includes(mimeType)) {
      throw new BadRequestException('Replay asset must be a playable WebM or MP4 video');
    }
  }

  private getSrsRtmpBase() {
    return (process.env.SRS_RTMP_BASE ?? 'rtmp://127.0.0.1/live').replace(/\/$/, '');
  }

  private getSrsPlayBase() {
    return (process.env.SRS_PLAY_BASE ?? 'http://127.0.0.1:8080/live').replace(/\/$/, '');
  }

  private getSrsWebRtcBase() {
    return (process.env.SRS_WEBRTC_BASE ?? 'webrtc://127.0.0.1/live').replace(/\/$/, '');
  }

  private getSrsApiBase() {
    return (process.env.SRS_API_BASE ?? 'http://127.0.0.1:1985').replace(/\/$/, '');
  }

  private async exchangeRtcSdp(
    action: 'publish' | 'play',
    room: LiveRoomState,
    offer: SessionDescriptionPayload,
  ) {
    const api = `${this.getSrsApiBase()}/rtc/v1/${action}/`;
    const streamurl = `${this.getSrsWebRtcBase()}/${room.streamKey}`;

    let response: globalThis.Response;
    try {
      response = await fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api,
          streamurl,
          clientip: null,
          sdp: offer.sdp,
        }),
      });
    } catch {
      throw new BadRequestException('SRS service is unavailable');
    }

    if (!response.ok) {
      throw new BadRequestException(`SRS request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as SrsRtcApiResponse;
    if (payload.code !== 0 || !payload.sdp) {
      throw new BadRequestException('SRS SDP exchange failed');
    }

    return {
      type: 'answer' as const,
      sdp: payload.sdp,
      sessionId: payload.sessionid ?? null,
      server: payload.server ?? null,
    };
  }

  private normalizeLimit(limit?: number) {
    if (!limit || !Number.isFinite(limit) || limit < 1) {
      return 20;
    }

    return Math.min(50, Math.floor(limit));
  }

  private compareRooms(left: LiveRoomState, right: LiveRoomState) {
    const statusPriority: Record<LiveRoomState['status'], number> = {
      LIVING: 0,
      IDLE: 1,
      ENDED: 2,
    };

    const statusDiff = statusPriority[left.status] - statusPriority[right.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }

    return this.getRoomTimestamp(right) - this.getRoomTimestamp(left);
  }

  private compareLiveDiscoveryRooms(left: LiveRoomState, right: LiveRoomState) {
    const viewerDiff = right.viewers.size - left.viewers.size;
    if (viewerDiff !== 0) {
      return viewerDiff;
    }

    return this.getRoomTimestamp(right) - this.getRoomTimestamp(left);
  }

  private getRoomTimestamp(room: LiveRoomState) {
    const value = room.status === 'ENDED' ? room.endedAt ?? room.startedAt ?? room.createdAt : room.startedAt ?? room.createdAt;
    return new Date(value).getTime();
  }

  private addSystemMessage(room: LiveRoomState, content: string, emit = true) {
    const message: LiveMessage = {
      id: this.nextMessageId++,
      roomId: room.id,
      kind: 'SYSTEM',
      content,
      createdAt: new Date().toISOString(),
      sender: {
        id: null,
        nickname: '系统',
      },
    };

    room.messages.push(message);
    room.messages = room.messages.slice(-100);

    if (emit) {
      this.emitRoomFeed(room, 'system-message', message);
    }
  }

  private emitSessionUpdate(room: LiveRoomState) {
    this.emitRoomFeed(room, 'session', this.getSession(room.id));
  }

  private emitRoomFeed(room: LiveRoomState, event: string, data: unknown) {
    this.broadcast(room.roomFeedClients, event, data);
  }

  private emitPublisherSignal(room: LiveRoomState, event: string, data: unknown) {
    this.broadcast(room.publisherSignalClients, event, data);
  }

  private emitViewerSignal(room: LiveRoomState, viewerId: number, event: string, data: unknown) {
    const clients = room.viewerSignalClients.get(viewerId);

    if (!clients) {
      return;
    }

    this.broadcast(clients, event, data);
  }

  private registerSseClient(clients: Set<SseClient>, response: Response, initialEvent: string, initialData: unknown) {
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();
    response.write('retry: 3000\n\n');

    const client: SseClient = {
      response,
      heartbeat: setInterval(() => {
        this.writeEvent(response, 'ping', { timestamp: new Date().toISOString() });
      }, 15000),
    };

    clients.add(client);
    this.writeEvent(response, initialEvent, initialData);

    response.on('close', () => {
      clearInterval(client.heartbeat);
      clients.delete(client);
      response.end();
    });
  }

  private broadcast(clients: Set<SseClient>, event: string, data: unknown) {
    Array.from(clients).forEach((client) => {
      this.writeEvent(client.response, event, data);
    });
  }

  private writeEvent(response: Response, event: string, data: unknown) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
