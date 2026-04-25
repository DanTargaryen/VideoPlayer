<template>
  <section class="page" v-loading="loading">
    <div class="top-layout" v-if="video">
      <div class="main-column">
        <h1 class="video-title">{{ video.title }}</h1>

        <div class="player-section">
          <div class="player-wrapper">
            <video
              v-if="video?.playUrl"
              ref="videoRef"
              class="video"
              controls
              :src="video.playUrl"
              @timeupdate="onTimeUpdate"
              @loadedmetadata="onLoadedMetadata"
              @play="onVideoPlay"
              @pause="onVideoPause"
              @ended="handleVideoEnded"
            ></video>
            <span v-else>视频播放器占位</span>
            <DanmakuOverlay
              v-if="video?.playUrl"
              :danmakus="danmakus"
              :current-time-ms="currentVideoTimeMs"
              :duration-ms="videoDurationMs"
              :visible="danmakuVisible"
              :paused="videoPaused"
              :liked-ids="likedDanmakuIds"
              @report="openReportDialog"
              @like="toggleDanmakuLike"
            />
          </div>

          <div class="danmaku-bar" v-if="video?.playUrl">
            <el-switch v-model="danmakuVisible" active-text="弹幕" inactive-text="关" size="small" />
            <el-input
              v-model="danmakuForm.content"
              placeholder="输入弹幕内容"
              @keyup.enter="submitDanmaku"
              style="flex: 1"
            />
            <span class="time-badge">{{ formatMs(currentVideoTimeMs) }}</span>
            <el-button type="primary" size="small" @click="submitDanmaku">发送</el-button>
          </div>
        </div>

        <div class="action-bar">
          <div class="action-left">
            <button class="action-icon-btn" :class="{ active: video.isLiked }" @click="toggleLikeAction">
              <svg class="action-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 22V11L10.5 3.5C10.78 2.87 11.41 2.5 12.1 2.5C13.1 2.5 13.85 3.42 13.65 4.4L12.8 9H20c1.1 0 2 0.9 2 2v1c0 .15-.02.3-.05.44l-2.19 8C19.5 21.35 18.68 22 17.73 22H7ZM7 13v8M3 22h2V11H3v11Z" fill="currentColor"/>
              </svg>
              <span>{{ video.likeCount }}</span>
            </button>
            <button class="action-icon-btn" :class="{ active: video.isFavorited }" @click="toggleFavoriteAction">
              <el-icon :size="26"><StarFilled /></el-icon>
              <span>{{ video.favoriteCount }}</span>
            </button>
            <button class="action-icon-btn" @click="scrollToComments">
              <el-icon :size="26"><ChatDotRound /></el-icon>
              <span>{{ video.commentCount }}</span>
            </button>
            <div class="coin-action">
              <button class="action-icon-btn coin-btn" :class="{ active: video.myCoinCount > 0 }" :disabled="remainingCoinLimit === 0 || coiningVideo" @click="handleCoinVideo">
                <el-icon :size="26"><Coin /></el-icon>
                <span>{{ video.coinCount }}</span>
              </button>
              <el-input-number v-model="coinAmount" :min="1" :max="Math.max(1, remainingCoinLimit)" size="small" :disabled="remainingCoinLimit === 0 || coiningVideo" />
              <span class="coin-progress">我的投币 {{ video.myCoinCount }}/{{ video.myCoinLimit }}</span>
            </div>
            <el-button
              v-if="canFollow"
              :type="video.isFollowingCreator ? 'default' : 'primary'"
              size="small"
              @click="toggleFollow"
            >
              {{ video.isFollowingCreator ? '取消关注' : '关注' }}
            </el-button>
          </div>
          <button class="report-btn" @click="openVideoReportDialog">
            <el-icon :size="18"><Warning /></el-icon>
            举报视频
          </button>
        </div>

        <section class="comments" v-if="video">
          <div class="comments-head">
            <h2>评论</h2>
            <el-button type="primary" plain @click="loadComments">刷新评论</el-button>
          </div>

          <el-input
            v-model="commentForm"
            type="textarea"
            :rows="3"
            placeholder="输入评论内容"
          />
          <div class="comment-actions">
            <el-button type="primary" @click="submitRootComment">发表评论</el-button>
          </div>

          <div class="comment-list">
            <article v-for="item in comments" :key="item.id" class="comment-card">
              <CommentThread
                :comment="item"
                :root-id="item.id"
                :active-reply-id="replyTargetId"
                :reply-form-value="replyForm"
                @update:reply-form-value="replyForm = $event"
                @toggle-reply="toggleReplyBox"
                @submit-reply="handleSubmitReply"
                @report="reportComment"
              />
            </article>
          </div>
        </section>
      </div>

      <aside class="side-column">
        <div class="agent-entry">
          <el-popover
            v-model:visible="agentPanelVisible"
            placement="bottom-end"
            :width="360"
            trigger="click"
            popper-class="video-agent-popper"
          >
            <template #reference>
              <el-button type="primary" plain class="agent-entry-btn">
                <el-icon :size="16"><ChatDotRound /></el-icon>
                智能体
              </el-button>
            </template>

            <div class="agent-panel">
              <div class="agent-panel-head">
                <strong>视频智能体</strong>
                <span v-if="agentLastFrameCount > 0">分析帧数：{{ agentLastFrameCount }}</span>
              </div>
              <div ref="agentMessagesRef" class="agent-messages">
                <div
                  v-for="item in agentMessages"
                  :key="item.id"
                  class="agent-message"
                  :class="item.role === 'user' ? 'agent-message-user' : 'agent-message-assistant'"
                >
                  <p>{{ item.content }}</p>
                </div>
                <div v-if="agentLoading" class="agent-loading">智能体思考中...</div>
              </div>
              <p v-if="agentError" class="agent-error">{{ agentError }}</p>
              <div class="agent-input-wrap">
                <el-input
                  v-model="agentDraft"
                  placeholder="输入你的问题，例如：这个视频里人物在做什么？"
                  :disabled="agentLoading"
                  @keydown.enter.exact.prevent="askVideoAgent"
                />
                <el-button type="primary" :loading="agentLoading" @click="askVideoAgent">发送</el-button>
              </div>
            </div>
          </el-popover>
        </div>

        <RouterLink :to="`/users/${video.creator.id}`" class="creator-card">
          <div class="creator-avatar">
            <img v-if="video.creator.avatarUrl" :src="video.creator.avatarUrl" :alt="video.creator.nickname" class="creator-avatar-img" />
            <span v-else>{{ video.creator.nickname.charAt(0) }}</span>
          </div>
          <div class="creator-info">
            <strong class="creator-name">{{ video.creator.nickname }}</strong>
            <span class="creator-fans">粉丝 {{ video.creator.followerCount }}</span>
          </div>
          <el-icon :size="16" color="#9ca3af"><ArrowRight /></el-icon>
        </RouterLink>

        <div class="video-desc-card">
          <p class="video-desc-text">{{ video.description || '暂无简介' }}</p>
        </div>

        <div class="danmaku-panel">
          <button class="danmaku-panel-toggle" @click="danmakuListExpanded = !danmakuListExpanded">
            <span>弹幕列表</span>
            <span class="danmaku-count">{{ danmakus.length }}</span>
            <el-icon :size="14" class="toggle-arrow" :class="{ expanded: danmakuListExpanded }"><ArrowRight /></el-icon>
          </button>
          <div class="danmaku-panel-body" v-if="danmakuListExpanded">
            <div class="danmaku-scroll">
              <div v-for="item in danmakus" :key="item.id" class="danmaku-row" @click="onDanmakuRowClick(item)">
                <span class="danmaku-time">{{ formatMs(item.timeOffsetMs) }}</span>
                <span class="danmaku-user" :style="{ color: item.color || '#6b7280' }">{{ item.user.nickname }}</span>
                <span class="danmaku-text">{{ item.content }}</span>
                <span class="danmaku-row-actions">
                  <button class="danmaku-action-btn" :class="{ liked: likedDanmakuIds.has(item.id) }" @click.stop="toggleDanmakuLike(item)">
                    <svg class="danmaku-action-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 22V11L10.5 3.5C10.78 2.87 11.41 2.5 12.1 2.5C13.1 2.5 13.85 3.42 13.65 4.4L12.8 9H20c1.1 0 2 0.9 2 2v1c0 .15-.02.3-.05.44l-2.19 8C19.5 21.35 18.68 22 17.73 22H7ZM7 13v8M3 22h2V11H3v11Z" fill="currentColor"/>
                    </svg>
                  </button>
                  <button class="danmaku-action-btn report" @click.stop="openReportDialog(item)">
                    <el-icon :size="12"><Warning /></el-icon>
                  </button>
                </span>
              </div>
              <el-empty v-if="danmakus.length === 0" description="暂无弹幕" :image-size="60" />
            </div>
          </div>
        </div>

        <div class="recommend-panel">
          <div class="panel-head">
            <h2>相关推荐</h2>
            <el-button type="primary" text @click="loadRecommendations">刷新</el-button>
          </div>
          <div class="recommend-list">
            <article v-for="item in recommendations" :key="item.id" class="recommend-card">
              <img :src="item.coverUrl" :alt="item.title" class="recommend-cover" />
              <div class="recommend-meta">
                <strong>{{ item.title }}</strong>
                <span>{{ item.creator?.nickname ?? '推荐视频' }}</span>
                <RouterLink :to="`/video/${item.id}`" class="secondary-link">立即观看</RouterLink>
              </div>
            </article>
            <el-empty v-if="recommendations.length === 0" description="暂无相关推荐" />
          </div>
        </div>
      </aside>
    </div>

    <el-dialog v-model="reportDialogVisible" title="举报弹幕" width="440px" :close-on-click-modal="false">
      <div class="report-dialog-body" v-if="reportTarget">
        <p class="report-preview">
          <strong :style="{ color: reportTarget.color || '#fff' }">{{ reportTarget.user.nickname }}</strong
          >：{{ reportTarget.content }}
        </p>
        <p class="report-time">弹幕时间点：{{ formatMs(reportTarget.timeOffsetMs) }}</p>
        <el-input
          v-model="reportReason"
          type="textarea"
          :rows="3"
          placeholder="请输入举报原因（2-255字）"
          maxlength="255"
          show-word-limit
        />
      </div>
      <template #footer>
        <el-button @click="reportDialogVisible = false">取消</el-button>
        <el-button type="danger" :disabled="!reportReason.trim() || reportReason.trim().length < 2" @click="submitReport">
          提交举报
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="videoReportDialogVisible" title="举报视频" width="440px" :close-on-click-modal="false">
      <div class="report-dialog-body">
        <p class="report-preview">
          <strong>{{ video?.title }}</strong>
        </p>
        <el-input
          v-model="videoReportReason"
          type="textarea"
          :rows="3"
          placeholder="请输入举报原因（2-255字）"
          maxlength="255"
          show-word-limit
        />
      </div>
      <template #footer>
        <el-button @click="videoReportDialogVisible = false">取消</el-button>
        <el-button type="danger" :disabled="!videoReportReason.trim() || videoReportReason.trim().length < 2" @click="submitVideoReport">
          提交举报
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { StarFilled, ChatDotRound, Warning, ArrowRight, Coin } from '@element-plus/icons-vue';

