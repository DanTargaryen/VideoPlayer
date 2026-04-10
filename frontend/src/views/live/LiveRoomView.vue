<template>
  <section class="live-page">
    <header class="hero-panel">
      <div class="hero-copy">
        <span class="eyebrow">Live</span>
        <h1>直播</h1>
        <p>顶部一键开播，下方直接逛直播广场。主播可选择摄像头或屏幕共享，观众进入后可实时观看并发送弹幕。</p>
        <div class="hero-stats">
          <article class="hero-stat">
            <strong>{{ plazaRooms.length }}</strong>
            <span>正在直播</span>
          </article>
          <article class="hero-stat">
            <strong>{{ isLoggedIn ? '已登录' : '游客' }}</strong>
            <span>当前身份</span>
          </article>
          <article class="hero-stat">
            <strong>{{ activeRoom ? '1' : '0' }}</strong>
            <span>我的直播间</span>
          </article>
        </div>
      </div>

      <div class="hero-actions">
        <el-button type="danger" size="large" @click="openStudio">我要直播</el-button>
        <el-button v-if="activeRoom" plain size="large" @click="goToMyRoom">进入我的直播间</el-button>
        <el-button plain size="large" @click="loadHubRooms">刷新广场</el-button>
      </div>
    </header>

    <section v-if="!routeRoomId" class="panel home-studio-panel">
      <div class="section-head">
        <div>
          <span class="section-kicker">Studio</span>
          <h2>我要直播</h2>
          <p>填写标题、封面和直播形式，准备预览后即可开播。</p>
        </div>
        <el-button plain @click="openStudio">填写直播信息</el-button>
      </div>

      <div class="studio-grid">
        <div class="stage-shell preview-shell">
          <video v-if="hasPreview" ref="previewRef" class="stage-video" autoplay muted playsinline />
          <div v-else class="stage-placeholder">
            <strong>还没有准备直播画面</strong>
            <p>点击“我要直播”后选择摄像头或屏幕共享，预览成功后会显示在这里。</p>
          </div>
        </div>

        <aside class="panel-side">
          <section class="side-card">
            <div class="meta-row">
              <span>直播标题</span>
              <strong>{{ studioForm.title || '未填写' }}</strong>
            </div>
            <div class="meta-row">
              <span>直播形式</span>
              <strong>{{ sourceModeLabel }}</strong>
            </div>
            <div class="meta-row">
              <span>主播昵称</span>
              <strong>{{ nickname }}</strong>
            </div>
            <div class="meta-row">
              <span>封面状态</span>
              <strong>{{ studioForm.coverUrl ? '已上传封面' : '未设置封面' }}</strong>
            </div>
          </section>

          <section class="side-card" v-if="studioForm.coverUrl">
            <h3>直播封面</h3>
            <img :src="studioForm.coverUrl" alt="直播封面" class="cover-preview" />
          </section>

          <section class="side-card actions-card">
            <el-button :loading="preparing" @click="handlePreparePreview">准备预览</el-button>
            <el-button type="danger" :loading="starting" :disabled="!hasPreview" @click="handleStartLive">立即开播</el-button>
          </section>
        </aside>
      </div>
    </section>

    <section v-else class="room-layout">
      <section class="panel stage-panel">
        <div class="section-head room-head">
          <div>
            <span class="section-kicker">{{ isViewerMode ? 'Watching' : 'Studio' }}</span>
            <h2>{{ roomTitle }}</h2>
            <p>{{ roomSubtitle }}</p>
          </div>
          <div class="head-tags">
            <span class="tag">{{ sourceModeLabel }}</span>
            <span class="tag tag-live" v-if="isLive">直播中</span>
            <span class="tag tag-ended" v-else-if="displayedSession?.status === 'ENDED'">已结束</span>
            <span class="tag tag-idle" v-else>待开播</span>
            <span v-if="isViewerMode && hasFramePlayback && !hasRemotePlayback" class="tag tag-compat">兼容模式</span>
            <span class="tag">{{ displayedSession?.viewerCount ?? 0 }} 人观看</span>
          </div>
        </div>

        <div class="stage-shell room-stage-shell">
          <video v-if="isViewerMode && hasRemotePlayback" ref="viewerRef" class="stage-video" autoplay playsinline controls />
          <img v-else-if="isViewerMode && hasFramePlayback" class="stage-video" :src="liveFrameUrl" alt="直播兼容画面" />
          <video v-else-if="!isViewerMode && hasPreview" ref="previewRef" class="stage-video" autoplay muted playsinline />
          <video v-else-if="hasReplayPlayback" class="stage-video" :src="displayedReplayUrl" controls playsinline />
          <div v-else class="stage-placeholder">
            <strong>{{ placeholderTitle }}</strong>
            <p>{{ placeholderDescription }}</p>
          </div>

          <div v-if="activeDanmaku.length > 0" class="danmaku-layer">
            <div
              v-for="item in activeDanmaku"
              :key="item.uid"
              class="danmaku-item"
              :style="{ top: `${item.top}px`, animationDuration: `${item.duration}ms` }"
            >
              <span class="danmaku-sender">{{ item.sender }}</span>
              <span>{{ item.content }}</span>
            </div>
          </div>
        </div>
        <div class="control-bar" v-if="!isViewerMode">
          <el-button :loading="preparing" @click="handlePreparePreview">重新准备预览</el-button>
          <el-button type="danger" :loading="starting" :disabled="!hasPreview || isLive" @click="handleStartLive">开始直播</el-button>
          <el-button type="danger" plain :loading="stopping" :disabled="!hasPreview && !isLive" @click="handleStopLive">结束直播</el-button>
          <el-button plain :disabled="!canOpenReplaySaver" @click="openReplaySaver">保存为稿件</el-button>
          <el-button plain :disabled="!recordedBlob" @click="downloadRecording">下载到本地</el-button>
        </div>

        <div class="control-bar" v-else>
          <el-button :loading="joining" :disabled="!canJoinAsViewer" @click="handleJoinViewer">{{ viewerActionText }}</el-button>
          <el-button plain :disabled="!canLeaveViewer" @click="handleLeaveViewer">离开直播</el-button>
        </div>
      </section>

      <aside class="panel side-panel">
        <section class="side-card">
          <div class="meta-row"><span>主播</span><strong>{{ broadcasterName }}</strong></div>
          <div class="meta-row"><span>直播状态</span><strong>{{ statusText }}</strong></div>
          <div class="meta-row"><span>观看人数</span><strong>{{ displayedSession?.viewerCount ?? 0 }}</strong></div>
          <div class="meta-row"><span>开播时间</span><strong>{{ formatTime(displayedSession?.startedAt) }}</strong></div>
          <el-input v-if="shareLink" :model-value="shareLink" readonly>
            <template #prepend>分享链接</template>
          </el-input>
        </section>

        <section class="side-card danmaku-card">
          <div class="section-head compact-head">
            <div>
              <h3>弹幕互动</h3>
              <p>主播和观众都可以发送弹幕</p>
            </div>
            <span class="message-count">{{ liveMessages.length }}</span>
          </div>

          <div v-if="currentRoomId" class="message-list">
            <article v-for="item in liveMessages" :key="item.id" class="message-item" :class="item.kind === 'SYSTEM' ? 'message-item-system' : ''">
              <div class="message-meta">
                <strong>{{ item.sender.nickname }}</strong>
                <span>{{ formatTime(item.createdAt) }}</span>
              </div>
              <p>{{ item.content }}</p>
            </article>
            <el-empty v-if="liveMessages.length === 0" description="直播开始后这里会显示弹幕" />
          </div>
          <el-empty v-else description="进入直播间后可查看弹幕" />

          <div class="message-compose">
            <el-input v-model="chatDraft" :disabled="!canSendMessage" maxlength="200" placeholder="发一条弹幕，按回车发送" @keyup.enter="handleSendMessage" />
            <el-button type="danger" :loading="sendingMessage" :disabled="!canSendMessage" @click="handleSendMessage">发送</el-button>
          </div>
        </section>

        <section v-if="showQuickSaveActions" class="side-card">
          <h3>直播结束后</h3>
          <p class="muted">你可以把本场直播保存为稿件，也可以直接下载到本地。</p>
          <div class="save-actions-inline">
            <el-button plain @click="downloadRecording">下载到本地</el-button>
            <el-button type="danger" :disabled="!canOpenReplaySaver" @click="openReplaySaver">保存为稿件</el-button>
          </div>
        </section>
      </aside>
    </section>

    <section class="panel plaza-panel">
      <div class="section-head">
        <div>
          <span class="section-kicker">Square</span>
          <h2>直播广场</h2>
          <p>按顺序展示当前正在直播中的房间。</p>
        </div>
      </div>

      <div v-if="plazaRooms.length > 0" class="room-grid">
        <LiveRoomCard v-for="room in plazaRooms" :key="room.id" :item="room" />
      </div>
      <el-empty v-else description="当前还没有正在直播中的房间" />
    </section>

    <el-dialog v-model="studioVisible" title="创建直播" width="620px">
      <el-alert v-if="!isLoggedIn" title="请先登录一个普通用户账号，再创建直播。" type="warning" :closable="false" show-icon />
      <el-form :model="studioForm" label-position="top">
        <el-form-item label="直播标题">
          <el-input v-model="studioForm.title" maxlength="60" show-word-limit placeholder="例如：今晚一起做项目复盘" />
        </el-form-item>
        <el-form-item label="直播形式">
          <el-radio-group v-model="studioForm.mode">
            <el-radio-button value="camera">摄像头直播</el-radio-button>
            <el-radio-button value="screen">屏幕共享</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="直播封面">
          <div class="upload-row">
            <el-input v-model="studioForm.coverUrl" placeholder="可直接粘贴封面地址，或上传本地封面" />
            <el-button :loading="uploadingStudioCover" @click="studioCoverInputRef?.click()">上传封面</el-button>
          </div>
          <input ref="studioCoverInputRef" type="file" accept="image/*" class="hidden-input" @change="handleStudioCoverChange" />
          <img v-if="studioForm.coverUrl" :src="studioForm.coverUrl" alt="封面预览" class="dialog-cover-preview" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="studioVisible = false">取消</el-button>
        <el-button type="primary" :loading="preparing" :disabled="!isLoggedIn" @click="handlePreparePreview">准备预览</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="saveReplayVisible" title="保存直播内容" width="680px">
      <div class="replay-dialog-body">
        <video v-if="recordingPreviewUrl" class="dialog-video-preview" :src="recordingPreviewUrl" controls playsinline />
        <el-form :model="replayForm" label-position="top">
          <el-form-item label="稿件标题"><el-input v-model="replayForm.title" maxlength="80" show-word-limit /></el-form-item>
          <el-form-item label="稿件简介"><el-input v-model="replayForm.description" type="textarea" :rows="3" maxlength="300" show-word-limit /></el-form-item>
          <el-form-item label="稿件封面">
            <div class="upload-row">
              <el-input v-model="replayForm.coverUrl" placeholder="默认沿用直播封面，也可以重新上传" />
              <el-button :loading="uploadingReplayCover" @click="replayCoverInputRef?.click()">上传封面</el-button>
            </div>
            <input ref="replayCoverInputRef" type="file" accept="image/*" class="hidden-input" @change="handleReplayCoverChange" />
            <img v-if="replayForm.coverUrl" :src="replayForm.coverUrl" alt="稿件封面预览" class="dialog-cover-preview" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button :disabled="!recordedBlob" @click="downloadRecording">下载到本地</el-button>
        <el-button type="danger" :loading="savingReplay" :disabled="!recordedBlob" @click="handleSaveReplay">保存为稿件</el-button>
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
  fetchLiveFrame,
  fetchLiveMessages,
  fetchLiveRoom,
  fetchLiveRooms,
  fetchLiveSession,
  leaveLiveViewer,
  playLiveRoom,
  publishLiveRoom,
  saveLiveReplay,
  startLiveRoom,
  stopLiveRoom,
  updateLiveFrame,
  uploadVideo,
} from '@/api/platform';
import LiveRoomCard from '@/components/live/LiveRoomCard.vue';
import { useAppStore } from '@/stores/app';
import type { LiveMessage, LiveRoomInfo, LiveSessionInfo } from '@/types/api';

