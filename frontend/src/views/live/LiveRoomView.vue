<template>
  <section class="page">
    <header class="hero">
      <div>
        <span class="eyebrow">Live Studio</span>
        <h1>直播中心</h1>
        <p>主播可以开启摄像头或屏幕共享直播，观众进入直播间后会实时接收画面、房间状态和聊天消息。</p>
      </div>
      <div class="hero-actions">
        <el-button type="primary" size="large" @click="openStudio">我要直播</el-button>
        <el-button
          v-if="isCurrentHostRoom || routeRoomId === null"
          plain
          size="large"
          :disabled="!hasPreview"
          @click="handlePreparePreview"
        >
          刷新预览
        </el-button>
      </div>
    </header>

    <div class="layout">
      <section class="player-panel">
        <div class="panel-head">
          <div>
            <h2>{{ panelTitle }}</h2>
            <p>{{ panelSubtitle }}</p>
          </div>
          <div class="status-group">
            <span class="pill">{{ sourceModeLabel }}</span>
            <span class="pill pill-live" v-if="isLive">LIVE</span>
            <span class="pill pill-idle" v-else>待开播</span>
            <span class="pill pill-viewer" v-if="isViewerMode">观众视角</span>
          </div>
        </div>

        <div class="player-shell">
          <video
            v-if="isViewerMode && hasRemotePlayback"
            ref="viewerRef"
            class="player-video"
            autoplay
            playsinline
            controls
          />
          <video v-else-if="hasPreview" ref="previewRef" class="player-video" autoplay muted playsinline />
          <div v-else class="player-placeholder">
            <strong>{{ placeholderTitle }}</strong>
            <p>{{ placeholderDescription }}</p>
          </div>
        </div>

        <div class="control-bar" v-if="!isViewerMode">
          <el-button :loading="preparing" @click="handlePreparePreview">准备预览</el-button>
          <el-button type="primary" :loading="starting" :disabled="!hasPreview || isLive" @click="handleStartLive">
            开始直播
          </el-button>
          <el-button type="danger" plain :loading="stopping" :disabled="!hasPreview && !isLive" @click="handleStopLive">
            结束直播
          </el-button>
        </div>

        <div class="control-bar" v-else>
          <el-button :loading="joining" :disabled="!canJoinAsViewer" @click="handleJoinViewer">
            {{ hasRemotePlayback ? '重新连接' : '进入观看' }}
          </el-button>
          <el-button plain :disabled="!hasRemotePlayback" @click="handleLeaveViewer">离开直播</el-button>
        </div>
      </section>

      <aside class="panel side-panel">
        <section class="panel-block">
          <h3>直播信息</h3>
          <el-empty v-if="!activeRoom && !displayedSession" description="还没有创建或进入直播间" />
          <template v-else>
            <div class="meta-row">
              <span>房间标题</span>
              <strong>{{ activeRoom?.title ?? displayedSession?.title }}</strong>
            </div>
            <div class="meta-row">
              <span>房间 ID</span>
              <strong>{{ activeRoom?.id ?? displayedSession?.roomId ?? routeRoomId ?? '-' }}</strong>
            </div>
            <div class="meta-row">
              <span>主播昵称</span>
              <strong>{{ activeRoom?.broadcaster?.nickname ?? displayedSession?.broadcaster?.nickname ?? nickname }}</strong>
            </div>
            <div class="meta-row">
              <span>观众数</span>
              <strong>{{ displayedSession?.viewerCount ?? 0 }}</strong>
            </div>
            <div class="meta-row">
              <span>直播模式</span>
              <strong>{{ sourceModeLabel }}</strong>
            </div>
            <el-input v-if="activeRoom" :model-value="shareLink" readonly>
              <template #prepend>分享地址</template>
            </el-input>
            <el-input v-if="activeRoom" :model-value="activeRoom.rtmpUrl" readonly>
              <template #prepend>信令入口</template>
            </el-input>
            <el-input v-if="activeRoom" :model-value="activeRoom.streamKey" readonly>
              <template #prepend>房间令牌</template>
            </el-input>
          </template>
        </section>

        <section class="panel-block">
          <h3>当前状态</h3>
          <div class="meta-row">
            <span>用户身份</span>
            <strong>{{ nickname }}</strong>
          </div>
          <div class="meta-row">
            <span>登录状态</span>
            <strong>{{ isLoggedIn ? '已登录' : '未登录' }}</strong>
          </div>
          <div class="meta-row">
            <span>会话状态</span>
            <strong>{{ displayedSession?.status ?? 'IDLE' }}</strong>
          </div>
          <div class="meta-row">
            <span>当前模式</span>
            <strong>{{ isViewerMode ? '观众观看' : '主播控制台' }}</strong>
          </div>
          <div class="meta-row" v-if="displayedSession?.startedAt">
            <span>开播时间</span>
            <strong>{{ formatTime(displayedSession.startedAt) }}</strong>
          </div>
        </section>

        <section class="panel-block chat-block">
          <div class="chat-head">
            <h3>直播聊天</h3>
            <span>{{ liveMessages.length }} 条</span>
          </div>
          <div v-if="currentRoomId" class="chat-list">
            <article
              v-for="item in liveMessages"
              :key="item.id"
              class="chat-item"
              :class="item.kind === 'SYSTEM' ? 'chat-item-system' : ''"
            >
              <div class="chat-meta">
                <strong>{{ item.sender.nickname }}</strong>
                <span>{{ formatTime(item.createdAt) }}</span>
              </div>
              <p>{{ item.content }}</p>
            </article>
            <el-empty v-if="liveMessages.length === 0" description="直播开始后可在这里互动" />
          </div>
          <el-empty v-else description="进入直播间后可查看聊天消息" />
          <div class="chat-compose">
            <el-input
              v-model="chatDraft"
              :disabled="!canSendMessage"
              maxlength="200"
              placeholder="输入聊天内容，按回车发送"
              @keyup.enter="handleSendMessage"
            />
            <el-button type="primary" :loading="sendingMessage" :disabled="!canSendMessage" @click="handleSendMessage">
              发送
            </el-button>
          </div>
        </section>

        <section class="panel-block">
          <h3>能力清单</h3>
          <ul class="feature-list">
            <li>支持摄像头直播和屏幕共享直播</li>
            <li>房间状态、观众接入和聊天消息实时同步</li>
            <li>观众进入房间后自动发起 WebRTC 接入</li>
            <li>支持直播广场、直播搜索和房间分享</li>
          </ul>
        </section>
      </aside>
    </div>

    <section class="panel hub-panel">
      <div class="hub-head">
        <div>
          <span class="eyebrow">Live Hub</span>
          <h2>{{ routeRoomId ? '更多直播间' : '直播广场' }}</h2>
          <p>{{ routeRoomId ? '继续浏览其他正在直播或刚结束的房间。' : '这里汇总了平台内正在直播和最近结束的房间。' }}</p>
        </div>
      </div>

      <div v-if="recommendedRooms.length > 0" class="room-grid">
        <LiveRoomCard v-for="room in recommendedRooms" :key="room.id" :item="room" />
      </div>
      <el-empty v-else description="当前还没有可展示的直播房间" />
    </section>

    <el-dialog v-model="studioVisible" title="创建直播间" width="560px">
      <el-alert
        v-if="!isLoggedIn"
        title="请先登录用户账号，再发起直播。"
        type="warning"
        :closable="false"
        show-icon
      />
      <el-form :model="studioForm" label-position="top">
        <el-form-item label="直播标题">
          <el-input v-model="studioForm.title" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="分类 ID">
          <el-input-number v-model="studioForm.categoryId" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="封面地址（可选）">
          <el-input v-model="studioForm.coverUrl" placeholder="可以留空，后续再补封面" />
        </el-form-item>
        <el-form-item label="直播方式">
          <el-radio-group v-model="studioForm.mode">
            <el-radio-button value="camera">摄像头直播</el-radio-button>
            <el-radio-button value="screen">屏幕共享直播</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="studioVisible = false">取消</el-button>
        <el-button type="primary" :loading="preparing" :disabled="!isLoggedIn" @click="handlePreparePreview">
          准备预览
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';