import {
  createVideoAiChat,
  createComment,
  createDanmaku,
  coinVideo,
  favoriteVideo,
  fetchComments,
  fetchDanmakus,
  fetchRelatedVideos,
  fetchVideoDetail,
  followUser,
  likeVideo,
  reportContent,
  reportVideoPlay,
  reportVideoWatchProgress,
  reportVideoWatchProgressKeepalive,
  unfavoriteVideo,
  unfollowUser,
  unlikeVideo,
} from '@/api/platform';
import CommentThread from '@/components/CommentThread.vue';
import DanmakuOverlay from '@/components/DanmakuOverlay.vue';
import { useAppStore } from '@/stores/app';
import type { CommentItem, DanmakuItem, VideoCard, VideoDetail, VideoWatchProgressPayload } from '@/types/api';

const WATCH_PROGRESS_MIN_REPORT_SECONDS = 10;
const WATCH_PROGRESS_LEAVE_MIN_REPORT_SECONDS = 5;
const WATCH_PROGRESS_MAX_DELTA_SECONDS = 5;

interface AgentMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

const route = useRoute();
const appStore = useAppStore();
const loading = ref(false);
const video = ref<VideoDetail | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const recommendations = ref<VideoCard[]>([]);
const comments = ref<CommentItem[]>([]);
const danmakus = ref<DanmakuItem[]>([]);
const commentForm = ref('');
const replyForm = ref('');
const replyTargetId = ref<number | null>(null);

