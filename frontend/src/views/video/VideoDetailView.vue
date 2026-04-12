<template>
  <section class="page" v-loading="loading">
    <div class="top-layout" v-if="video">
      <div class="main-column">
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
          ></video>
          <span v-else>视频播放器占位</span>
          <DanmakuOverlay
            v-if="video?.playUrl"
            :danmakus="danmakus"
            :current-time-ms="currentVideoTimeMs"
            :duration-ms="videoDurationMs"
            :visible="danmakuVisible"
            :paused="videoPaused"
            @report="openReportDialog"
          />
          <div class="danmaku-toggle" v-if="video?.playUrl">
            <el-switch v-model="danmakuVisible" active-text="弹幕" inactive-text="关" />
          </div>
        </div>

        <div class="meta">
          <div class="title-row">
            <div>
              <h1>{{ video.title }}</h1>
              <p>{{ video.description }}</p>
            </div>
            <el-button
              v-if="canFollow"
              :type="video.isFollowingCreator ? 'default' : 'primary'"
              @click="toggleFollow"
            >
              {{ video.isFollowingCreator ? '取消关注' : '关注用户' }}
            </el-button>
          </div>

          <div class="action-row">
            <el-button :type="video.isLiked ? 'primary' : 'default'" @click="toggleLikeAction">
              {{ video.isLiked ? '取消点赞' : '点赞' }} {{ video.likeCount }}
            </el-button>
            <el-button :type="video.isFavorited ? 'warning' : 'default'" @click="toggleFavoriteAction">
              {{ video.isFavorited ? '取消收藏' : '收藏' }} {{ video.favoriteCount }}
            </el-button>
          </div>

          <div class="chips">
            <RouterLink :to="`/users/${video.creator.id}`" class="chip-link">作者 {{ video.creator.nickname }}</RouterLink>
            <span>粉丝 {{ video.creator.followerCount }}</span>
            <span>评论 {{ video.commentCount }}</span>
          </div>
        </div>
      </div>

      <aside class="side-column">
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

    <section class="danmaku-panel" v-if="video">
      <div class="comments-head">
        <h2>视频弹幕</h2>
        <el-button type="primary" plain @click="loadDanmakus">刷新弹幕</el-button>
      </div>

      <div class="danmaku-form">
        <el-input
          v-model="danmakuForm.content"
          placeholder="输入弹幕内容"
          @keyup.enter="submitDanmaku"
          style="flex: 1"
        />
        <el-color-picker v-model="danmakuForm.color" size="default" />
        <span class="time-badge">{{ formatMs(currentVideoTimeMs) }}</span>
        <el-button type="primary" @click="submitDanmaku">发送弹幕</el-button>
      </div>

      <div class="danmaku-list">
        <article v-for="item in danmakus" :key="item.id" class="reply-card">
          <strong :style="{ color: item.color || '#fff' }">{{ item.user.nickname }}</strong>
          <p>{{ item.content }}</p>
          <div class="comment-meta">
            <span>时间点 {{ formatMs(item.timeOffsetMs) }}</span>
            <button class="link-btn danger" @click="openReportDialog(item)">举报</button>
          </div>
        </article>
        <el-empty v-if="danmakus.length === 0" description="暂无弹幕" />
      </div>
    </section>

    <section class="comments" v-if="video">
      <div class="comments-head">
        <h2>评论区</h2>
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
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';

import {
  createComment,
  createDanmaku,
  favoriteVideo,
  fetchComments,
  fetchDanmakus,
  fetchRelatedVideos,
  fetchVideoDetail,
  followUser,
  likeVideo,
  reportContent,
  unfavoriteVideo,
  unfollowUser,
  unlikeVideo,
} from '@/api/platform';
import CommentThread from '@/components/CommentThread.vue';
import DanmakuOverlay from '@/components/DanmakuOverlay.vue';
import { useAppStore } from '@/stores/app';
import type { CommentItem, DanmakuItem, VideoCard, VideoDetail } from '@/types/api';

const route = useRoute();
const appStore = useAppStore();
const loading = ref(false);
const video = ref<VideoDetail | null>(null);
const recommendations = ref<VideoCard[]>([]);
const comments = ref<CommentItem[]>([]);
const danmakus = ref<DanmakuItem[]>([]);
const commentForm = ref('');
const replyForm = ref('');
const replyTargetId = ref<number | null>(null);

const videoRef = ref<HTMLVideoElement | null>(null);
const currentVideoTimeMs = ref(0);
const videoDurationMs = ref(0);
const danmakuVisible = ref(true);
const videoPaused = ref(true);

const danmakuForm = reactive({
  content: '',
  timeOffsetMs: 0,
  color: '#FFFFFF',
});

const reportDialogVisible = ref(false);
const reportTarget = ref<DanmakuItem | null>(null);
const reportReason = ref('');

const canFollow = computed(
  () => appStore.isLoggedIn && video.value && video.value.creator.id !== appStore.userId,
);

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
}

function onLoadedMetadata() {
  if (videoRef.value) {
    videoDurationMs.value = Math.floor(videoRef.value.duration * 1000);
    videoPaused.value = videoRef.value.paused;
  }
}

function onVideoPlay() {
  videoPaused.value = false;
}

function onVideoPause() {
  videoPaused.value = true;
}

async function loadDetail() {
  loading.value = true;
  try {
    video.value = await fetchVideoDetail(Number(route.params.id));
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

watch(
  () => route.params.id,
  async () => {
    await Promise.all([loadDetail(), loadRecommendations(), loadComments(), loadDanmakus()]);
  },
  { immediate: true },
);
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

.player-wrapper {
  position: relative;
  min-height: 420px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: #111827;
  border: 1px solid rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.video {
  width: 100%;
  min-height: 420px;
}

.danmaku-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  padding: 4px 10px;
}

.meta,
.comments,
.comment-card,
.reply-card,
.danmaku-panel,
.recommend-panel {
  display: grid;
  gap: 16px;
}

.meta,
.comments,
.comment-card,
.danmaku-panel,
.recommend-panel {
  padding: 20px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

.title-row,
.comments-head,
.action-row,
.danmaku-form,
.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.danmaku-form {
  align-items: center;
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

.chips,
.comment-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: #6b7280;
}

.comment-list,
.reply-list,
.danmaku-list,
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
.chip-link,
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