import {
  createLiveMessage,
  createLiveRoom,
  createLiveViewer,
  fetchLiveMessages,
  fetchLiveRoom,
  fetchLiveRooms,
  fetchLiveSession,
  leaveLiveViewer,
  startLiveRoom,
  stopLiveRoom,
  submitLiveViewerAnswer,
  submitLiveViewerOffer,
} from '@/api/platform';
import LiveRoomCard from '@/components/live/LiveRoomCard.vue';
import { useAppStore } from '@/stores/app';
import type { LiveMessage, LiveRoomInfo, LiveSessionInfo, PendingLiveViewer, SessionDescriptionPayload } from '@/types/api';

type CaptureMode = 'camera' | 'screen';

type RoomSnapshotPayload = {
  session: LiveSessionInfo;
  messages: LiveMessage[];
};

type PublisherSnapshotPayload = {
  roomId: number;
  pendingViewers: PendingLiveViewer[];
};

type ViewerSignalPayload = {
  roomId: number;
  viewerId: number;
  ready?: boolean;
  answer?: SessionDescriptionPayload | null;
  updatedAt?: string;
  status?: string;
};

const WEBRTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const { isLoggedIn, nickname, token, userId } = storeToRefs(appStore);

const studioVisible = ref(false);
const preparing = ref(false);
const starting = ref(false);
const joining = ref(false);
const stopping = ref(false);
const sendingMessage = ref(false);
const previewRef = ref<HTMLVideoElement | null>(null);
const viewerRef = ref<HTMLVideoElement | null>(null);
const previewStream = ref<MediaStream | null>(null);
const remoteStream = ref<MediaStream | null>(null);
const activeRoom = ref<LiveRoomInfo | null>(null);
const liveSession = ref<LiveSessionInfo | null>(null);
const fetchedSession = ref<LiveSessionInfo | null>(null);
const hubRooms = ref<LiveRoomInfo[]>([]);
const liveMessages = ref<LiveMessage[]>([]);
const chatDraft = ref('');
const viewerPeer = ref<RTCPeerConnection | null>(null);
const viewerRoomId = ref<number | null>(null);
const viewerId = ref<number | null>(null);
const publisherPeers = new Map<number, RTCPeerConnection>();
let hubPollTimer: ReturnType<typeof setInterval> | null = null;
let roomEventSource: EventSource | null = null;
let publisherEventSource: EventSource | null = null;
let viewerEventSource: EventSource | null = null;

