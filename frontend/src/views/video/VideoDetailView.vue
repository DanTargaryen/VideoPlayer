<template>
  <section class="video-detail-page" v-loading="loading">
    <div class="video-detail-shell" :class="{ 'agent-sidebar-open': agentPanelVisible }" v-if="video">
      <main class="main-column">
        <header class="video-header">
          <h1 class="video-title">{{ video.title }}</h1>

          <div class="author-meta-card">
            <RouterLink :to="`/users/${video.creator.id}`" class="creator-inline">
              <span class="creator-avatar">
                <img
                  v-if="video.creator.avatarUrl"
                  :src="video.creator.avatarUrl"
                  :alt="video.creator.nickname"
                  class="creator-avatar-img"
                />
                <span v-else>{{ creatorInitial }}</span>
              </span>
              <span class="creator-text">
                <strong>
                  {{ video.creator.nickname }}
                  <el-icon class="verified-icon" :size="15"><CircleCheckFilled /></el-icon>
                </strong>
              </span>
            </RouterLink>

            <el-button
              v-if="canFollow"
              class="follow-btn"
              :class="{ followed: video.isFollowingCreator }"
              size="small"
              @click="toggleFollow"
            >
              {{ video.isFollowingCreator ? '已关注' : '+ 关注' }}
            </el-button>

            <div class="meta-strip">
              <span class="meta-item">粉丝 {{ formatCompactNumber(video.creator.followerCount) }}</span>
              <span class="meta-item">
                <el-icon :size="15"><VideoPlay /></el-icon>
                {{ formatCompactNumber(video.playCount ?? 0) }}
              </span>
              <span class="meta-item">
                <el-icon :size="15"><ChatLineRound /></el-icon>
                {{ formatCompactNumber(danmakus.length) }}
              </span>
              <span class="meta-item">
                <el-icon :size="15"><Clock /></el-icon>
                {{ publishDateText }}
              </span>
              <span class="meta-item rights-note">
                <el-icon :size="15"><CircleCloseFilled /></el-icon>
                未经作者授权，禁止转载
              </span>
            </div>
          </div>
        </header>

        <section class="watch-panel">
          <div class="player-wrapper">
            <video
              v-if="video?.playUrl"
              ref="videoRef"
              :key="`${video.id}-${video.playUrl}-${video.coverUrl}`"
              class="video"
              controls
              :src="video.playUrl"
              preload="auto"
              @timeupdate="onTimeUpdate"
              @loadedmetadata="onLoadedMetadata"
              @play="onVideoPlay"
              @pause="onVideoPause"
              @ended="handleVideoEnded"
            ></video>
            <div v-else class="player-empty">视频暂不可播放</div>
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
            <label class="danmaku-switch">
              <span>弹</span>
              <el-switch v-model="danmakuVisible" size="small" />
            </label>
            <el-input
              v-model="danmakuForm.content"
              class="danmaku-input"
              placeholder="发个友善的弹幕见证当下"
              @keyup.enter="submitDanmaku"
            />
            <span class="danmaku-counter">{{ formatMs(currentVideoTimeMs) }} / {{ formatMs(videoDurationMs) }}</span>
            <button class="danmaku-face" type="button" aria-label="弹幕表情">
              <el-icon :size="17"><ChatDotRound /></el-icon>
            </button>
            <el-button class="danmaku-send" type="primary" @click="submitDanmaku">发送</el-button>
          </div>
        </section>

        <VideoActionBar
          :video="video"
          :remaining-coin-limit="remainingCoinLimit"
          :coining-video="coiningVideo"
          @like="toggleLikeAction"
          @favorite="toggleFavoriteAction"
          @coin="handleCoinVideo"
          @comments="scrollToComments"
          @share="handleShareVideo"
          @more="openAgentPanel"
          @report="openVideoReportDialog"
        />

        <VideoIntroCard :video="video" />

        <section class="comments" v-if="video">
          <div class="comments-head">
            <div>
              <h2>评论 <span>{{ formatCompactNumber(video.commentCount) }}</span></h2>
            </div>
            <el-button type="primary" plain @click="loadComments">
              <el-icon><RefreshRight /></el-icon>
              <span>刷新评论</span>
            </el-button>
          </div>

          <div class="comment-composer">
            <span class="viewer-avatar">
              <img v-if="appStore.avatarUrl" :src="appStore.avatarUrl" :alt="appStore.nickname" />
              <span v-else>{{ currentUserInitial }}</span>
            </span>
            <div class="composer-main">
              <el-input
                v-model="commentForm"
                type="textarea"
                :autosize="{ minRows: 1, maxRows: 4 }"
                resize="none"
                placeholder="发一条友善的评论......"
              />
              <div class="composer-footer">
                <p>输入 <strong>@grok</strong> + 问题，可召唤智能体回复</p>
                <el-button type="primary" @click="submitRootComment">发表评论</el-button>
              </div>
            </div>
          </div>

          <div class="comment-tabs" role="tablist" aria-label="评论排序">
            <button
              type="button"
              :class="{ active: commentSortTab === 'hot' }"
              @click="commentSortTab = 'hot'"
            >
              热门
            </button>
            <button
              type="button"
              :class="{ active: commentSortTab === 'latest' }"
              @click="commentSortTab = 'latest'"
            >
              最新
            </button>
          </div>

          <div class="comment-list">
            <article v-for="item in sortedComments" :key="item.id" class="comment-card">
              <CommentThread
                :comment="item"
                :root-id="item.id"
                :active-reply-id="replyTargetId"
                :reply-form-value="replyForm"
                :expanded-comment-ids="expandedCommentIds"
                @update:reply-form-value="replyForm = $event"
                @toggle-reply="toggleReplyBox"
                @submit-reply="handleSubmitReply"
                @report="reportComment"
              />
            </article>
            <el-empty v-if="comments.length === 0" description="还没有评论，来发第一条吧" :image-size="80" />
          </div>
        </section>
      </main>

      <aside class="side-column">
        <VideoRecommendationsPanel
          v-model:autoplay="autoPlayNext"
          :recommendations="recommendations"
          :loading="recommendationsLoading"
          @refresh="loadRecommendations"
        />
      </aside>

      <aside v-if="agentPanelVisible" class="agent-side-column">
        <div class="agent-sidebar">
          <div class="agent-sidebar-head">
            <div class="agent-sidebar-title">
              <span class="agent-sidebar-eyebrow">AI Assistant</span>
              <strong>视频智能体</strong>
            </div>
            <div class="agent-sidebar-actions">
              <span class="agent-sidebar-status">视频上下文</span>
              <button type="button" class="agent-sidebar-close" aria-label="关闭视频智能体" @click="agentPanelVisible = false">
                ×
              </button>
            </div>
          </div>

          <div class="agent-sidebar-tabs">
            <button type="button" class="active">聊天</button>
            <button type="button" disabled>笔记</button>
            <button type="button" disabled>上下文</button>
          </div>

          <div class="agent-panel">
            <div class="agent-panel-head">
              <strong>当前会话</strong>
              <span>{{ agentLastFrameCount > 0 ? `已分析 ${agentLastFrameCount} 帧` : '待提问' }}</span>
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
            <div class="agent-composer">
              <p v-if="agentError" class="agent-error">{{ agentError }}</p>
              <div class="agent-input-wrap">
                <el-input
                  v-model="agentDraft"
                  type="textarea"
                  :autosize="{ minRows: 3, maxRows: 6 }"
                  resize="none"
                  placeholder="尽管问，例如：这个视频里的人物在做什么？"
                  :disabled="agentLoading"
                  @keydown.enter.exact.prevent="askVideoAgent"
                />
                <div class="agent-composer-footer">
                  <span>Enter 发送</span>
                  <el-button type="primary" :loading="agentLoading" @click="askVideoAgent">发送</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <el-dialog v-model="favoriteDialogVisible" title="选择收藏夹" width="420px" :close-on-click-modal="false">
      <div class="favorite-dialog-body" v-loading="favoriteFolderLoading">
        <div v-if="favoriteFolderOptions.length > 0" class="favorite-dialog-list">
          <label
            v-for="folder in favoriteFolderOptions"
            :key="folder.id"
            class="favorite-dialog-item"
            :class="{ active: selectedFavoriteFolderId === folder.id }"
          >
            <el-radio v-model="selectedFavoriteFolderId" :label="folder.id">
              {{ folder.name }}
            </el-radio>
            <span class="favorite-dialog-count">{{ folder.videoCount }} 个视频</span>
          </label>
        </div>
        <el-empty v-else description="暂无可用收藏夹" :image-size="60" />
      </div>
      <template #footer>
        <el-button @click="favoriteDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="favoritingVideo"
          :disabled="favoriteFolderLoading || !selectedFavoriteFolderId"
          @click="confirmFavoriteVideo"
        >
          确认收藏
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="agentLegacyDialogVisible" title="视频智能体" width="520px" :close-on-click-modal="false">
      <div class="agent-panel">
        <div class="agent-panel-head">
          <strong>和当前视频对话</strong>
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
    </el-dialog>

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
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  ChatDotRound,
  ChatLineRound,
  CircleCheckFilled,
  CircleCloseFilled,
  Clock,
  RefreshRight,
  VideoPlay,
} from '@element-plus/icons-vue';