const currentVideoTimeMs = ref(0);
const videoDurationMs = ref(0);
const danmakuVisible = ref(true);
const danmakuListExpanded = ref(false);
const videoPaused = ref(true);
const likedDanmakuIds = ref<Set<number>>(new Set());

const hasReportedPlay = ref(false);
const hasReportedEnded = ref(false);
const isReportingWatchProgress = ref(false);
const lastPlaybackPositionSeconds = ref(0);
const sessionWatchedSeconds = ref(0);
const reportedWatchSeconds = ref(0);
const resolvedVideoDurationSeconds = ref(0);
const danmakuForm = reactive({
  content: '',
  timeOffsetMs: 0,
  color: '#FFFFFF',
});

const reportDialogVisible = ref(false);
const reportTarget = ref<DanmakuItem | null>(null);
const reportReason = ref('');

const videoReportDialogVisible = ref(false);
const videoReportReason = ref('');
const agentPanelVisible = ref(false);
const agentLoading = ref(false);
const agentDraft = ref('');
const agentError = ref('');
const agentLastFrameCount = ref(0);
const agentMessagesRef = ref<HTMLElement | null>(null);
const agentMessages = ref<AgentMessage[]>([]);
let agentMessageSeed = 0;

const canFollow = computed(
  () => appStore.isLoggedIn && video.value && video.value.creator.id !== appStore.userId,
);
const remainingCoinLimit = computed(() => Math.max(0, (video.value?.myCoinLimit ?? 5) - (video.value?.myCoinCount ?? 0)));
const coinAmount = ref(1);
const coiningVideo = ref(false);

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function onTimeUpdate() {
  if (videoRef.value) {
    currentVideoTimeMs.value = Math.floor(videoRef.value.currentTime * 1000);
    videoPaused.value = videoRef.value.paused;
  }

  handleTimeUpdate();
}