const studioForm = reactive({
  title: '我的直播间',
  categoryId: 5,
  coverUrl: '',
  mode: 'camera' as CaptureMode,
});

const routeRoomId = computed<number | null>(() => {
  const id = Number(route.params.id);
  return Number.isFinite(id) && id > 0 ? id : null;
});
const displayedSession = computed(() => liveSession.value ?? fetchedSession.value);
const currentRoomId = computed(() => routeRoomId.value ?? activeRoom.value?.id ?? null);
const isCurrentHostRoom = computed(() => Boolean(activeRoom.value && routeRoomId.value === activeRoom.value.id));
const isViewerMode = computed(() => Boolean(routeRoomId.value && !isCurrentHostRoom.value));
const hasPreview = computed(() => Boolean(previewStream.value));
const hasRemotePlayback = computed(() => Boolean(remoteStream.value));
const isLive = computed(() => displayedSession.value?.status === 'LIVING');
const canJoinAsViewer = computed(() => isViewerMode.value && displayedSession.value?.status === 'LIVING');
const canSendMessage = computed(() => Boolean(currentRoomId.value && isLoggedIn.value && displayedSession.value?.status === 'LIVING'));
const activeSourceMode = computed(() => activeRoom.value?.sourceMode ?? displayedSession.value?.sourceMode ?? studioForm.mode);
const sourceModeLabel = computed(() => (activeSourceMode.value === 'screen' ? '屏幕共享直播' : '摄像头直播'));
const shareLink = computed(() =>
  routeRoomId.value && typeof window !== 'undefined' ? `${window.location.origin}/live/${routeRoomId.value}` : '',
);
const recommendedRooms = computed(() =>
  hubRooms.value.filter((room) => room.id !== routeRoomId.value).slice(0, routeRoomId.value ? 4 : 8),
);
const panelTitle = computed(() => {
  if (isViewerMode.value) {
    return displayedSession.value?.title ?? '直播观看区';
  }

  return activeRoom.value?.title ?? '直播预览区';
});
const panelSubtitle = computed(() => {
  if (isViewerMode.value) {
    return displayedSession.value?.status === 'LIVING'
      ? '当前页面会实时接收主播画面、房间状态和聊天消息。'
      : '当前直播间未开播或已经结束。';
  }

  if (activeRoom.value) {
    return '你的直播间已创建完成，房间状态、观众接入和聊天消息会实时同步。';
  }

  return '点击“我要直播”创建直播间，并开启摄像头或屏幕共享预览。';
});
const placeholderTitle = computed(() => {
  if (isViewerMode.value) {
    return displayedSession.value?.status === 'LIVING' ? '正在等待主播画面接入' : '当前直播未开播';
  }

  return '点击“我要直播”开始创建直播间';
});
const placeholderDescription = computed(() => {
  if (isViewerMode.value) {
    return displayedSession.value?.status === 'LIVING'
      ? '如果未自动接入，可以点击“进入观看”重新发起连接。'
      : '主播结束直播后，房间状态会在这里实时更新。';
  }

  return '完成摄像头或屏幕共享预览后，即可开始直播。';
});

