<template>
  <section class="page" v-loading="loading">
    <div class="top-layout" v-if="video">
      <div class="main-column">
        <div class="player">
          <video v-if="video?.playUrl" class="video" controls :src="video.playUrl"></video>
          <span v-else>视频播放器占位</span>
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
        <el-input v-model="danmakuForm.content" placeholder="输入弹幕内容" />
        <el-input-number v-model="danmakuForm.timeOffsetMs" :min="0" :step="1000" />
        <el-button type="primary" @click="submitDanmaku">发送弹幕</el-button>
      </div>

      <div class="danmaku-list">
        <article v-for="item in danmakus" :key="item.id" class="reply-card">
          <strong>{{ item.user.nickname }}</strong>
          <p>{{ item.content }}</p>
          <div class="comment-meta">
            <span>时间点 {{ item.timeOffsetMs }} ms</span>
            <button class="link-btn danger" @click="reportDanmaku(item.id)">举报</button>
          </div>
        </article>
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
          <div class="comment-main">
            <strong>{{ item.user.nickname }}</strong>
            <p>{{ item.content }}</p>
            <div class="comment-meta">
              <span>{{ formatTime(item.createdAt) }}</span>
              <button class="link-btn" @click="toggleReplyBox(item.id)">回复</button>
              <button class="link-btn danger" @click="reportComment(item.id)">举报</button>
            </div>
          </div>

          <div v-if="replyTargetId === item.id" class="reply-box">
            <el-input
              v-model="replyForm"
              type="textarea"
              :rows="2"
              placeholder="输入回复内容"
            />
            <div class="comment-actions">
              <el-button type="primary" size="small" @click="submitReply(item.id, item.id)">发送回复</el-button>
            </div>
          </div>

          <div v-if="item.replies.length > 0" class="reply-list">
            <article v-for="reply in item.replies" :key="reply.id" class="reply-card">
              <strong>{{ reply.user.nickname }}</strong>
              <p>{{ reply.content }}</p>
              <span class="comment-meta">{{ formatTime(reply.createdAt) }}</span>
            </article>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';

import {
  createComment,
  createDanmaku,
  fetchComments,
  fetchDanmakus,
  fetchRelatedVideos,
  fetchVideoDetail,
  followUser,
  reportContent,
  toggleVideoFavorite,
  toggleVideoLike,
  unfollowUser,
} from '@/api/platform';
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
const danmakuForm = reactive({
  content: '',
  timeOffsetMs: 1000,
});

const canFollow = computed(
  () => appStore.isLoggedIn && video.value && video.value.creator.id !== appStore.userId,
);

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
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
    danmakus.value = await fetchDanmakus(Number(route.params.id));
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
    const result = await toggleVideoLike(video.value.id);
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
    const result = await toggleVideoFavorite(video.value.id);
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

async function reportDanmaku(danmakuId: number) {
  try {
    await reportContent({
      targetType: 'VIDEO_DANMAKU',
      targetId: danmakuId,
      reason: '弹幕内容存在风险或不当信息',
    });
    ElMessage.success('弹幕举报已提交');
  } catch {
    ElMessage.error('弹幕举报失败，请确认已登录');
  }
}

async function submitDanmaku() {
  if (!danmakuForm.content.trim()) {
    ElMessage.warning('请输入弹幕内容');
    return;
  }

  try {
    await createDanmaku(Number(route.params.id), {
      content: danmakuForm.content.trim(),
      timeOffsetMs: danmakuForm.timeOffsetMs,
    });
    danmakuForm.content = '';
    ElMessage.success('弹幕发送成功');
    await loadDanmakus();
  } catch {
    ElMessage.error('弹幕发送失败，请确认已登录');
  }
}

onMounted(async () => {
  await Promise.all([loadDetail(), loadRecommendations(), loadComments(), loadDanmakus()]);
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

.player {
  min-height: 420px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.65);
  border: 1px dashed rgba(148, 163, 184, 0.35);
  overflow: hidden;
}

.video {
  width: 100%;
  min-height: 420px;
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
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
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

.chips,
.comment-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: #94a3b8;
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
  background: rgba(15, 23, 42, 0.55);
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
}

.link-btn,
.chip-link,
.secondary-link {
  color: #60a5fa;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.link-btn.danger {
  color: #fca5a5;
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

.recommend-meta span {
  color: #cbd5e1;
}
</style>