function onLoadedMetadata() {
  if (videoRef.value) {
    videoDurationMs.value = Math.floor(videoRef.value.duration * 1000);
    videoPaused.value = videoRef.value.paused;
  }

  handleLoadedMetadata();
}

async function onVideoPlay() {
  videoPaused.value = false;
  await handleVideoPlay();
}

async function onVideoPause() {
  videoPaused.value = true;
  await handleVideoPause();
}

function resetWatchTracking() {
  hasReportedPlay.value = false;
  hasReportedEnded.value = false;
  isReportingWatchProgress.value = false;
  lastPlaybackPositionSeconds.value = 0;
  sessionWatchedSeconds.value = 0;
  reportedWatchSeconds.value = 0;
  resolvedVideoDurationSeconds.value = 0;
}

function resolveCurrentVideoDurationSeconds() {
  const playerDuration = videoRef.value?.duration;

  if (typeof playerDuration === 'number' && Number.isFinite(playerDuration) && playerDuration > 0) {
    return Math.round(playerDuration);
  }

  return Math.max(0, Math.round(video.value?.durationSeconds ?? 0));
}

function capturePlaybackProgress(includePausedDelta = false) {
  const player = videoRef.value;

  if (!player) {
    return;
  }

  const currentTimeSeconds = player.currentTime;
  const deltaSeconds = currentTimeSeconds - lastPlaybackPositionSeconds.value;

  // Only accumulate small forward deltas so a manual seek does not get counted as watched time.
  if ((includePausedDelta || !player.paused) && deltaSeconds > 0 && deltaSeconds <= WATCH_PROGRESS_MAX_DELTA_SECONDS) {
    sessionWatchedSeconds.value += deltaSeconds;
  }

  lastPlaybackPositionSeconds.value = currentTimeSeconds;
  resolvedVideoDurationSeconds.value = resolveCurrentVideoDurationSeconds();
}

function buildWatchProgressPayload(event: VideoWatchProgressPayload['event']) {
  capturePlaybackProgress(true);

  const player = videoRef.value;

  if (!video.value || !player) {
    return null;
  }

  const currentTimeSeconds = Math.max(0, Math.round(player.currentTime));
  const watchedSeconds = Math.max(0, Math.round(sessionWatchedSeconds.value - reportedWatchSeconds.value));
  const videoDurationSeconds = resolveCurrentVideoDurationSeconds();

  return {
    watchedSeconds,
    currentTimeSeconds,
    videoDurationSeconds: videoDurationSeconds > 0 ? videoDurationSeconds : undefined,
    event,
  } satisfies VideoWatchProgressPayload;
}