function openStudio() {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录用户账号，再开启直播');
    router.push('/login');
    return;
  }

  studioVisible.value = true;
}

function createPeerConnection() {
  return new RTCPeerConnection(WEBRTC_CONFIG);
}

function formatTime(value?: string | null) {
  if (!value) {
    return '暂无';
  }

  return new Date(value).toLocaleString('zh-CN');
}

function parseSse<T>(event: MessageEvent<string>) {
  return JSON.parse(event.data) as T;
}

function buildApiUrl(path: string, params?: Record<string, string | number | undefined>) {
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');
  const url = new URL(`${apiBase}${path}`, window.location.origin);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function appendLiveMessage(message: LiveMessage) {
  const next = [...liveMessages.value.filter((item) => item.id !== message.id), message];
  next.sort((left, right) => left.id - right.id);
  liveMessages.value = next.slice(-80);
}

function closeRoomEventSource() {
  roomEventSource?.close();
  roomEventSource = null;
}

function closePublisherEventSource() {
  publisherEventSource?.close();
  publisherEventSource = null;
}

function closeViewerEventSource() {
  viewerEventSource?.close();
  viewerEventSource = null;
}

function clearHubPolling() {
  if (hubPollTimer) {
    clearInterval(hubPollTimer);
    hubPollTimer = null;
  }
}

async function attachPreviewStream() {
  await nextTick();
  if (!previewRef.value) {
    return;
  }

  previewRef.value.srcObject = previewStream.value;
  if (previewStream.value) {
    await previewRef.value.play().catch(() => undefined);
  }
}

async function attachViewerStream() {
  await nextTick();
  if (!viewerRef.value) {
    return;
  }

  viewerRef.value.srcObject = remoteStream.value;
  if (remoteStream.value) {
    await viewerRef.value.play().catch(() => undefined);
  }
}

function stopPreviewStream() {
  previewStream.value?.getTracks().forEach((track) => track.stop());
  previewStream.value = null;
  if (previewRef.value) {
    previewRef.value.srcObject = null;
  }
}

function clearRemoteStream() {
  remoteStream.value?.getTracks().forEach((track) => track.stop());
  remoteStream.value = null;
  if (viewerRef.value) {
    viewerRef.value.srcObject = null;
  }
}

function cleanupPublisherPeers() {
  closePublisherEventSource();
  publisherPeers.forEach((peer) => peer.close());
  publisherPeers.clear();
}

function cleanupViewerPeer(notifyServer = true) {
  const roomId = viewerRoomId.value;
  const currentViewerId = viewerId.value;

  closeViewerEventSource();
  viewerPeer.value?.close();
  viewerPeer.value = null;
  viewerRoomId.value = null;
  viewerId.value = null;
  clearRemoteStream();

  if (notifyServer && roomId && currentViewerId) {
    void leaveLiveViewer(roomId, currentViewerId).catch(() => undefined);
  }
}

async function waitForIceGatheringComplete(peer: RTCPeerConnection) {
  if (peer.iceGatheringState === 'complete') {
    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      peer.removeEventListener('icegatheringstatechange', handleChange);
      resolve();
    }, 5000);

    function handleChange() {
      if (peer.iceGatheringState === 'complete') {
        window.clearTimeout(timeout);
        peer.removeEventListener('icegatheringstatechange', handleChange);
        resolve();
      }
    }

    peer.addEventListener('icegatheringstatechange', handleChange);
  });
}