type CaptureMode = 'camera' | 'screen';
type RoomSnapshotPayload = { session: LiveSessionInfo; messages: LiveMessage[] };
type DanmakuOverlayItem = { uid: number; top: number; duration: number; sender: string; content: string };

const WEBRTC_CONFIG: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const { isLoggedIn, nickname, userId } = storeToRefs(appStore);
const studioVisible = ref(false), saveReplayVisible = ref(false), preparing = ref(false), starting = ref(false), joining = ref(false), stopping = ref(false), sendingMessage = ref(false), savingReplay = ref(false), uploadingStudioCover = ref(false), uploadingReplayCover = ref(false);
const previewRef = ref<HTMLVideoElement | null>(null), viewerRef = ref<HTMLVideoElement | null>(null), studioCoverInputRef = ref<HTMLInputElement | null>(null), replayCoverInputRef = ref<HTMLInputElement | null>(null);
const previewStream = ref<MediaStream | null>(null), remoteStream = ref<MediaStream | null>(null), mediaRecorder = ref<MediaRecorder | null>(null), recordedBlob = ref<Blob | null>(null), recordingPreviewUrl = ref(''), liveFrameUrl = ref(''), liveFrameUpdatedAt = ref<string | null>(null);
const activeRoom = ref<LiveRoomInfo | null>(null), liveSession = ref<LiveSessionInfo | null>(null), fetchedSession = ref<LiveSessionInfo | null>(null), hubRooms = ref<LiveRoomInfo[]>([]), liveMessages = ref<LiveMessage[]>([]), activeDanmaku = ref<DanmakuOverlayItem[]>([]), chatDraft = ref('');
const viewerPeer = ref<RTCPeerConnection | null>(null), viewerRoomId = ref<number | null>(null), viewerId = ref<number | null>(null);
const publisherPeers = new Map<number, RTCPeerConnection>(), displayedDanmakuIds = new Set<number>(), danmakuTimers = new Map<number, number>();
let nextDanmakuUid = 1, nextDanmakuTrack = 0, danmakuRoomId: number | null = null, hubPollTimer: ReturnType<typeof setInterval> | null = null, publisherPollTimer: ReturnType<typeof setInterval> | null = null, viewerAnswerPollTimer: ReturnType<typeof setInterval> | null = null, framePublishTimer: ReturnType<typeof setInterval> | null = null, framePollTimer: ReturnType<typeof setInterval> | null = null, roomEventSource: EventSource | null = null, publisherEventSource: EventSource | null = null, viewerEventSource: EventSource | null = null, recordedChunks: Blob[] = [];
let frameCanvas: HTMLCanvasElement | null = null, frameUploading = false, viewerCompatNotifiedRoomId: number | null = null;