async function flushWatchProgress(
  event: VideoWatchProgressPayload['event'],
  options: { force?: boolean; keepalive?: boolean } = {},
) {
  if (!appStore.isLoggedIn || !video.value || !videoRef.value || isReportingWatchProgress.value) {
    return;
  }

  if (hasReportedEnded.value && event !== 'ended') {
    return;
  }

  const payload = buildWatchProgressPayload(event);

  if (!payload) {
    return;
  }

  const minReportSeconds =
    event === 'leave' ? WATCH_PROGRESS_LEAVE_MIN_REPORT_SECONDS : WATCH_PROGRESS_MIN_REPORT_SECONDS;
  const shouldSkip =
    !options.force &&
    event !== 'ended' &&
    payload.watchedSeconds < minReportSeconds &&
    payload.currentTimeSeconds < minReportSeconds;

  if (shouldSkip) {
    return;
  }

  if (payload.watchedSeconds === 0 && event !== 'ended') {
    return;
  }

  if (payload.watchedSeconds === 0 && payload.currentTimeSeconds === 0) {
    return;
  }

  isReportingWatchProgress.value = true;

  try {
    if (options.keepalive) {
      void reportVideoWatchProgressKeepalive(video.value.id, payload);
    } else {
      await reportVideoWatchProgress(video.value.id, payload);
    }

    reportedWatchSeconds.value += payload.watchedSeconds;

    if (event === 'ended') {
      hasReportedEnded.value = true;
    }
  } catch (error) {
    console.warn('report watch progress failed', error);
  } finally {
    isReportingWatchProgress.value = false;
  }
}

function handleLoadedMetadata() {
  resolvedVideoDurationSeconds.value = resolveCurrentVideoDurationSeconds();
}

function handleTimeUpdate() {
  capturePlaybackProgress();
}

async function handleVideoPlay() {
  const player = videoRef.value;

  if (!player) {
    return;
  }

  lastPlaybackPositionSeconds.value = player.currentTime;
  resolvedVideoDurationSeconds.value = resolveCurrentVideoDurationSeconds();

  if (!appStore.isLoggedIn || !video.value || hasReportedPlay.value) {
    return;
  }

  hasReportedPlay.value = true;

  try {
    await reportVideoPlay(video.value.id, {
      videoDurationSeconds: resolvedVideoDurationSeconds.value || undefined,
    });
  } catch (error) {
    hasReportedPlay.value = false;
    console.warn('report play failed', error);
  }
}

async function handleVideoPause() {
  const player = videoRef.value;

  if (player && Number.isFinite(player.duration) && player.duration > 0 && player.currentTime >= player.duration - 0.5) {
    return;
  }

  await flushWatchProgress('pause');
}

async function handleVideoEnded() {
  await flushWatchProgress('ended', { force: true });
}

async function loadDetail() {
  loading.value = true;
  try {
    video.value = await fetchVideoDetail(Number(route.params.id));
    coinAmount.value = Math.max(1, Math.min(coinAmount.value, remainingCoinLimit.value || 1));
  } catch {
    ElMessage.error('加载视频详情失败');
  } finally {
    loading.value = false;
  }
}

async function loadRecommendations() {
  try {
    recommendations.value = await fetchRelatedVideos(Number(route.params.id));
  } catch {
    ElMessage.error('加载相关推荐失败');
  }
}

async function loadComments() {
  try {
    const result = await fetchComments(Number(route.params.id));
    comments.value = result.items;
  } catch {
    ElMessage.error('加载评论失败');
  }
}

async function loadDanmakus() {
  try {
    danmakus.value = await fetchDanmakus(Number(route.params.id), 0, videoDurationMs.value || 600000);
  } catch {
    ElMessage.error('加载弹幕失败');
  }
}

function appendAgentMessage(role: AgentMessage['role'], content: string) {
  agentMessageSeed += 1;
  agentMessages.value = [
    ...agentMessages.value,
    {
      id: agentMessageSeed,
      role,
      content,
    },
  ];
}

async function scrollAgentToBottom() {
  await nextTick();
  const container = agentMessagesRef.value;
  if (!container) {
    return;
  }
  container.scrollTop = container.scrollHeight;
}

function resetAgentState() {
  agentPanelVisible.value = false;
  agentLoading.value = false;
  agentDraft.value = '';
  agentError.value = '';
  agentLastFrameCount.value = 0;
  agentMessageSeed = 0;
  agentMessages.value = [];
  appendAgentMessage('assistant', '你好，我是视频智能体。你可以问我这个视频里发生了什么。');
}