async function requestStream(mode: CaptureMode) {
  if (!navigator.mediaDevices) {
    throw new Error('当前浏览器不支持媒体采集');
  }

  if (mode === 'camera') {
    return navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
  }

  const devices = navigator.mediaDevices as MediaDevices & {
    getDisplayMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
  };

  if (!devices.getDisplayMedia) {
    throw new Error('当前浏览器不支持屏幕共享');
  }

  return devices.getDisplayMedia({
    video: true,
    audio: true,
  });
}

function applySessionUpdate(session: LiveSessionInfo) {
  if (activeRoom.value?.id === session.roomId) {
    liveSession.value = {
      ...liveSession.value,
      ...session,
      title: activeRoom.value.title,
      broadcaster: activeRoom.value.broadcaster,
    };
  } else {
    fetchedSession.value = session;
  }

  if (session.status !== 'LIVING' && viewerRoomId.value === session.roomId) {
    cleanupViewerPeer(false);
  }
}
function openRoomEventSourceFor(roomId: number) {
  closeRoomEventSource();

  roomEventSource = new EventSource(buildApiUrl(`/lives/rooms/${roomId}/events`));
  roomEventSource.addEventListener('snapshot', (event) => {
    const payload = parseSse<RoomSnapshotPayload>(event as MessageEvent<string>);
    applySessionUpdate(payload.session);
    liveMessages.value = payload.messages.slice(-80);
  });
  roomEventSource.addEventListener('session', (event) => {
    applySessionUpdate(parseSse<LiveSessionInfo>(event as MessageEvent<string>));
  });
  roomEventSource.addEventListener('chat-message', (event) => {
    appendLiveMessage(parseSse<LiveMessage>(event as MessageEvent<string>));
  });
  roomEventSource.addEventListener('system-message', (event) => {
    appendLiveMessage(parseSse<LiveMessage>(event as MessageEvent<string>));
  });
}

function handleViewerSignal(peer: RTCPeerConnection, payload: ViewerSignalPayload) {
  if (!payload.answer || viewerPeer.value !== peer || peer.currentRemoteDescription) {
    return;
  }

  void peer.setRemoteDescription(new RTCSessionDescription(payload.answer)).catch(() => undefined);
}

function openViewerEventSourceFor(roomId: number, currentViewerId: number, peer: RTCPeerConnection) {
  closeViewerEventSource();

  viewerEventSource = new EventSource(buildApiUrl(`/lives/rooms/${roomId}/viewers/${currentViewerId}/events`));
  viewerEventSource.addEventListener('snapshot', (event) => {
    handleViewerSignal(peer, parseSse<ViewerSignalPayload>(event as MessageEvent<string>));
  });
  viewerEventSource.addEventListener('viewer-answer', (event) => {
    handleViewerSignal(peer, parseSse<ViewerSignalPayload>(event as MessageEvent<string>));
  });
  viewerEventSource.addEventListener('room-ended', () => {
    cleanupViewerPeer(false);
  });
}