import {
  createVideoAiChat,
  createComment,
  createDanmaku,
  coinVideo,
  favoriteVideo,
  fetchCommentThread,
  fetchComments,
  fetchDanmakus,
  fetchMyFavoriteFolders,
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
import VideoActionBar from '@/components/video/VideoActionBar.vue';
import VideoIntroCard from '@/components/video/VideoIntroCard.vue';
import VideoRecommendationsPanel from '@/components/video/VideoRecommendationsPanel.vue';
import { useAppStore } from '@/stores/app';
import { takeRandomItems } from '@/utils/randomVideos';
import type {
  CommentItem,
  DanmakuItem,
  FavoriteFolderSummary,
  VideoCard,
  VideoDetail,
  VideoWatchProgressPayload,
} from '@/types/api';

const WATCH_PROGRESS_MIN_REPORT_SECONDS = 10;
const WATCH_PROGRESS_LEAVE_MIN_REPORT_SECONDS = 5;
const WATCH_PROGRESS_MAX_DELTA_SECONDS = 5;
const GROK_MENTION_PATTERN = /@grok\b/i;
const GROK_REPLY_POLL_INTERVAL_MS = 2000;
const GROK_REPLY_POLL_MAX_ATTEMPTS = 30;
const GROK_PENDING_REPLY_TEXT = 'Grok 正在生成回复，请稍候';
const RELATED_DISPLAY_SIZE = 6;
const RELATED_CANDIDATE_SIZE = 24;

interface AgentMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const loading = ref(false);
const video = ref<VideoDetail | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const recommendations = ref<VideoCard[]>([]);
const recommendationsLoading = ref(false);
const comments = ref<CommentItem[]>([]);
const danmakus = ref<DanmakuItem[]>([]);
const commentForm = ref('');
const replyForm = ref('');
const replyTargetId = ref<number | null>(null);
const commentSortTab = ref<'hot' | 'latest'>('hot');
const expandedCommentIds = ref<Set<number>>(new Set());
const favoriteDialogVisible = ref(false);
const favoriteFolderOptions = ref<FavoriteFolderSummary[]>([]);
const favoriteFolderLoading = ref(false);
const favoritingVideo = ref(false);
const selectedFavoriteFolderId = ref<number | null>(null);

const currentVideoTimeMs = ref(0);
const videoDurationMs = ref(0);
const danmakuVisible = ref(true);
const videoPaused = ref(true);
const likedDanmakuIds = ref<Set<number>>(new Set());
const autoPlayNext = ref(true);

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
const agentLegacyDialogVisible = ref(false);
const agentLoading = ref(false);
const agentDraft = ref('');
const agentError = ref('');
const agentLastFrameCount = ref(0);
const agentMessagesRef = ref<HTMLElement | null>(null);
const agentMessages = ref<AgentMessage[]>([]);
let agentMessageSeed = 0;
let grokReplyPollTimer: ReturnType<typeof setTimeout> | null = null;
let grokReplyPollToken = 0;
let grokPendingReplySeed = 0;

const canFollow = computed(
  () => appStore.isLoggedIn && video.value && video.value.creator.id !== appStore.userId,
);
const remainingCoinLimit = computed(() => Math.max(0, (video.value?.myCoinLimit ?? 5) - (video.value?.myCoinCount ?? 0)));
const creatorInitial = computed(() => video.value?.creator.nickname.trim().charAt(0).toUpperCase() || '观');
const currentUserInitial = computed(() => appStore.nickname.trim().charAt(0).toUpperCase() || '游');
const publishDateText = computed(() => {
  const value = video.value?.publishedAt ?? video.value?.createdAt;
  if (!value) {
    return '发布时间未知';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '发布时间未知';
  }

  const pad = (input: number) => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
});
const sortedComments = computed(() => {
  const items = [...comments.value];
  if (commentSortTab.value === 'latest') {
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return items.sort((a, b) => {
    const replyDelta = (b.replyCount + b.replies.length) - (a.replyCount + a.replies.length);
    if (replyDelta !== 0) {
      return replyDelta;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});
const coinAmount = ref(1);
const coiningVideo = ref(false);

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatCompactNumber(value?: number | null) {
  const count = Number(value ?? 0);
  if (count >= 10000) {
    return `${(count / 10000).toFixed(count >= 100000 ? 0 : 1)}万`;
  }
  return String(count);
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

function syncInitialDurationFromDetail() {
  const fallbackDurationSeconds = Math.max(0, Math.round(video.value?.durationSeconds ?? 0));
  if (fallbackDurationSeconds > 0) {
    videoDurationMs.value = fallbackDurationSeconds * 1000;
    resolvedVideoDurationSeconds.value = fallbackDurationSeconds;
  }
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

  if (!video.value || hasReportedPlay.value) {
    return;
  }

  hasReportedPlay.value = true;

  try {
    const result = await reportVideoPlay(video.value.id, {
      videoDurationSeconds: resolvedVideoDurationSeconds.value || undefined,
    });

    if (video.value) {
      video.value.playCount = result.playCount;
    }
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
  if (autoPlayNext.value && recommendations.value.length > 0) {
    await router.push(`/video/${recommendations.value[0].id}`);
  }
}

async function loadDetail() {
  loading.value = true;
  try {
    video.value = await fetchVideoDetail(Number(route.params.id));
    syncInitialDurationFromDetail();
    coinAmount.value = Math.max(1, Math.min(coinAmount.value, remainingCoinLimit.value || 1));
  } catch {
    ElMessage.error('加载视频详情失败');
  } finally {
    loading.value = false;
  }
}

async function loadRecommendations() {
  if (recommendationsLoading.value) {
    return;
  }

  recommendationsLoading.value = true;
  try {
    const candidates = await fetchRelatedVideos(Number(route.params.id), {
      limit: RELATED_CANDIDATE_SIZE,
    });
    recommendations.value = takeRandomItems(candidates, RELATED_DISPLAY_SIZE);
  } catch {
    ElMessage.error('加载相关推荐失败');
  } finally {
    recommendationsLoading.value = false;
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

function hasGrokMention(content: string) {
  return GROK_MENTION_PATTERN.test(content);
}

function clearGrokReplyPolling() {
  grokReplyPollToken += 1;
  if (grokReplyPollTimer) {
    clearTimeout(grokReplyPollTimer);
    grokReplyPollTimer = null;
  }
}

function findCommentNode(root: CommentItem, commentId: number): CommentItem | null {
  if (root.id === commentId) {
    return root;
  }

  for (const reply of root.replies) {
    const matched = findCommentNode(reply, commentId);
    if (matched) {
      return matched;
    }
  }

  return null;
}

function getDirectReplies(thread: CommentItem, commentId: number) {
  const source = findCommentNode(thread, commentId);
  return source?.replies ?? [];
}

function getDirectReplyIds(thread: CommentItem, commentId: number) {
  return new Set(getDirectReplies(thread, commentId).map((reply) => reply.id));
}

function createPendingGrokReply(input: { id: number; videoId: number; parentId: number; rootId: number }): CommentItem {
  return {
    id: input.id,
    videoId: input.videoId,
    userId: 0,
    parentId: input.parentId,
    rootId: input.rootId,
    content: GROK_PENDING_REPLY_TEXT,
    replyCount: 0,
    status: 'NORMAL',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPendingGrok: true,
    user: {
      id: 0,
      nickname: 'Grok',
    },
    replies: [],
  };
}

function removePendingGrokRepliesFromNode(node: CommentItem, pendingId?: number): CommentItem {
  return {
    ...node,
    replies: node.replies
      .filter((reply) => !reply.isPendingGrok && (pendingId === undefined || reply.id !== pendingId))
      .map((reply) => removePendingGrokRepliesFromNode(reply, pendingId)),
  };
}

function appendPendingGrokReply(node: CommentItem, sourceCommentId: number, pendingReply: CommentItem): CommentItem {
  const nextNode = removePendingGrokRepliesFromNode(node, pendingReply.id);

  if (nextNode.id === sourceCommentId) {
    return {
      ...nextNode,
      replies: [...nextNode.replies, pendingReply],
    };
  }

  return {
    ...nextNode,
    replies: nextNode.replies.map((reply) => appendPendingGrokReply(reply, sourceCommentId, pendingReply)),
  };
}

function removePendingGrokReplies(pendingId?: number) {
  comments.value = comments.value.map((item) => removePendingGrokRepliesFromNode(item, pendingId));
}

function insertPendingGrokReply(input: {
  videoId: number;
  rootId: number;
  sourceCommentId: number;
  pendingReplyId: number;
}) {
  const pendingReply = createPendingGrokReply({
    id: input.pendingReplyId,
    videoId: input.videoId,
    parentId: input.sourceCommentId,
    rootId: input.rootId,
  });

  comments.value = comments.value.map((item) =>
    item.id === input.rootId ? appendPendingGrokReply(item, input.sourceCommentId, pendingReply) : item,
  );

  const root = comments.value.find((item) => item.id === input.rootId);
  if (root) {
    expandCommentPath(root, input.sourceCommentId);
  }
}

function isLikelyGrokReply(comment: CommentItem) {
  return /grok|机器人|智能体/i.test(comment.user.nickname);
}

function expandCommentPath(root: CommentItem, targetId: number) {
  const path: number[] = [];

  function visit(node: CommentItem): boolean {
    path.push(node.id);
    if (node.id === targetId) {
      return true;
    }

    for (const reply of node.replies) {
      if (visit(reply)) {
        return true;
      }
    }

    path.pop();
    return false;
  }

  if (!visit(root)) {
    return;
  }

  expandedCommentIds.value = new Set([...expandedCommentIds.value, ...path]);
}

function upsertCommentThread(thread: CommentItem) {
  const nextComments = [...comments.value];
  const index = nextComments.findIndex((item) => item.id === thread.id);
  if (index >= 0) {
    nextComments.splice(index, 1, thread);
  } else {
    nextComments.push(thread);
  }
  comments.value = nextComments;
}

function startGrokReplyPolling(input: { videoId: number; rootId: number; sourceCommentId: number }) {
  clearGrokReplyPolling();
  removePendingGrokReplies();

  const token = grokReplyPollToken;
  let attempts = 0;
  const existingThread = comments.value.find((item) => item.id === input.rootId);
  let knownReplyIds = existingThread ? getDirectReplyIds(existingThread, input.sourceCommentId) : new Set<number>();
  grokPendingReplySeed -= 1;
  const pendingReplyId = grokPendingReplySeed;

  insertPendingGrokReply({
    ...input,
    pendingReplyId,
  });

  const pollOnce = async () => {
    if (token !== grokReplyPollToken || Number(route.params.id) !== input.videoId) {
      return;
    }

    attempts += 1;

    try {
      const thread = await fetchCommentThread(input.videoId, input.rootId);
      const directReplies = getDirectReplies(thread, input.sourceCommentId);
      const newReplies = directReplies.filter((reply) => !knownReplyIds.has(reply.id));
      const replyIds = new Set(directReplies.map((reply) => reply.id));
      if (newReplies.some(isLikelyGrokReply)) {
        upsertCommentThread(thread);
        expandCommentPath(thread, input.sourceCommentId);
        clearGrokReplyPolling();
        await loadDetail();
        return;
      }

      upsertCommentThread(thread);
      expandCommentPath(thread, input.sourceCommentId);
      insertPendingGrokReply({
        ...input,
        pendingReplyId,
      });
      knownReplyIds = replyIds;
    } catch {
      // The task worker may still be creating the thread reply; retry quietly.
    }

    if (attempts < GROK_REPLY_POLL_MAX_ATTEMPTS && token === grokReplyPollToken) {
      grokReplyPollTimer = setTimeout(pollOnce, GROK_REPLY_POLL_INTERVAL_MS);
      return;
    }

    if (token === grokReplyPollToken) {
      removePendingGrokReplies(pendingReplyId);
      grokReplyPollTimer = null;
      ElMessage.info('Grok 回复还在生成中，可稍后刷新评论');
    }
  };

  grokReplyPollTimer = setTimeout(pollOnce, 800);
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
  const content = commentForm.value.trim();
  if (!content) {
    ElMessage.warning('请输入评论内容');
    return;
  }

  try {
    const videoId = Number(route.params.id);
    const created = await createComment(videoId, { content });
    commentForm.value = '';
    ElMessage.success('评论成功');
    await Promise.all([loadComments(), loadDetail()]);
    if (hasGrokMention(content)) {
      startGrokReplyPolling({
        videoId,
        rootId: created.rootId ?? created.id,
        sourceCommentId: created.id,
      });
    }
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
  const content = replyForm.value.trim();
  if (!content) {
    ElMessage.warning('请输入回复内容');
    return;
  }

  try {
    const videoId = Number(route.params.id);
    const created = await createComment(videoId, {
      content,
      parentId,
      rootId,
    });
    replyForm.value = '';
    replyTargetId.value = null;
    ElMessage.success('回复成功');
    await Promise.all([loadComments(), loadDetail()]);
    if (hasGrokMention(content)) {
      startGrokReplyPolling({
        videoId,
        rootId: created.rootId ?? rootId,
        sourceCommentId: created.id,
      });
    }
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
    if (video.value.isFavorited) {
      const result = await unfavoriteVideo(video.value.id);
      ElMessage.success(result.favorited ? '收藏成功' : '已取消收藏');
      await loadDetail();
      return;
    }

    await openFavoriteDialog();
  } catch {
    ElMessage.error('操作失败，请确认已登录');
  }
}

async function openFavoriteDialog() {
  favoriteFolderLoading.value = true;
  try {
    const folders = await fetchMyFavoriteFolders();
    favoriteFolderOptions.value = folders;
    selectedFavoriteFolderId.value = folders.find((folder) => folder.isDefault)?.id ?? folders[0]?.id ?? null;
    favoriteDialogVisible.value = true;
  } catch {
    ElMessage.error('加载收藏夹失败，请确认已登录');
  } finally {
    favoriteFolderLoading.value = false;
  }
}

async function confirmFavoriteVideo() {
  if (!video.value || !selectedFavoriteFolderId.value) {
    ElMessage.warning('请选择一个收藏夹');
    return;
  }

  favoritingVideo.value = true;
  try {
    await favoriteVideo(video.value.id, { folderId: selectedFavoriteFolderId.value });
    favoriteDialogVisible.value = false;
    ElMessage.success('收藏成功');
    await loadDetail();
  } catch {
    ElMessage.error('收藏失败，请确认已登录');
  } finally {
    favoritingVideo.value = false;
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

function openAgentPanel() {
  agentPanelVisible.value = true;
}

async function handleShareVideo() {
  const shareUrl = window.location.href;

  try {
    if (navigator.share && video.value) {
      await navigator.share({
        title: video.value.title,
        url: shareUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    ElMessage.success('视频链接已复制');
  } catch {
    ElMessage.info('分享已取消');
  }
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

    clearGrokReplyPolling();
    expandedCommentIds.value = new Set();
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
  clearGrokReplyPolling();
  void flushWatchProgress('leave', { force: true });
  resetWatchTracking();
});
</script>

<style scoped>
.favorite-dialog-body {
  min-height: 120px;
}

.favorite-dialog-list {
  display: grid;
  gap: 10px;
}

.favorite-dialog-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-bg-page);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.favorite-dialog-item.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}

.favorite-dialog-item :deep(.el-radio) {
  margin-right: 0;
}

.favorite-dialog-count {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.report-dialog-body {
  display: grid;
  gap: 12px;
}

.report-preview {
  padding: 12px;
  border-radius: 8px;
  background: var(--color-bg-page);
}

.report-time {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.video-detail-page {
  min-height: calc(100dvh - 96px);
  background: transparent;
  color: var(--color-text-main);
}

.video-detail-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 24px;
  align-items: start;
  width: 100%;
  max-width: 1540px;
  margin: 0 auto;
}

.video-detail-shell.agent-sidebar-open {
  grid-template-columns: minmax(0, 1fr) 340px 336px;
}

.main-column {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.side-column {
  position: sticky;
  top: 88px;
  align-self: start;
  display: grid;
  gap: 16px;
  min-width: 0;
}

.agent-side-column {
  position: sticky;
  top: 88px;
  align-self: start;
  min-width: 0;
}

.agent-sidebar {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 10px;
  min-height: calc(100dvh - 112px);
  padding: 10px 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.96));
  box-shadow:
    0 14px 28px rgba(15, 23, 42, 0.08),
    0 1px 0 rgba(255, 255, 255, 0.7) inset;
}

.agent-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 6px 0;
}

.agent-sidebar-title {
  display: grid;
  gap: 2px;
}

.agent-sidebar-eyebrow {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.agent-sidebar-title strong {
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
}

.agent-sidebar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-sidebar-status {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #475569;
  font-size: 11px;
  font-weight: 600;
}

.agent-sidebar-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.agent-sidebar-close:hover {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}

.agent-sidebar-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.agent-sidebar-tabs button {
  min-height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px 8px 0 0;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.agent-sidebar-tabs button.active {
  background: rgba(255, 255, 255, 0.8);
  color: #0f172a;
  box-shadow: 0 -1px 0 rgba(148, 163, 184, 0.18) inset;
}

.agent-sidebar-tabs button:disabled {
  opacity: 0.54;
  cursor: default;
}

.video-header {
  display: grid;
  gap: 12px;
  padding: 2px 0 0;
}

.video-title {
  margin: 0;
  color: var(--color-text-main);
  font-size: clamp(24px, 1.9vw, 26px);
  line-height: 1.22;
  font-weight: 820;
  letter-spacing: 0;
}

.author-meta-card {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
  color: var(--color-text-secondary);
}

.creator-inline {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  flex-shrink: 0;
}

.creator-avatar,
.viewer-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-bg-page));
  color: var(--color-primary);
  font-weight: 800;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.08);
}

.creator-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.viewer-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 14px;
}

.creator-avatar-img,
.viewer-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.creator-text {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.creator-text strong {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  color: var(--color-text-main);
  font-size: 15px;
  line-height: 1.2;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.verified-icon {
  flex-shrink: 0;
  color: var(--color-primary);
}

.follow-btn {
  min-width: 76px;
  height: 30px;
  padding: 0 13px;
  border: 0;
  border-radius: 12px;
  background: var(--color-primary);
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 700;
  box-shadow: none;
}

.follow-btn:hover {
  background: var(--color-primary-hover);
  color: #FFFFFF;
}

.follow-btn.followed {
  background: var(--color-bg-muted);
  color: var(--color-text-secondary);
}

.meta-strip {
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
  flex-wrap: wrap;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

.meta-item :deep(.el-icon) {
  color: var(--color-text-muted);
}

.rights-note {
  color: var(--color-text-muted);
}

.rights-note :deep(.el-icon) {
  color: var(--color-danger);
}

.watch-panel {
  overflow: hidden;
  border: 1px solid rgba(17, 24, 39, 0.1);
  border-radius: 16px;
  background: #172231;
  box-shadow: 0 14px 32px rgba(23, 32, 51, 0.1);
}

.player-wrapper {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: #111827;
}

.video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.player-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.78);
  font-size: 14px;
}

.danmaku-bar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin-top: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0;
  background: #1b2635;
}

.danmaku-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 11px;
  border-radius: 12px;
  background: #283545;
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
}

.danmaku-switch :deep(.el-switch__core) {
  border-color: transparent;
  background: #475569;
}

.danmaku-switch :deep(.is-checked .el-switch__core),
.danmaku-switch :deep(.el-switch.is-checked .el-switch__core) {
  background: var(--color-primary);
}

.danmaku-input :deep(.el-input__wrapper) {
  min-height: 36px;
  border-radius: 12px;
  background: #344150;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
}

.danmaku-input :deep(.el-input__wrapper.is-focus) {
  background: #3a4859;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.58);
}

.danmaku-input :deep(.el-input__inner) {
  color: #f8fafc;
  font-size: 14px;
  font-weight: 500;
}

.danmaku-input :deep(.el-input__inner::placeholder) {
  color: #aeb8c6;
}

.danmaku-counter {
  color: #d6deea;
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.danmaku-face {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: #2c3847;
  color: #d5dde8;
  cursor: pointer;
  transition: background 180ms cubic-bezier(0.16, 1, 0.3, 1), color 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

.danmaku-face:hover {
  background: #354354;
  color: #ffffff;
}

.danmaku-send {
  min-width: 66px;
  height: 36px;
  border: 0;
  border-radius: 12px;
  background: var(--color-primary);
  font-size: 14px;
  font-weight: 800;
  box-shadow: none;
}

.danmaku-send:hover {
  background: var(--color-primary-hover);
}

.comments {
  display: grid;
  gap: 13px;
  padding: 20px 24px;
  border: 1px solid var(--color-border);
  border-radius: 20px;
  background: var(--color-bg-card);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.comments-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.comments-head h2 {
  margin: 0;
  color: var(--color-text-main);
  font-size: 18px;
  font-weight: 800;
}

.comments-head h2 span {
  margin-left: 4px;
  color: var(--color-primary);
  font-size: 15px;
}

.comment-composer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-soft);
}

.composer-main {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.comment-composer :deep(.el-textarea__inner) {
  min-height: 42px !important;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--color-bg-page);
  color: var(--color-text-main);
  font-size: 14px;
  line-height: 20px;
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.comment-composer :deep(.el-textarea__inner::placeholder) {
  color: var(--color-text-muted);
}

.comment-composer :deep(.el-textarea__inner:focus) {
  background: var(--color-bg-card);
  box-shadow:
    0 0 0 1px var(--color-primary) inset,
    0 0 0 3px rgba(37, 99, 235, 0.12);
}

.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.composer-footer p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.composer-footer strong {
  color: var(--color-primary);
}

.comment-tabs {
  display: flex;
  align-items: center;
  gap: 20px;
}

.comment-tabs button {
  position: relative;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.comment-tabs button::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -8px;
  height: 2px;
  border-radius: 999px;
  background: transparent;
}

.comment-tabs button.active {
  color: var(--color-primary);
}

.comment-tabs button.active::after {
  background: var(--color-primary);
}

.comment-list {
  display: grid;
  gap: 0;
}

.comment-card {
  padding: 16px 0;
  border: 0;
  border-bottom: 1px solid var(--color-border-soft);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.comment-card:last-child {
  border-bottom: 0;
}

.agent-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 10px;
  min-height: 0;
  height: 100%;
  padding: 4px 4px 0;
}

.agent-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 4px;
  color: #0f172a;
  font-size: 13px;
}

.agent-panel-head span {
  color: #64748b;
  font-size: 11px;
}

.agent-messages {
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 420px;
  max-height: calc(100dvh - 284px);
  overflow-y: auto;
  padding: 8px 8px 4px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.46);
}

.agent-message {
  display: flex;
}

.agent-message p {
  max-width: 92%;
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.agent-message-user {
  justify-content: flex-end;
}

.agent-message-user p {
  background: linear-gradient(180deg, #3b82f6, #2563eb);
  color: #FFFFFF;
  border-bottom-right-radius: 4px;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.18);
}

.agent-message-assistant p {
  background: rgba(255, 255, 255, 0.96);
  color: #334155;
  border-bottom-left-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
}

.agent-loading {
  padding: 0 6px;
  color: #64748b;
  font-size: 11px;
}

.agent-error {
  margin: 0;
  color: #dc2626;
  font-size: 11px;
  line-height: 1.5;
}

.agent-composer {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
}

.agent-input-wrap {
  display: grid;
  gap: 10px;
}

.agent-input-wrap :deep(.el-textarea__inner) {
  min-height: 88px !important;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.6;
  box-shadow: none;
}

.agent-input-wrap :deep(.el-textarea__inner::placeholder) {
  color: #94a3b8;
}

.agent-input-wrap :deep(.el-textarea__inner:focus) {
  box-shadow: none;
}

.agent-input-wrap :deep(.el-textarea__wrapper) {
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.agent-composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.agent-composer-footer span {
  color: #64748b;
  font-size: 11px;
}

@media (max-width: 1180px) {
  .video-detail-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .video-detail-shell.agent-sidebar-open {
    grid-template-columns: minmax(0, 1fr);
  }

  .side-column {
    position: static;
  }

  .agent-side-column {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 40;
    width: min(420px, 92vw);
    height: 100dvh;
  }

  .agent-sidebar {
    min-height: 100dvh;
    height: 100%;
    border-radius: 0;
    border-right: 0;
    border-top: 0;
    border-bottom: 0;
  }
}

@media (max-width: 760px) {
  .video-detail-shell {
    gap: 18px;
  }

  .author-meta-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .meta-strip {
    flex-basis: 100%;
  }

  .watch-panel {
    border-radius: 14px;
  }

  .danmaku-bar {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .danmaku-counter {
    display: none;
  }

  .danmaku-face {
    display: none;
  }

  .comments {
    padding: 16px;
  }

  .comment-composer {
    grid-template-columns: 1fr;
  }

  .viewer-avatar {
    display: none;
  }

  .agent-input-wrap {
    gap: 8px;
  }

  .agent-side-column {
    width: 100vw;
  }

  .agent-sidebar {
    padding: 16px;
  }

  .agent-messages {
    min-height: 320px;
    max-height: calc(100dvh - 250px);
  }
}
</style>