function resolveApiErrorMessage(error: unknown, fallback: string) {
  const candidate = error as { code?: string; response?: { data?: { message?: string | string[] } } };

  if (candidate.code === 'ECONNABORTED') {
    return '智能体请求超时，请稍后重试';
  }

  const message = candidate.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join('; ');
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

async function askVideoAgent() {
  if (!video.value || agentLoading.value) {
    return;
  }

  const prompt = agentDraft.value.trim();
  if (!prompt) {
    ElMessage.warning('请输入问题');
    return;
  }

  const targetVideoId = video.value.id;
  agentLoading.value = true;
  agentError.value = '';
  agentDraft.value = '';
  appendAgentMessage('user', prompt);
  await scrollAgentToBottom();

  try {
    const result = await createVideoAiChat({
      videoId: targetVideoId,
      prompt,
    });
    if (!video.value || video.value.id !== targetVideoId) {
      return;
    }
    appendAgentMessage('assistant', result.reply);
    agentLastFrameCount.value = result.frameCount;
    await scrollAgentToBottom();
  } catch (error) {
    if (!video.value || video.value.id !== targetVideoId) {
      return;
    }
    const message = resolveApiErrorMessage(error, '智能体暂时不可用，请稍后重试');
    agentError.value = message;
    appendAgentMessage('assistant', `出错了：${message}`);
    await scrollAgentToBottom();
  } finally {
    if (video.value?.id === targetVideoId) {
      agentLoading.value = false;
    }
  }
}

async function submitRootComment() {
  if (!commentForm.value.trim()) {
    ElMessage.warning('请输入评论内容');
    return;
  }

  try {
    await createComment(Number(route.params.id), { content: commentForm.value.trim() });
    commentForm.value = '';
    ElMessage.success('评论成功');
    await Promise.all([loadComments(), loadDetail()]);
  } catch {
    ElMessage.error('评论失败，请确认已登录');
  }
}

function toggleReplyBox(commentId: number) {
  replyTargetId.value = replyTargetId.value === commentId ? null : commentId;
  replyForm.value = '';
}

function handleSubmitReply(payload: { parentId: number; rootId: number }) {
  submitReply(payload.parentId, payload.rootId);
}

async function submitReply(parentId: number, rootId: number) {
  if (!replyForm.value.trim()) {
    ElMessage.warning('请输入回复内容');
    return;
  }

  try {
    await createComment(Number(route.params.id), {
      content: replyForm.value.trim(),
      parentId,
      rootId,
    });
    replyForm.value = '';
    replyTargetId.value = null;
    ElMessage.success('回复成功');
    await Promise.all([loadComments(), loadDetail()]);
  } catch {
    ElMessage.error('回复失败，请确认已登录');
  }
}

async function toggleFollow() {
  if (!video.value) {
    return;
  }

  try {
    if (video.value.isFollowingCreator) {
      await unfollowUser(video.value.creator.id);
      ElMessage.success('已取消关注');
    } else {
      await followUser(video.value.creator.id);
      ElMessage.success('关注成功');
    }
    await loadDetail();
  } catch {
    ElMessage.error('操作失败，请确认已登录');
  }
}

async function toggleLikeAction() {
  if (!video.value) {
    return;
  }

  try {
    const result = video.value.isLiked
      ? await unlikeVideo(video.value.id)
      : await likeVideo(video.value.id);
    ElMessage.success(result.liked ? '点赞成功' : '已取消点赞');
    await loadDetail();
  } catch {
    ElMessage.error('操作失败，请确认已登录');
  }
}

async function toggleFavoriteAction() {
  if (!video.value) {
    return;
  }

  try {
    const result = video.value.isFavorited
      ? await unfavoriteVideo(video.value.id)
      : await favoriteVideo(video.value.id);
    ElMessage.success(result.favorited ? '收藏成功' : '已取消收藏');
    await loadDetail();
  } catch {
    ElMessage.error('操作失败，请确认已登录');
  }
}

async function handleCoinVideo() {
  if (!video.value) {
    return;
  }

  if (remainingCoinLimit.value === 0) {
    ElMessage.info('该视频已达投币上限 5 个');
    return;
  }

  coiningVideo.value = true;
  try {
    const amount = Math.min(coinAmount.value, remainingCoinLimit.value);
    const result = await coinVideo(video.value.id, { amount });
    video.value.coinCount = result.videoCoinCount;
    video.value.myCoinCount = result.userVideoCoinCount;
    coinAmount.value = Math.max(1, Math.min(coinAmount.value, remainingCoinLimit.value || 1));
    ElMessage.success(`投币成功，已投 ${result.amount} 个`);
  } catch (error) {
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    ElMessage.error(message || '投币失败，请确认已登录且余额充足');
  } finally {
    coiningVideo.value = false;
  }
}

async function reportComment(commentId: number) {
  try {
    await reportContent({
      targetType: 'COMMENT',
      targetId: commentId,
      reason: '评论内容存在风险或不当信息',
    });
    ElMessage.success('评论举报已提交');
  } catch {
    ElMessage.error('评论举报失败，请确认已登录');
  }
}

function openReportDialog(danmaku: DanmakuItem) {
  reportTarget.value = danmaku;
  reportReason.value = '';
  reportDialogVisible.value = true;
}

function openVideoReportDialog() {
  videoReportReason.value = '';
  videoReportDialogVisible.value = true;
}

async function submitVideoReport() {
  if (!videoReportReason.value.trim() || videoReportReason.value.trim().length < 2) {
    ElMessage.warning('请输入至少2个字的举报原因');
    return;
  }

  try {
    await reportContent({
      targetType: 'VIDEO',
      targetId: Number(route.params.id),
      reason: videoReportReason.value.trim(),
    });
    ElMessage.success('视频举报已提交，管理员将会审核');
    videoReportDialogVisible.value = false;
    videoReportReason.value = '';
  } catch {
    ElMessage.error('视频举报失败，请确认已登录');
  }
}

function scrollToComments() {
  const el = document.querySelector('.comments');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function toggleDanmakuLike(danmaku: DanmakuItem) {
  if (likedDanmakuIds.value.has(danmaku.id)) {
    likedDanmakuIds.value.delete(danmaku.id);
  } else {
    likedDanmakuIds.value.add(danmaku.id);
  }
}

function onDanmakuRowClick(danmaku: DanmakuItem) {
  if (videoRef.value) {
    videoRef.value.currentTime = danmaku.timeOffsetMs / 1000;
  }
}

async function submitReport() {
  if (!reportTarget.value || !reportReason.value.trim() || reportReason.value.trim().length < 2) {
    ElMessage.warning('请输入至少2个字的举报原因');
    return;
  }

  try {
    await reportContent({
      targetType: 'VIDEO_DANMAKU',
      targetId: reportTarget.value.id,
      reason: reportReason.value.trim(),
    });
    ElMessage.success('弹幕举报已提交，管理员将会审核');
    reportDialogVisible.value = false;
    reportTarget.value = null;
    reportReason.value = '';
  } catch {
    ElMessage.error('弹幕举报失败，请确认已登录');
  }
}

async function submitDanmaku() {
  if (!danmakuForm.content.trim()) {
    ElMessage.warning('请输入弹幕内容');
    return;
  }

  if (videoRef.value) {
    danmakuForm.timeOffsetMs = Math.floor(videoRef.value.currentTime * 1000);
  }

  try {
    await createDanmaku(Number(route.params.id), {
      content: danmakuForm.content.trim(),
      timeOffsetMs: danmakuForm.timeOffsetMs,
      color: danmakuForm.color,
    });
    danmakuForm.content = '';
    ElMessage.success('弹幕发送成功');
    await loadDanmakus();
  } catch {
    ElMessage.error('弹幕发送失败，请确认已登录');
  }
}

function handlePageHide() {
  void flushWatchProgress('leave', { force: true, keepalive: true });
}

watch(
  () => agentMessages.value.length,
  () => {
    if (!agentPanelVisible.value) {
      return;
    }
    void scrollAgentToBottom();
  },
);

watch(
  agentPanelVisible,
  (visible) => {
    if (visible) {
      void scrollAgentToBottom();
    }
  },
);

watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (oldId !== undefined && Number(oldId) !== Number(newId)) {
      await flushWatchProgress('leave', { force: true });
      resetWatchTracking();
    }

    resetAgentState();
    await Promise.all([loadDetail(), loadRecommendations(), loadComments(), loadDanmakus()]);
  },
  { immediate: true },
);