function openPublisherEventSourceFor(roomId: number) {
  closePublisherEventSource();

  if (!token.value) {
    return;
  }

  publisherEventSource = new EventSource(
    buildApiUrl(`/lives/rooms/${roomId}/publisher/events`, {
      token: token.value,
    }),
  );

  publisherEventSource.addEventListener('snapshot', (event) => {
    const payload = parseSse<PublisherSnapshotPayload>(event as MessageEvent<string>);
    payload.pendingViewers.forEach((viewer) => {
      void answerViewer(roomId, viewer);
    });
  });
  publisherEventSource.addEventListener('viewer-offer', (event) => {
    const payload = parseSse<PendingLiveViewer>(event as MessageEvent<string>);
    void answerViewer(roomId, payload);
  });
}

async function handlePreparePreview() {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录用户账号');
    return;
  }

  preparing.value = true;
  try {
    stopPreviewStream();
    const stream = await requestStream(studioForm.mode);
    stream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        if (studioForm.mode === 'screen' && isLive.value) {
          void handleStopLive();
        }
      });
    });
    previewStream.value = stream;
    await attachPreviewStream();
    studioVisible.value = false;
    ElMessage.success(`${sourceModeLabel.value}预览已就绪`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '获取直播画面失败');
  } finally {
    preparing.value = false;
  }
}