const studioForm = reactive({ title: '一起聊聊今天的内容', coverUrl: '', mode: 'camera' as CaptureMode });
const replayForm = reactive({ title: '', description: '', coverUrl: '' });

const routeRoomId = computed<number | null>(() => { const id = Number(route.params.id); return Number.isFinite(id) && id > 0 ? id : null; });
const displayedSession = computed(() => liveSession.value ?? fetchedSession.value);
const currentRoomId = computed(() => routeRoomId.value ?? activeRoom.value?.id ?? null);
const isCurrentHostRoom = computed(() => Boolean(activeRoom.value && routeRoomId.value === activeRoom.value.id));
const isViewerMode = computed(() => Boolean(routeRoomId.value && !isCurrentHostRoom.value));
const hasPreview = computed(() => Boolean(previewStream.value));
const hasRemotePlayback = computed(() => Boolean(remoteStream.value && remoteStream.value.getTracks().length > 0));
const hasFramePlayback = computed(() => Boolean(liveFrameUrl.value));
const displayedReplayUrl = computed(() => recordingPreviewUrl.value || activeRoom.value?.replayUrl || displayedSession.value?.replayUrl || '');
const hasReplayPlayback = computed(() => Boolean(displayedReplayUrl.value));
const isLive = computed(() => displayedSession.value?.status === 'LIVING');
const canJoinAsViewer = computed(() => isViewerMode.value && displayedSession.value?.status === 'LIVING');
const canLeaveViewer = computed(() => Boolean(isViewerMode.value && (viewerRoomId.value || hasRemotePlayback.value || hasFramePlayback.value)));
const canSendMessage = computed(() => Boolean(routeRoomId.value && isLoggedIn.value && displayedSession.value?.status === 'LIVING'));
const canOpenReplaySaver = computed(() => Boolean(activeRoom.value && recordedBlob.value && displayedSession.value?.status !== 'LIVING'));
const activeSourceMode = computed(() => activeRoom.value?.sourceMode ?? displayedSession.value?.sourceMode ?? studioForm.mode);
const sourceModeLabel = computed(() => (activeSourceMode.value === 'screen' ? '屏幕共享直播' : '摄像头直播'));
const shareLink = computed(() => currentRoomId.value && typeof window !== 'undefined' ? `${window.location.origin}/live/${currentRoomId.value}` : '');
const plazaRooms = computed(() => hubRooms.value.filter((room) => room.id !== routeRoomId.value));
const broadcasterName = computed(() => activeRoom.value?.broadcaster?.nickname ?? displayedSession.value?.broadcaster?.nickname ?? nickname.value);
const roomTitle = computed(() => displayedSession.value?.title ?? activeRoom.value?.title ?? '直播间');
const roomSubtitle = computed(() => isViewerMode.value ? (hasRemotePlayback.value ? '正在接收主播画面与实时弹幕。' : hasFramePlayback.value ? '当前处于兼容模式观看，画面会以高频截图方式持续更新。' : isLive.value ? '正在尝试接入主播画面。' : '当前直播未开始或已经结束。') : (isLive.value ? '你的直播已经对外展示，观众端会优先使用 RTC，失败时自动切换兼容模式。' : '这是你的开播控制台。'));
const statusText = computed(() => displayedSession.value?.status === 'LIVING' ? '直播中' : displayedSession.value?.status === 'ENDED' ? '已结束' : '待开播');
const placeholderTitle = computed(() => isViewerMode.value ? (displayedSession.value?.status === 'LIVING' ? '正在等待主播画面接入' : '当前直播未开播') : '请先准备直播预览');
const placeholderDescription = computed(() => isViewerMode.value ? (displayedSession.value?.status === 'LIVING' ? '页面会先尝试 RTC，若失败将自动切换为兼容画面模式。' : '主播结束后，你仍然可以在右侧查看弹幕记录。') : '完成摄像头或屏幕共享预览后，即可开始直播。');
const showQuickSaveActions = computed(() => Boolean(isCurrentHostRoom.value && recordedBlob.value && displayedSession.value?.status === 'ENDED'));
const viewerActionText = computed(() => hasRemotePlayback.value ? '重新连接 RTC' : hasFramePlayback.value ? '刷新连接' : '进入观看');