window.addEventListener('pagehide', handlePageHide);

onBeforeRouteLeave(async () => {
  await flushWatchProgress('leave', { force: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('pagehide', handlePageHide);
  void flushWatchProgress('leave', { force: true });
  resetWatchTracking();
});
</script>

<style scoped>
.page {
  display: grid;
  gap: 20px;
}

.top-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) 360px;
  gap: 20px;
}

.main-column,
.side-column {
  display: grid;
  gap: 20px;
}

.side-column {
  align-self: start;
}

.creator-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
  text-decoration: none;
  transition: box-shadow 0.15s ease;
}

.creator-card:hover {
  box-shadow: 0 6px 28px rgba(15, 23, 42, 0.1);
}

.creator-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.creator-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.creator-info {
  flex: 1;
  min-width: 0;
}

.creator-name {
  display: block;
  color: #111827;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.creator-fans {
  display: block;
  margin-top: 2px;
  color: #9ca3af;
  font-size: 13px;
}

.danmaku-panel {
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.danmaku-panel-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 14px 16px;
  border: 0;
  background: transparent;
  color: #111827;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.danmaku-panel-toggle:hover {
  background: rgba(15, 23, 42, 0.03);
}

.danmaku-count {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}

.toggle-arrow {
  margin-left: auto;
  transition: transform 0.2s ease;
}