async function answerViewer(roomId: number, viewer: PendingLiveViewer) {
  if (!previewStream.value || publisherPeers.has(viewer.viewerId)) {
    return;
  }

  const peer = createPeerConnection();
  publisherPeers.set(viewer.viewerId, peer);

  previewStream.value.getTracks().forEach((track) => {
    peer.addTrack(track, previewStream.value!);
  });

  peer.addEventListener('connectionstatechange', () => {
    if (['closed', 'failed', 'disconnected'].includes(peer.connectionState)) {
      publisherPeers.delete(viewer.viewerId);
      peer.close();
    }
  });

  try {
    await peer.setRemoteDescription(new RTCSessionDescription(viewer.offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    await waitForIceGatheringComplete(peer);

    if (!peer.localDescription) {
      throw new Error('主播应答生成失败');
    }

    await submitLiveViewerAnswer(roomId, viewer.viewerId, {
      type: 'answer',
      sdp: peer.localDescription.sdp ?? '',
    });
  } catch (error) {
    publisherPeers.delete(viewer.viewerId);
    peer.close();
    throw error;
  }
}

async function handleStartLive() {
  if (!previewStream.value) {
    ElMessage.warning('请先准备预览画面');
    return;
  }

  starting.value = true;
  try {
    cleanupPublisherPeers();

    const room = await createLiveRoom({
      title: studioForm.title,
      categoryId: studioForm.categoryId,
      coverUrl: studioForm.coverUrl || undefined,
      sourceMode: studioForm.mode,
    });
    const session = await startLiveRoom(room.id);

    activeRoom.value = room;
    liveSession.value = {
      id: session.sessionId,
      roomId: room.id,
      title: room.title,
      status: session.status,
      playUrl: room.playUrl,
      coverUrl: room.coverUrl,
      sourceMode: room.sourceMode,
      broadcaster: room.broadcaster,
      viewerCount: 0,
      startedAt: new Date().toISOString(),
      endedAt: null,
    };
    fetchedSession.value = null;
    liveMessages.value = [];

    await router.replace(`/live/${room.id}`);
    openPublisherEventSourceFor(room.id);
    void loadHubRooms();
    ElMessage.success('直播已开始，观众可以通过分享地址进入观看');
  } catch {
    ElMessage.error('开启直播失败，请稍后重试');
  } finally {
    starting.value = false;
  }
}

async function handleStopLive() {
  stopping.value = true;
  try {
    if (activeRoom.value && isLive.value) {
      await stopLiveRoom(activeRoom.value.id);
    }
  } catch {
    ElMessage.warning('直播已本地结束，但远端停播状态同步失败');
  } finally {
    cleanupPublisherPeers();
    stopPreviewStream();
    if (liveSession.value) {
      liveSession.value = {
        ...liveSession.value,
        status: 'ENDED',
        endedAt: new Date().toISOString(),
      };
    }
    void loadHubRooms();
    stopping.value = false;
    ElMessage.success('直播已结束');
  }
}
async function ensureViewerConnection(roomId: number) {
  if (joining.value || (viewerPeer.value && viewerRoomId.value === roomId)) {
    return;
  }

  joining.value = true;
  cleanupViewerPeer();
  try {
    const ticket = await createLiveViewer(roomId);
    const peer = createPeerConnection();

    viewerPeer.value = peer;
    viewerRoomId.value = roomId;
    viewerId.value = ticket.viewerId;
    openViewerEventSourceFor(roomId, ticket.viewerId, peer);

    peer.addEventListener('track', (event) => {
      remoteStream.value = event.streams[0];
      void attachViewerStream();
    });

    peer.addEventListener('connectionstatechange', () => {
      if (['closed', 'failed', 'disconnected'].includes(peer.connectionState) && viewerPeer.value === peer) {
        cleanupViewerPeer();
      }
    });

    const offer = await peer.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peer.setLocalDescription(offer);
    await waitForIceGatheringComplete(peer);

    if (!peer.localDescription) {
      throw new Error('观众 offer 生成失败');
    }

    await submitLiveViewerOffer(roomId, ticket.viewerId, {
      type: 'offer',
      sdp: peer.localDescription.sdp ?? '',
    });
  } catch {
    cleanupViewerPeer();
    ElMessage.error('加入直播失败');
  } finally {
    joining.value = false;
  }
}

async function handleJoinViewer() {
  if (!routeRoomId.value) {
    return;
  }

  await ensureViewerConnection(routeRoomId.value);
}

function handleLeaveViewer() {
  cleanupViewerPeer();
  ElMessage.success('已离开直播');
}

async function handleSendMessage() {
  if (!canSendMessage.value || !currentRoomId.value) {
    return;
  }

  const content = chatDraft.value.trim();
  if (!content) {
    ElMessage.warning('请输入聊天内容');
    return;
  }

  sendingMessage.value = true;
  try {
    await createLiveMessage(currentRoomId.value, {
      content,
    });
    chatDraft.value = '';
  } catch {
    ElMessage.error('发送消息失败，请确认已登录且直播中');
  } finally {
    sendingMessage.value = false;
  }
}

async function syncRouteSession() {
  const roomId = routeRoomId.value;
  if (!roomId) {
    fetchedSession.value = null;
    liveMessages.value = [];
    closeRoomEventSource();
    cleanupViewerPeer();
    return;
  }

  try {
    const session = await fetchLiveSession(roomId);
    applySessionUpdate(session);

    if (session.broadcaster?.id === userId.value) {
      activeRoom.value = await fetchLiveRoom(roomId);
      if (session.status === 'LIVING' && previewStream.value) {
        openPublisherEventSourceFor(roomId);
      }
    }

    liveMessages.value = await fetchLiveMessages(roomId);
    openRoomEventSourceFor(roomId);

    if (session.status === 'LIVING' && activeRoom.value?.id !== roomId) {
      await ensureViewerConnection(roomId);
    }

    if (session.status !== 'LIVING' && activeRoom.value?.id !== roomId) {
      cleanupViewerPeer(false);
    }
  } catch {
    fetchedSession.value = null;
    liveMessages.value = [];
    closeRoomEventSource();
    cleanupViewerPeer(false);
  }
}

async function loadHubRooms() {
  try {
    hubRooms.value = await fetchLiveRooms({
      limit: 12,
    });
  } catch {
    hubRooms.value = [];
  }
}

function startHubPolling() {
  clearHubPolling();
  hubPollTimer = setInterval(() => {
    void loadHubRooms();
  }, 5000);
}

watch(previewRef, () => {
  void attachPreviewStream();
});

watch(viewerRef, () => {
  void attachViewerStream();
});

watch(
  () => route.params.id,
  () => {
    if (activeRoom.value && routeRoomId.value !== activeRoom.value.id) {
      closePublisherEventSource();
    }
    void syncRouteSession();
    void loadHubRooms();
  },
);

watch(
  () => [isCurrentHostRoom.value, isLive.value, Boolean(previewStream.value)] as const,
  ([hostRoom, living, hasStream]) => {
    if (hostRoom && living && hasStream && routeRoomId.value) {
      openPublisherEventSourceFor(routeRoomId.value);
      return;
    }

    closePublisherEventSource();
  },
);

onMounted(() => {
  void syncRouteSession();
  void loadHubRooms();
  startHubPolling();
});

onUnmounted(() => {
  closeRoomEventSource();
  closePublisherEventSource();
  clearHubPolling();
  cleanupPublisherPeers();
  cleanupViewerPeer();
  stopPreviewStream();
});
</script>

<style scoped>
.page {
  display: grid;
  gap: 20px;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  padding: 24px 28px;
  border-radius: 20px;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.28), transparent 32%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.94));
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.eyebrow {
  display: inline-block;
  margin-bottom: 8px;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #38bdf8;
}