const openStudio = () => { if (!isLoggedIn.value) { ElMessage.warning('请先登录用户账号'); router.push('/login'); return; } studioVisible.value = true; };
const goToMyRoom = () => { if (activeRoom.value) void router.push(`/live/${activeRoom.value.id}`); };
const createPeerConnection = () => new RTCPeerConnection(WEBRTC_CONFIG);
const formatTime = (value?: string | null) => value ? new Date(value).toLocaleString('zh-CN') : '暂无';
const parseSse = <T,>(event: MessageEvent<string>) => JSON.parse(event.data) as T;
function buildApiUrl(path: string, params?: Record<string, string | number | undefined>) { const apiBase = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, ''); const url = new URL(`${apiBase}${path}`, window.location.origin); Object.entries(params ?? {}).forEach(([key, value]) => { if (value !== undefined && value !== '') url.searchParams.set(key, String(value)); }); return url.toString(); }
function resetDanmaku(roomId: number | null) { danmakuRoomId = roomId; activeDanmaku.value = []; displayedDanmakuIds.clear(); nextDanmakuTrack = 0; danmakuTimers.forEach((timer) => window.clearTimeout(timer)); danmakuTimers.clear(); }
function pushDanmaku(message: LiveMessage) { if (!routeRoomId.value || danmakuRoomId !== routeRoomId.value || message.kind !== 'CHAT' || displayedDanmakuIds.has(message.id)) return; displayedDanmakuIds.add(message.id); const track = nextDanmakuTrack % 6; nextDanmakuTrack += 1; const item = { uid: nextDanmakuUid++, top: 18 + track * 42, duration: 9000 + track * 350, sender: message.sender.nickname, content: message.content }; activeDanmaku.value = [...activeDanmaku.value, item].slice(-18); const timer = window.setTimeout(() => { activeDanmaku.value = activeDanmaku.value.filter((entry) => entry.uid !== item.uid); danmakuTimers.delete(item.uid); }, item.duration); danmakuTimers.set(item.uid, timer); }
const seedDanmaku = (messages: LiveMessage[]) => messages.filter((item) => item.kind === 'CHAT').slice(-4).forEach((item) => pushDanmaku(item));
function appendLiveMessage(message: LiveMessage) { const next = [...liveMessages.value.filter((item) => item.id !== message.id), message]; next.sort((left, right) => left.id - right.id); liveMessages.value = next.slice(-80); pushDanmaku(message); }
const closeRoomEventSource = () => { roomEventSource?.close(); roomEventSource = null; };
const closePublisherEventSource = () => { publisherEventSource?.close(); publisherEventSource = null; };
const closeViewerEventSource = () => { viewerEventSource?.close(); viewerEventSource = null; };
const clearHubPolling = () => { if (hubPollTimer) { clearInterval(hubPollTimer); hubPollTimer = null; } };
const stopPublisherPolling = () => { if (publisherPollTimer) { clearInterval(publisherPollTimer); publisherPollTimer = null; } };
const stopViewerAnswerPolling = () => { if (viewerAnswerPollTimer) { clearInterval(viewerAnswerPollTimer); viewerAnswerPollTimer = null; } };
const stopFramePublishing = () => { if (framePublishTimer) { clearInterval(framePublishTimer); framePublishTimer = null; } frameUploading = false; };
const stopFramePolling = (clearFrame = false) => { if (framePollTimer) { clearInterval(framePollTimer); framePollTimer = null; } if (clearFrame) { liveFrameUrl.value = ''; liveFrameUpdatedAt.value = null; } };
function applyLiveFrame(image: string | null, updatedAt: string | null) { if (!image) return; if (liveFrameUpdatedAt.value === updatedAt && liveFrameUrl.value === image) return; liveFrameUrl.value = image; liveFrameUpdatedAt.value = updatedAt; }
function ensureFrameCanvas() { if (!frameCanvas) frameCanvas = document.createElement('canvas'); return frameCanvas; }
function capturePreviewFrame() { const video = previewRef.value; if (!video || !previewStream.value || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null; const canvas = ensureFrameCanvas(); const targetWidth = Math.min(720, video.videoWidth); const scale = targetWidth / video.videoWidth; const width = Math.max(1, Math.round(video.videoWidth * scale)); const height = Math.max(1, Math.round(video.videoHeight * scale)); canvas.width = width; canvas.height = height; const context = canvas.getContext('2d'); if (!context) return null; context.drawImage(video, 0, 0, width, height); return canvas.toDataURL('image/jpeg', 0.58); }
async function publishCurrentFrame(roomId: number) { if (frameUploading || !isLive.value || activeRoom.value?.id !== roomId) return; const image = capturePreviewFrame(); if (!image) return; frameUploading = true; try { const frame = await updateLiveFrame(roomId, { image }); applyLiveFrame(frame.image, frame.updatedAt); } catch { } finally { frameUploading = false; } }
function startFramePublishing(roomId: number) { stopFramePublishing(); void publishCurrentFrame(roomId); framePublishTimer = setInterval(() => { void publishCurrentFrame(roomId); }, 700); }
async function pullLatestFrame(roomId: number) { try { const frame = await fetchLiveFrame(roomId); applyLiveFrame(frame.image, frame.updatedAt); } catch { } }
function startFramePolling(roomId: number) { stopFramePolling(true); void pullLatestFrame(roomId); framePollTimer = setInterval(() => { if (routeRoomId.value === roomId && displayedSession.value?.status === 'LIVING') void pullLatestFrame(roomId); }, 800); }
async function attachPreviewStream() { await nextTick(); if (!previewRef.value) return; previewRef.value.srcObject = previewStream.value; if (previewStream.value) await previewRef.value.play().catch(() => undefined); }
async function attachViewerStream() { await nextTick(); if (!viewerRef.value) return; viewerRef.value.srcObject = remoteStream.value; if (remoteStream.value) await viewerRef.value.play().catch(() => undefined); }
function stopPreviewStream() { previewStream.value?.getTracks().forEach((track) => track.stop()); previewStream.value = null; if (previewRef.value) previewRef.value.srcObject = null; }
function clearRemoteStream() { remoteStream.value?.getTracks().forEach((track) => track.stop()); remoteStream.value = null; if (viewerRef.value) viewerRef.value.srcObject = null; }
function clearRecordingPreviewUrl() { if (recordingPreviewUrl.value) { URL.revokeObjectURL(recordingPreviewUrl.value); recordingPreviewUrl.value = ''; } }
function resetRecordedContent() { clearRecordingPreviewUrl(); recordedBlob.value = null; recordedChunks = []; }
function cleanupPublisherPeers() { closePublisherEventSource(); stopPublisherPolling(); publisherPeers.forEach((peer) => peer.close()); publisherPeers.clear(); }
function cleanupViewerPeer(notifyServer = true) { const roomId = viewerRoomId.value; const currentViewerId = viewerId.value; closeViewerEventSource(); stopViewerAnswerPolling(); viewerPeer.value?.close(); viewerPeer.value = null; viewerRoomId.value = null; viewerId.value = null; clearRemoteStream(); if (notifyServer && roomId && currentViewerId) void leaveLiveViewer(roomId, currentViewerId).catch(() => undefined); }
async function waitForIceGatheringComplete(peer: RTCPeerConnection) { if (peer.iceGatheringState === 'complete') return; await new Promise<void>((resolve) => { const timeout = window.setTimeout(() => { peer.removeEventListener('icegatheringstatechange', handleChange); resolve(); }, 5000); function handleChange() { if (peer.iceGatheringState === 'complete') { window.clearTimeout(timeout); peer.removeEventListener('icegatheringstatechange', handleChange); resolve(); } } peer.addEventListener('icegatheringstatechange', handleChange); }); }
const getRecordingMimeType = () => typeof MediaRecorder === 'undefined' ? '' : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((item) => MediaRecorder.isTypeSupported(item)) ?? '';
function startLocalRecording() { if (!previewStream.value || typeof MediaRecorder === 'undefined') return; recordedChunks = []; const mimeType = getRecordingMimeType(); const recorder = mimeType ? new MediaRecorder(previewStream.value, { mimeType }) : new MediaRecorder(previewStream.value); recorder.addEventListener('dataavailable', (event) => { if (event.data && event.data.size > 0) recordedChunks.push(event.data); }); recorder.addEventListener('stop', () => { if (recordedChunks.length === 0) return; clearRecordingPreviewUrl(); recordedBlob.value = new Blob(recordedChunks, { type: recorder.mimeType || 'video/webm' }); recordingPreviewUrl.value = URL.createObjectURL(recordedBlob.value); }); mediaRecorder.value = recorder; recorder.start(1000); }
async function stopLocalRecording() { const recorder = mediaRecorder.value; if (!recorder || recorder.state === 'inactive') { mediaRecorder.value = null; return; } await new Promise<void>((resolve) => { const finalize = () => { recorder.removeEventListener('stop', finalize); mediaRecorder.value = null; resolve(); }; recorder.addEventListener('stop', finalize); recorder.stop(); }); }
async function requestStream(mode: CaptureMode) { if (!navigator.mediaDevices) throw new Error('当前浏览器不支持媒体采集'); if (mode === 'camera') return navigator.mediaDevices.getUserMedia({ video: true, audio: true }); const devices = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream> }; if (!devices.getDisplayMedia) throw new Error('当前浏览器不支持屏幕共享'); return devices.getDisplayMedia({ video: true, audio: true }); }
function applySessionUpdate(session: LiveSessionInfo) { if (activeRoom.value?.id === session.roomId) { liveSession.value = { ...liveSession.value, ...session, title: activeRoom.value.title, broadcaster: activeRoom.value.broadcaster }; } else { fetchedSession.value = session; } if (session.status === 'LIVING' && routeRoomId.value === session.roomId && activeRoom.value?.id !== session.roomId) { startFramePolling(session.roomId); void ensureViewerConnection(session.roomId, true); return; } if (session.status !== 'LIVING') { if (viewerRoomId.value === session.roomId) cleanupViewerPeer(false); if (routeRoomId.value === session.roomId && activeRoom.value?.id !== session.roomId) stopFramePolling(true); } }
function openRoomEventSourceFor(roomId: number) { closeRoomEventSource(); roomEventSource = new EventSource(buildApiUrl(`/lives/rooms/${roomId}/events`)); roomEventSource.addEventListener('snapshot', (event) => { const payload = parseSse<RoomSnapshotPayload>(event as MessageEvent<string>); applySessionUpdate(payload.session); liveMessages.value = payload.messages.slice(-80); if (danmakuRoomId !== roomId) resetDanmaku(roomId); seedDanmaku(payload.messages); }); roomEventSource.addEventListener('session', (event) => applySessionUpdate(parseSse<LiveSessionInfo>(event as MessageEvent<string>))); roomEventSource.addEventListener('chat-message', (event) => appendLiveMessage(parseSse<LiveMessage>(event as MessageEvent<string>))); roomEventSource.addEventListener('system-message', (event) => appendLiveMessage(parseSse<LiveMessage>(event as MessageEvent<string>))); }
async function startPublisherTransport(roomId: number) { if (!previewStream.value) throw new Error('预览流不存在'); const peer = createPeerConnection(); publisherPeers.set(0, peer); previewStream.value.getTracks().forEach((track) => peer.addTrack(track, previewStream.value!)); peer.addEventListener('connectionstatechange', () => { if (['closed', 'failed', 'disconnected'].includes(peer.connectionState)) { publisherPeers.delete(0); peer.close(); } }); const offer = await peer.createOffer(); await peer.setLocalDescription(offer); await waitForIceGatheringComplete(peer); if (!peer.localDescription) throw new Error('主播 offer 生成失败'); const answer = await publishLiveRoom(roomId, { type: 'offer', sdp: peer.localDescription.sdp ?? '' }); await peer.setRemoteDescription(new RTCSessionDescription(answer)); }
async function handlePreparePreview() { if (!isLoggedIn.value) { ElMessage.warning('请先登录用户账号'); return; } preparing.value = true; try { stopPreviewStream(); const stream = await requestStream(studioForm.mode); stream.getVideoTracks().forEach((track) => track.addEventListener('ended', () => { if (studioForm.mode === 'screen' && isLive.value) void handleStopLive(); })); previewStream.value = stream; await attachPreviewStream(); studioVisible.value = false; ElMessage.success(`${sourceModeLabel.value}预览已就绪`); } catch (error) { ElMessage.error(error instanceof Error ? error.message : '获取直播画面失败'); } finally { preparing.value = false; } }
async function handleStartLive() { if (!previewStream.value) { ElMessage.warning('请先准备预览画面'); return; } starting.value = true; try { cleanupPublisherPeers(); stopFramePublishing(); resetRecordedContent(); saveReplayVisible.value = false; const room = await createLiveRoom({ title: studioForm.title, coverUrl: studioForm.coverUrl || undefined, sourceMode: studioForm.mode }); const session = await startLiveRoom(room.id); let rtcReady = true; try { await startPublisherTransport(room.id); } catch { rtcReady = false; cleanupPublisherPeers(); } activeRoom.value = room; liveSession.value = { id: session.sessionId, roomId: room.id, title: room.title, status: session.status, playUrl: room.playUrl, coverUrl: room.coverUrl, sourceMode: room.sourceMode, broadcaster: room.broadcaster, viewerCount: 0, startedAt: new Date().toISOString(), endedAt: null }; fetchedSession.value = null; liveMessages.value = []; resetDanmaku(room.id); await router.replace(`/live/${room.id}`); startLocalRecording(); startFramePublishing(room.id); await loadHubRooms(); ElMessage[rtcReady ? 'success' : 'warning'](rtcReady ? '直播已开始，观众已可进入观看。' : '直播已开始，RTC 未连通，已自动切换为兼容模式直播。'); } catch (error) { cleanupPublisherPeers(); stopFramePublishing(); ElMessage.error(error instanceof Error ? error.message : '开启直播失败'); } finally { starting.value = false; } }
async function handleStopLive() { stopping.value = true; try { if (activeRoom.value && isLive.value) await stopLiveRoom(activeRoom.value.id); await stopLocalRecording(); } catch { ElMessage.warning('直播已结束，但远端状态同步失败'); } finally { cleanupPublisherPeers(); stopFramePublishing(); stopPreviewStream(); if (liveSession.value) liveSession.value = { ...liveSession.value, status: 'ENDED', endedAt: new Date().toISOString() }; void loadHubRooms(); stopping.value = false; if (recordedBlob.value) { prepareReplayForm(); saveReplayVisible.value = true; } ElMessage.success('直播已结束'); } }
async function ensureViewerConnection(roomId: number, silentFallback = false) { if (joining.value || (viewerRoomId.value === roomId && (viewerPeer.value || viewerId.value))) return; joining.value = true; cleanupViewerPeer(); startFramePolling(roomId); try { const ticket = await createLiveViewer(roomId); const peer = createPeerConnection(); const inboundStream = new MediaStream(); viewerPeer.value = peer; viewerRoomId.value = roomId; viewerId.value = ticket.viewerId; peer.addTransceiver('video', { direction: 'recvonly' }); peer.addTransceiver('audio', { direction: 'recvonly' }); peer.addEventListener('track', (event) => { const incomingTrack = event.track; if (!inboundStream.getTracks().some((track) => track.id === incomingTrack.id)) inboundStream.addTrack(incomingTrack); remoteStream.value = inboundStream; void attachViewerStream(); }); peer.addEventListener('connectionstatechange', () => { if (['closed', 'failed', 'disconnected'].includes(peer.connectionState) && viewerPeer.value === peer) { viewerPeer.value = null; clearRemoteStream(); } }); const offer = await peer.createOffer(); await peer.setLocalDescription(offer); await waitForIceGatheringComplete(peer); if (!peer.localDescription) throw new Error('观众 offer 生成失败'); const answer = await playLiveRoom(roomId, { type: 'offer', sdp: peer.localDescription.sdp ?? '' }); await peer.setRemoteDescription(new RTCSessionDescription(answer)); } catch { viewerPeer.value?.close(); viewerPeer.value = null; clearRemoteStream(); if (!silentFallback && viewerCompatNotifiedRoomId !== roomId) { viewerCompatNotifiedRoomId = roomId; ElMessage.warning('RTC 观看链路未连通，已自动切换为兼容模式画面。'); } } finally { joining.value = false; } }
const handleJoinViewer = async () => { if (routeRoomId.value) { viewerCompatNotifiedRoomId = null; await ensureViewerConnection(routeRoomId.value); } };
const handleLeaveViewer = () => { cleanupViewerPeer(); stopFramePolling(true); ElMessage.success('已离开直播'); };
function prepareReplayForm() { replayForm.title = `${activeRoom.value?.title ?? '直播内容'} 回放`; replayForm.description = activeRoom.value ? `直播回放：${activeRoom.value.title}` : '直播回放'; replayForm.coverUrl = activeRoom.value?.coverUrl ?? studioForm.coverUrl ?? ''; }
const openReplaySaver = () => { if (canOpenReplaySaver.value) { prepareReplayForm(); saveReplayVisible.value = true; } };
function applyReplayResult(payload: { replayUrl: string; replayVideoId: number | null }) { if (activeRoom.value) activeRoom.value = { ...activeRoom.value, replayUrl: payload.replayUrl, replayVideoId: payload.replayVideoId }; if (liveSession.value) liveSession.value = { ...liveSession.value, replayUrl: payload.replayUrl, replayVideoId: payload.replayVideoId }; if (fetchedSession.value) fetchedSession.value = { ...fetchedSession.value, replayUrl: payload.replayUrl, replayVideoId: payload.replayVideoId }; }
const sanitizeFileName = (value: string) => value.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'live-recording';
function downloadRecording() { if (!recordedBlob.value) { ElMessage.warning('当前没有可下载的录播文件'); return; } const url = URL.createObjectURL(recordedBlob.value); const link = document.createElement('a'); link.href = url; link.download = `${sanitizeFileName(activeRoom.value?.title ?? roomTitle.value)}-${Date.now()}.webm`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function handleSaveReplay() { if (!recordedBlob.value || !activeRoom.value) return; savingReplay.value = true; try { const safeTitle = replayForm.title.trim() || `${activeRoom.value.title} 回放`; const file = new File([recordedBlob.value], `live-recording-${Date.now()}.webm`, { type: recordedBlob.value.type || 'video/webm' }); const uploaded = await uploadVideo(file, 'RECORDING'); const replay = await saveLiveReplay(activeRoom.value.id, { saveMode: 'UPLOAD', assetId: uploaded.assetId, uploadToken: uploaded.uploadToken, title: safeTitle, description: replayForm.description, coverUrl: replayForm.coverUrl || activeRoom.value.coverUrl }); applyReplayResult(replay); saveReplayVisible.value = false; ElMessage.success('录播已保存为稿件，可在创作中心继续编辑'); } catch { ElMessage.error('保存稿件失败，请稍后重试'); } finally { savingReplay.value = false; } }
async function handleSendMessage() { if (!canSendMessage.value || !currentRoomId.value) return; const content = chatDraft.value.trim(); if (!content) { ElMessage.warning('请输入弹幕内容'); return; } sendingMessage.value = true; try { await createLiveMessage(currentRoomId.value, { content }); chatDraft.value = ''; } catch { ElMessage.error('发送弹幕失败，请确认已登录且直播中'); } finally { sendingMessage.value = false; } }
async function handleStudioCoverChange(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = ''; if (!file) return; uploadingStudioCover.value = true; try { const uploaded = await uploadVideo(file, 'COVER'); studioForm.coverUrl = uploaded.url; ElMessage.success('直播封面上传成功'); } catch { ElMessage.error('直播封面上传失败'); } finally { uploadingStudioCover.value = false; } }
async function handleReplayCoverChange(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = ''; if (!file) return; uploadingReplayCover.value = true; try { const uploaded = await uploadVideo(file, 'COVER'); replayForm.coverUrl = uploaded.url; ElMessage.success('稿件封面上传成功'); } catch { ElMessage.error('稿件封面上传失败'); } finally { uploadingReplayCover.value = false; } }
async function syncRouteSession() { const roomId = routeRoomId.value; if (!roomId) { fetchedSession.value = null; liveMessages.value = []; closeRoomEventSource(); cleanupViewerPeer(); stopFramePolling(true); resetDanmaku(null); return; } try { const session = await fetchLiveSession(roomId); applySessionUpdate(session); if (session.broadcaster?.id === userId.value) activeRoom.value = await fetchLiveRoom(roomId); const messages = await fetchLiveMessages(roomId); liveMessages.value = messages; resetDanmaku(roomId); seedDanmaku(messages); openRoomEventSourceFor(roomId); if (session.status === 'LIVING' && activeRoom.value?.id !== roomId) { startFramePolling(roomId); await ensureViewerConnection(roomId, true); } if (session.status !== 'LIVING' && activeRoom.value?.id !== roomId) { cleanupViewerPeer(false); stopFramePolling(true); } } catch { fetchedSession.value = null; liveMessages.value = []; closeRoomEventSource(); cleanupViewerPeer(false); stopFramePolling(true); resetDanmaku(null); } }
async function loadHubRooms() { try { hubRooms.value = await fetchLiveRooms({ status: 'LIVING', limit: 18 }); } catch { hubRooms.value = []; } }
function startHubPolling() { clearHubPolling(); hubPollTimer = setInterval(() => { void loadHubRooms(); }, 5000); }
watch(previewRef, () => { void attachPreviewStream(); });
watch(viewerRef, () => { void attachViewerStream(); });
watch(() => route.params.id, () => { if (activeRoom.value && routeRoomId.value !== activeRoom.value.id) closePublisherEventSource(); void syncRouteSession(); void loadHubRooms(); });
watch(() => [isCurrentHostRoom.value, isLive.value, Boolean(previewStream.value)] as const, () => undefined);
onMounted(() => { void syncRouteSession(); void loadHubRooms(); startHubPolling(); });
onUnmounted(() => { closeRoomEventSource(); closePublisherEventSource(); closeViewerEventSource(); clearHubPolling(); stopPublisherPolling(); stopViewerAnswerPolling(); stopFramePublishing(); stopFramePolling(true); cleanupPublisherPeers(); cleanupViewerPeer(); void stopLocalRecording(); stopPreviewStream(); clearRecordingPreviewUrl(); resetDanmaku(null); });
</script>
<style scoped>
.live-page { display: grid; gap: 24px; }
.panel { border-radius: 28px; background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,250,252,.98)); border: 1px solid rgba(15,23,42,.08); box-shadow: 0 24px 60px rgba(15,23,42,.08); }
.hero-panel { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding: 34px 36px; border-radius: 32px; background: radial-gradient(circle at top left, rgba(253,186,116,.42), transparent 28%), radial-gradient(circle at right center, rgba(251,113,133,.22), transparent 30%), linear-gradient(135deg, #fff7ed, #ffffff 40%, #fdf2f8 100%); border: 1px solid rgba(251,113,133,.18); }
.eyebrow, .section-kicker { display: inline-block; margin-bottom: 10px; padding: 6px 10px; border-radius: 999px; background: rgba(251,113,133,.12); color: #e11d48; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; }
.hero-copy h1, .section-head h2, .room-head h2 { margin: 0; color: #111827; }
.hero-copy p, .section-head p, .compact-head p, .muted { margin: 10px 0 0; color: #4b5563; line-height: 1.75; }
.hero-stats { display: flex; gap: 14px; margin-top: 24px; flex-wrap: wrap; }
.hero-stat { min-width: 120px; padding: 16px 18px; border-radius: 20px; background: rgba(255,255,255,.9); border: 1px solid rgba(15,23,42,.06); }
.hero-stat strong { display: block; color: #111827; font-size: 24px; }
.hero-stat span { color: #6b7280; font-size: 13px; }
.hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.home-studio-panel, .plaza-panel, .stage-panel, .side-panel { padding: 28px; }
.section-head, .compact-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.section-head h2, .compact-head h3 { margin: 0; }
.studio-grid, .room-layout { display: grid; gap: 20px; grid-template-columns: minmax(0,2fr) minmax(320px,.95fr); }
.stage-shell { position: relative; overflow: hidden; border-radius: 26px; min-height: 420px; background: radial-gradient(circle at top left, rgba(251,113,133,.24), transparent 28%), linear-gradient(135deg, #111827, #0f172a); }
.stage-video { width: 100%; height: 100%; min-height: 420px; object-fit: cover; background: #111827; }
.stage-placeholder { display: grid; place-items: center; gap: 10px; height: 100%; padding: 32px; color: rgba(255,255,255,.88); text-align: center; }
.preview-shell { min-height: 440px; }
.panel-side, .side-panel { display: grid; gap: 16px; align-content: start; }
.side-card { display: grid; gap: 12px; padding: 18px; border-radius: 22px; background: rgba(15,23,42,.03); border: 1px solid rgba(15,23,42,.06); }
.meta-row { display: flex; justify-content: space-between; gap: 12px; color: #111827; }
.meta-row span { color: #6b7280; }
.cover-preview, .dialog-cover-preview, .dialog-video-preview { width: 100%; border-radius: 18px; object-fit: cover; }
.cover-preview, .dialog-cover-preview { max-height: 180px; }
.dialog-video-preview { max-height: 260px; background: #111827; }
.room-head { margin-bottom: 18px; }
.head-tags { display: flex; gap: 10px; flex-wrap: wrap; }
.tag { padding: 8px 14px; border-radius: 999px; background: rgba(15,23,42,.06); color: #334155; font-size: 13px; }
.tag-live { background: rgba(239,68,68,.14); color: #dc2626; }
.tag-ended { background: rgba(100,116,139,.14); color: #475569; }
.tag-idle { background: rgba(59,130,246,.14); color: #2563eb; }
.tag-compat { background: rgba(245,158,11,.16); color: #b45309; }
.room-stage-shell { min-height: 520px; }
.danmaku-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.danmaku-item { position: absolute; right: -120%; display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; background: rgba(17,24,39,.68); color: #fff; white-space: nowrap; box-shadow: 0 10px 28px rgba(0,0,0,.22); animation-name: danmaku-fly; animation-timing-function: linear; animation-fill-mode: forwards; }
.danmaku-sender { color: #fda4af; font-weight: 700; }
.control-bar { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 18px; }
.message-count { display: inline-grid; place-items: center; min-width: 36px; height: 36px; padding: 0 12px; border-radius: 999px; background: rgba(239,68,68,.1); color: #dc2626; font-weight: 700; }
.message-list { display: grid; gap: 10px; max-height: 400px; overflow-y: auto; padding-right: 4px; }
.message-item { display: grid; gap: 8px; padding: 12px 14px; border-radius: 18px; background: #fff; border: 1px solid rgba(15,23,42,.05); }
.message-item-system { background: rgba(239,68,68,.06); border-color: rgba(239,68,68,.12); }
.message-meta { display: flex; justify-content: space-between; gap: 12px; color: #111827; font-size: 12px; }
.message-meta span { color: #6b7280; }
.message-item p { margin: 0; color: #374151; line-height: 1.6; word-break: break-word; }
.message-compose, .upload-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; }
.save-actions-inline { display: flex; gap: 12px; flex-wrap: wrap; }
.room-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px,1fr)); gap: 18px; }
.replay-dialog-body { display: grid; gap: 18px; }
.hidden-input { display: none; }
@keyframes danmaku-fly { from { transform: translateX(0); } to { transform: translateX(calc(-100vw - 360px)); } }
@media (max-width: 1080px) { .hero-panel, .section-head, .compact-head { flex-direction: column; } .studio-grid, .room-layout { grid-template-columns: 1fr; } }
@media (max-width: 720px) { .hero-panel, .home-studio-panel, .plaza-panel, .stage-panel, .side-panel { padding: 20px; } .message-compose, .upload-row { grid-template-columns: 1fr; } }
</style>