.toggle-arrow.expanded {
  transform: rotate(90deg);
}

.danmaku-panel-body {
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.danmaku-scroll {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px 0;
}

.danmaku-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  font-size: 13px;
  line-height: 1.5;
  cursor: pointer;
  transition: background 0.12s ease;
}

.danmaku-row:hover {
  background: rgba(15, 23, 42, 0.04);
}

.danmaku-row:hover .danmaku-row-actions {
  opacity: 1;
}

.danmaku-time {
  flex-shrink: 0;
  color: #9ca3af;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.danmaku-user {
  flex-shrink: 0;
  font-weight: 600;
  font-size: 12px;
}

.danmaku-text {
  flex: 1;
  min-width: 0;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.danmaku-row-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.12s ease;
  flex-shrink: 0;
}

.danmaku-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.12s ease;
}

.danmaku-action-btn:hover {
  background: rgba(15, 23, 42, 0.06);
  color: #6b7280;
}

.danmaku-action-btn.liked {
  color: #2563eb;
}

.danmaku-action-btn.report:hover {
  color: #dc2626;
}

.danmaku-action-icon {
  width: 14px;
  height: 14px;
}

.video-desc-card {
  padding: 14px 16px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

.video-desc-text {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.agent-entry {
  display: flex;
  justify-content: flex-end;
}

.agent-entry-btn {
  min-width: 92px;
}

.agent-panel {
  display: grid;
  gap: 10px;
}

.agent-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: #111827;
}

.agent-panel-head span {
  color: #9ca3af;
  font-size: 12px;
}

.agent-messages {
  display: grid;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px 2px;
}

.agent-message {
  display: flex;
}

.agent-message p {
  margin: 0;
  padding: 8px 10px;
  max-width: 85%;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.agent-message-user {
  justify-content: flex-end;
}

.agent-message-user p {
  background: #2563eb;
  color: #ffffff;
}

.agent-message-assistant p {
  background: #f3f4f6;
  color: #374151;
}

.agent-loading {
  color: #9ca3af;
  font-size: 12px;
}

.agent-error {
  margin: 0;
  color: #dc2626;
  font-size: 12px;
}

.agent-input-wrap {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

:deep(.video-agent-popper) {
  padding: 12px;
}

.video-title {
  margin: 0;
  color: #111827;
  font-size: 20px;
  font-weight: 700;
}

.player-section {
  display: flex;
  flex-direction: column;
}

.player-wrapper {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 16px 16px 0 0;
  background: #111827;
  border: 1px solid rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.danmaku-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  margin-top: -1px;
  border-radius: 0 0 16px 16px;
  background: #1e293b;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}

.action-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.action-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #6b7280;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-icon-btn:hover {
  background: rgba(15, 23, 42, 0.05);
  color: #374151;
}

.action-icon-btn.active {
  color: #2563eb;
}

.action-icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.coin-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.coin-btn.active {
  color: #f59e0b;
}

.coin-progress {
  color: #6b7280;
  font-size: 13px;
  white-space: nowrap;
}

.action-icon {
  width: 26px;
  height: 26px;
}

.report-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #9ca3af;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.report-btn:hover {
  background: rgba(220, 38, 38, 0.06);
  color: #dc2626;
}

.comments,
.comment-card,
.reply-card,
.recommend-panel {
  display: grid;
  gap: 16px;
}

.comments,
.comment-card,
.recommend-panel {
  padding: 20px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

.comments-head,
.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.time-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.comment-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: #6b7280;
}

.comment-list,
.reply-list,
.recommend-list {
  display: grid;
  gap: 12px;
}

.reply-card,
.recommend-card {
  padding: 12px 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
}

.link-btn,
.secondary-link {
  color: #2563eb;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.link-btn.danger {
  color: #dc2626;
}

.recommend-card {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
}

.recommend-cover {
  width: 120px;
  height: 84px;
  border-radius: 10px;
  object-fit: cover;
}

.recommend-meta {
  display: grid;
  gap: 6px;
}

.recommend-meta strong {
  color: #111827;
}

.recommend-meta span {
  color: #6b7280;
}

.report-dialog-body {
  display: grid;
  gap: 12px;
}

.report-preview {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.report-time {
  color: #6b7280;
  font-size: 13px;
}
</style>