.hero h1 {
  margin: 0 0 10px;
  font-size: 36px;
}

.hero p {
  margin: 0;
  max-width: 720px;
  color: #cbd5e1;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 2.1fr) minmax(320px, 1fr);
  gap: 20px;
}
.panel,
.player-panel,
.side-panel {
  min-height: 520px;
  padding: 22px;
  border-radius: 18px;
  background: rgba(30, 41, 59, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-head h2,
.panel-block h3,
.hub-head h2 {
  margin: 0 0 8px;
}

.panel-head p,
.hub-head p {
  margin: 0;
  color: #94a3b8;
}

.status-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.pill {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  color: #e2e8f0;
  font-size: 12px;
}

.pill-live {
  background: rgba(239, 68, 68, 0.16);
  color: #fca5a5;
}

.pill-idle {
  background: rgba(34, 197, 94, 0.14);
  color: #86efac;
}

.pill-viewer {
  background: rgba(56, 189, 248, 0.16);
  color: #7dd3fc;
}

.player-shell {
  display: grid;
  place-items: center;
  min-height: 420px;
  border-radius: 18px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(17, 24, 39, 0.96)),
    radial-gradient(circle at center, rgba(56, 189, 248, 0.18), transparent 45%);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.player-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #020617;
}

.player-placeholder {
  display: grid;
  gap: 10px;
  place-items: center;
  text-align: center;
  color: #cbd5e1;
}

.player-placeholder strong {
  font-size: 20px;
}

.control-bar {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.side-panel,
.hub-panel {
  display: grid;
  gap: 18px;
  align-content: start;
}

.panel-block {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.52);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: #cbd5e1;
}

.meta-row span {
  color: #94a3b8;
}

.chat-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.chat-head span {
  color: #94a3b8;
  font-size: 12px;
}

.chat-list {
  display: grid;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 4px;
}

.chat-item {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(30, 41, 59, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.chat-item-system {
  background: rgba(8, 47, 73, 0.72);
  border-color: rgba(56, 189, 248, 0.18);
}

.chat-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #cbd5e1;
  font-size: 12px;
}

.chat-meta span {
  color: #94a3b8;
}

.chat-item p {
  margin: 0;
  color: #e2e8f0;
  line-height: 1.5;
  word-break: break-word;
}

.chat-compose {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.hub-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
}

.feature-list {
  margin: 0;
  padding-left: 18px;
  color: #cbd5e1;
}

@media (max-width: 960px) {
  .hero,
  .panel-head {
    flex-direction: column;
  }

  .layout {
    grid-template-columns: 1fr;
  }

  .chat-compose {
    grid-template-columns: 1fr;
  }
}
</style>
