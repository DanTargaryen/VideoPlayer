<template>
  <article class="feed-card" :style="{ '--item-index': index }">
    <header class="feed-card-head">
      <RouterLink :to="`/users/${item.author.id}`" class="author-link">
        <img v-if="item.author.avatar" :src="item.author.avatar" :alt="item.author.username" class="avatar" />
        <span v-else class="avatar fallback">{{ item.author.username.slice(0, 1) }}</span>
        <span class="author-copy">
          <strong>{{ item.author.username }}</strong>
          <span>{{ item.actionText }} · {{ relativeTime }}</span>
        </span>
      </RouterLink>
      <button type="button" class="more-button" aria-label="更多操作">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <span class="type-badge" :class="`type-${renderType}`">{{ typeLabel }}</span>
    </header>

    <DynamicVideoCard v-if="renderType === 'video'" :item="item" />
    <ImageTextDynamicCard v-else-if="renderType === 'image_text'" :item="item" />
    <TextDynamicCard v-else-if="renderType === 'text'" :item="item" />
    <ImageDynamicCard v-else-if="renderType === 'image'" :item="item" />
    <DynamicLiveCard v-else-if="renderType === 'live'" :item="item" />
    <DynamicVideoCard v-else-if="item.cover" :item="item" />
    <TextDynamicCard v-else :item="item" />

    <footer class="interaction-row" :class="{ 'without-collect': !hasCollectButton }">
      <button
        type="button"
        class="interaction-button like-button"
        :class="{ active: liked }"
        :disabled="liking"
        @click="handleLike"
      >
        <el-icon><Pointer /></el-icon>
        <span>点赞</span>
        <strong>{{ formatCompactNumber(likeCount) }}</strong>
      </button>
      <button type="button" class="interaction-button" @click="handleComment">
        <el-icon><ChatDotRound /></el-icon>
        <span>评论</span>
        <strong>{{ formatCompactNumber(commentCount) }}</strong>
      </button>
      <button
        v-if="hasCollectButton"
        type="button"
        class="interaction-button"
        :class="{ active: collected }"
        :disabled="collecting || favoriteFolderLoading"
        @click="handleCollect"
      >
        <el-icon><Star /></el-icon>
        <span>{{ collected ? '已收藏' : '收藏' }}</span>
      </button>
    </footer>

    <section v-if="commentPanelVisible && dynamicPostId" class="comment-panel">
      <div class="comment-panel-head">
        <strong>评论</strong>
        <span>{{ formatCompactNumber(commentCount) }} 条</span>
      </div>

      <div v-if="commentsLoading" class="comment-loading">正在加载评论...</div>
      <div v-else-if="postComments.length > 0" class="comment-list">
        <article v-for="comment in postComments" :key="comment.id" class="comment-item">
          <img v-if="comment.user.avatarUrl" :src="comment.user.avatarUrl" :alt="comment.user.nickname" />
          <span v-else class="comment-avatar-fallback">{{ comment.user.nickname.slice(0, 1) }}</span>
          <div class="comment-copy">
            <div class="comment-meta">
              <strong>{{ comment.user.nickname }}</strong>
              <span>{{ formatCommentTime(comment.createdAt) }}</span>
            </div>
            <p>{{ comment.content }}</p>
          </div>
        </article>
      </div>
      <p v-else class="comment-empty">还没有评论，来发第一条吧</p>

      <div v-if="store.isLoggedIn" class="comment-composer">
        <el-input
          v-model="commentDraft"
          type="textarea"
          :autosize="{ minRows: 1, maxRows: 4 }"
          resize="none"
          maxlength="1000"
          placeholder="写下你的评论"
          @keydown.enter.exact.prevent="submitPostComment"
        />
        <el-button type="primary" :loading="commentSubmitting" @click="submitPostComment">发送</el-button>
      </div>
      <button v-else type="button" class="comment-login" @click="goToLogin">登录后评论</button>
    </section>

    <el-dialog
      v-model="favoriteDialogVisible"
      title="选择收藏夹"
      width="min(420px, calc(100vw - 32px))"
      append-to-body
      align-center
      destroy-on-close
      modal-class="dynamic-favorite-modal"
      class="dynamic-favorite-dialog"
      :close-on-click-modal="false"
    >
      <div class="favorite-dialog-body" v-loading="favoriteFolderLoading">
        <div v-if="favoriteFolderOptions.length > 0" class="favorite-dialog-list">
          <label
            v-for="folder in favoriteFolderOptions"
            :key="folder.id"
            class="favorite-dialog-item"
            :class="{ active: selectedFavoriteFolderId === folder.id }"
          >
            <el-radio v-model="selectedFavoriteFolderId" :value="folder.id">
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
          :loading="collecting"
          :disabled="favoriteFolderLoading || !selectedFavoriteFolderId"
          @click="confirmCollectVideo"
        >
          确认收藏
        </el-button>
      </template>
    </el-dialog>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ChatDotRound, Pointer, Star } from '@element-plus/icons-vue';

import {
  createDynamicPostComment,
  fetchDynamicPostComments,
  likeDynamicPost,
  unlikeDynamicPost,
} from '@/api/feed';
import {
  favoriteVideo,
  fetchMyFavoriteFolders,
  likeVideo,
  unfavoriteVideo,
  unlikeVideo,
} from '@/api/platform';
import { useAppStore } from '@/stores/app';
import type { DynamicFeedItem, DynamicPostCommentItem, FavoriteFolderSummary } from '@/types/api';
import { normalizeDynamicType } from '@/utils/dynamicFeed';
import DynamicLiveCard from './DynamicLiveCard.vue';
import DynamicVideoCard from './DynamicVideoCard.vue';
import ImageDynamicCard from './ImageDynamicCard.vue';
import ImageTextDynamicCard from './ImageTextDynamicCard.vue';
import TextDynamicCard from './TextDynamicCard.vue';

const props = defineProps<{
  item: DynamicFeedItem;
  index: number;
}>();

const router = useRouter();
const store = useAppStore();

const liked = ref(false);
const collected = ref(false);
const likeCount = ref(0);
const commentCount = ref(0);
const liking = ref(false);
const collecting = ref(false);
const commentPanelVisible = ref(false);
const commentsLoading = ref(false);
const commentSubmitting = ref(false);
const commentsLoaded = ref(false);
const commentDraft = ref('');
const postComments = ref<DynamicPostCommentItem[]>([]);
const favoriteDialogVisible = ref(false);
const favoriteFolderOptions = ref<FavoriteFolderSummary[]>([]);
const favoriteFolderLoading = ref(false);
const selectedFavoriteFolderId = ref<number | null>(null);

const relativeTime = computed(() => formatRelativeTime(props.item.createdAt));
const renderType = computed(() => normalizeDynamicType(props.item));
const typeLabel = computed(() => {
  const labels: Record<string, string> = {
    video: '视频',
    image_text: '图文',
    text: '动态',
    image: '图片',
    live: '直播',
    recommend: '推荐',
  };
  return labels[renderType.value] ?? '动态';
});
const dynamicPostId = computed(() => parseItemId('dynamic-post-'));
const videoTargetId = computed(() => (renderType.value === 'video' ? parseItemId('video-') : null));
const hasCollectButton = computed(() => Boolean(videoTargetId.value));

watch(
  () => props.item,
  () => {
    syncInteractionState();
  },
  { immediate: true },
);

function syncInteractionState() {
  liked.value = Boolean(props.item.stats?.liked);
  collected.value = Boolean(props.item.stats?.favorited);
  likeCount.value = Math.max(0, Number(props.item.stats?.likes ?? 0));
  commentCount.value = Math.max(0, Number(props.item.stats?.comments ?? 0));
  collecting.value = false;
  commentPanelVisible.value = false;
  commentsLoading.value = false;
  commentSubmitting.value = false;
  commentsLoaded.value = false;
  commentDraft.value = '';
  postComments.value = [];
  favoriteDialogVisible.value = false;
  favoriteFolderLoading.value = false;
  selectedFavoriteFolderId.value = null;
  favoriteFolderOptions.value = [];
}

async function handleCollect() {
  if (!store.isLoggedIn) {
    ElMessage.warning('请先登录后收藏');
    await router.push('/login');
    return;
  }

  const videoId = videoTargetId.value;
  if (!videoId) {
    ElMessage.info('这条动态暂不支持收藏');
    return;
  }

  if (collecting.value || favoriteFolderLoading.value) {
    return;
  }

  if (collected.value) {
    collecting.value = true;
    try {
      const result = await unfavoriteVideo(videoId);
      collected.value = result.favorited;
      ElMessage.success(result.favorited ? '收藏成功' : '已取消收藏');
    } catch {
      ElMessage.error('操作失败，请确认已登录');
    } finally {
      collecting.value = false;
    }
    return;
  }

  await openFavoriteDialog();
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

async function confirmCollectVideo() {
  const videoId = videoTargetId.value;
  if (!videoId || !selectedFavoriteFolderId.value) {
    ElMessage.warning('请选择一个收藏夹');
    return;
  }

  collecting.value = true;
  try {
    await favoriteVideo(videoId, { folderId: selectedFavoriteFolderId.value });
    collected.value = true;
    favoriteDialogVisible.value = false;
    ElMessage.success('收藏成功');
  } catch {
    ElMessage.error('收藏失败，请确认已登录');
  } finally {
    collecting.value = false;
  }
}

function parseItemId(prefix: string) {
  if (!props.item.id.startsWith(prefix)) {
    return null;
  }

  const id = Number(props.item.id.slice(prefix.length));
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function handleLike() {
  if (!store.isLoggedIn) {
    ElMessage.warning('请先登录后点赞');
    await router.push('/login');
    return;
  }

  const postId = dynamicPostId.value;
  const videoId = videoTargetId.value;
  if (!postId && !videoId) {
    ElMessage.info('这条动态暂不支持点赞');
    return;
  }

  if (liking.value) {
    return;
  }

  const nextLiked = !liked.value;
  liking.value = true;

  try {
    if (postId) {
      const result = nextLiked ? await likeDynamicPost(postId) : await unlikeDynamicPost(postId);
      liked.value = result.liked;
      likeCount.value = result.likeCount;
    } else if (videoId) {
      if (nextLiked) {
        await likeVideo(videoId);
      } else {
        await unlikeVideo(videoId);
      }
      liked.value = nextLiked;
      likeCount.value = Math.max(0, likeCount.value + (nextLiked ? 1 : -1));
    }
  } catch {
    ElMessage.error('点赞失败，请稍后重试');
  } finally {
    liking.value = false;
  }
}

async function handleComment() {
  const postId = dynamicPostId.value;
  if (postId) {
    commentPanelVisible.value = !commentPanelVisible.value;
    if (commentPanelVisible.value && !commentsLoaded.value) {
      await loadPostComments(postId);
    }
    return;
  }

  const videoId = videoTargetId.value;
  if (videoId) {
    await router.push(`/video/${videoId}#comments`);
    return;
  }

  ElMessage.info('这条动态暂不支持评论');
}

async function loadPostComments(postId: number) {
  commentsLoading.value = true;
  try {
    const result = await fetchDynamicPostComments(postId);
    postComments.value = result.items;
    commentsLoaded.value = true;
  } catch {
    ElMessage.error('加载评论失败，请稍后重试');
  } finally {
    commentsLoading.value = false;
  }
}

async function submitPostComment() {
  const postId = dynamicPostId.value;
  const content = commentDraft.value.trim();

  if (!postId || commentSubmitting.value) {
    return;
  }

  if (!content) {
    ElMessage.warning('请输入评论内容');
    return;
  }

  commentSubmitting.value = true;
  try {
    const created = await createDynamicPostComment(postId, content);
    postComments.value = [...postComments.value, created];
    commentsLoaded.value = true;
    commentDraft.value = '';
    commentCount.value += 1;
    ElMessage.success('评论成功');
  } catch {
    ElMessage.error('评论失败，请稍后重试');
  } finally {
    commentSubmitting.value = false;
  }
}

async function goToLogin() {
  await router.push('/login');
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - Date.parse(value);
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 2) {
    return `昨天 ${new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `${days}天前`;
}

function formatCommentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '刚刚';
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCompactNumber(value: number) {
  const count = Number(value ?? 0);
  if (count >= 10000) {
    return `${(count / 10000).toFixed(count >= 100000 ? 0 : 1)}万`;
  }
  return String(count);
}
</script>

<style scoped>
.feed-card {
  display: grid;
  gap: 11px;
  padding: 15px 16px 12px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-bg-card);
  box-shadow: var(--gl-shadow-card);
  animation: feed-card-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--item-index) * 45ms);
  transition: transform var(--gl-transition), box-shadow var(--gl-transition), border-color var(--gl-transition);
}

.feed-card:hover {
  border-color: #dbeafe;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.feed-card-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
}

.author-link {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar.fallback {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #dbeafe, #f1f5f9);
  color: var(--color-primary);
  font-weight: 900;
}

.author-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.author-copy strong {
  color: var(--color-text-main);
  font-size: 14px;
}

.author-copy span {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.more-button {
  display: inline-grid;
  place-items: center;
  gap: 3px;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: background var(--gl-transition), transform var(--gl-transition);
}

.more-button span {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-text-secondary);
}

.more-button:hover {
  background: var(--color-primary-light);
}

.more-button:active {
  transform: translateY(1px) scale(0.95);
}

.type-badge {
  grid-column: 2;
  grid-row: 1;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 900;
}

.more-button {
  grid-column: 3;
  grid-row: 1;
}

.type-image_text {
  background: #f0fdf4;
  color: #15803d;
}

.type-image {
  background: #fff1f2;
  color: #be123c;
}

.type-text {
  background: #f1f5f9;
  color: var(--color-text-secondary);
}

.type-live {
  background: #fff1f2;
  color: var(--color-danger);
}

.interaction-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--color-border-soft);
  padding-top: 9px;
}

.interaction-row.without-collect {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.interaction-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 30px;
  font-size: 13px;
  border: 0;
  border-right: 1px solid var(--color-border-soft);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-weight: 700;
  transition: color var(--gl-transition), transform var(--gl-transition);
}

.interaction-button:last-child {
  border-right: 0;
}

.interaction-button strong {
  color: inherit;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.interaction-button:first-child {
  border-left: 0;
}

.interaction-button:hover,
.interaction-button.active {
  color: var(--color-primary);
}

.like-button.active {
  color: var(--color-danger);
}

.interaction-button:disabled {
  cursor: wait;
  opacity: 0.68;
}

.interaction-button:active:not(:disabled) {
  transform: translateY(1px) scale(0.98);
}

.comment-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border-soft);
  border-radius: 14px;
  background: var(--color-bg-page);
}

.comment-panel-head,
.comment-meta,
.comment-composer {
  display: flex;
  align-items: center;
}

.comment-panel-head {
  justify-content: space-between;
}

.comment-panel-head strong {
  color: var(--color-text-main);
  font-size: 14px;
}

.comment-panel-head span,
.comment-meta span,
.comment-empty,
.comment-loading {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.comment-list {
  display: grid;
  gap: 12px;
  max-height: 260px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 6px;
  scrollbar-color: rgba(37, 99, 235, 0.44) rgba(226, 232, 240, 0.72);
  scrollbar-gutter: stable;
  scrollbar-width: thin;
}

.comment-list::-webkit-scrollbar {
  width: 8px;
}

.comment-list::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.78);
}

.comment-list::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.68);
  background-clip: content-box;
}

.comment-list::-webkit-scrollbar-thumb:hover {
  background: rgba(37, 99, 235, 0.76);
  background-clip: content-box;
}

.comment-item {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 10px;
}

.comment-item img,
.comment-avatar-fallback {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.comment-item img {
  object-fit: cover;
}

.comment-avatar-fallback {
  display: grid;
  place-items: center;
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 900;
}

.comment-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.comment-meta {
  gap: 8px;
}

.comment-meta strong {
  overflow: hidden;
  color: var(--color-text-main);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-copy p,
.comment-empty {
  margin: 0;
}

.comment-copy p {
  color: var(--color-text-main);
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.comment-composer {
  gap: 10px;
}

.comment-composer :deep(.el-textarea__inner) {
  border-radius: 12px;
}

.comment-login {
  justify-self: start;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid var(--color-primary);
  border-radius: 999px;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 800;
}

.comment-login:hover {
  background: var(--color-primary-light);
}

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
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  transition: border-color var(--gl-transition), background var(--gl-transition);
}

.favorite-dialog-item.active {
  border-color: #bfdbfe;
  background: var(--color-primary-light);
}

.favorite-dialog-item :deep(.el-radio) {
  margin-right: 0;
}

.favorite-dialog-count {
  color: var(--color-text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

:global(.dynamic-favorite-modal) {
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(2px);
}

:global(.dynamic-favorite-dialog.el-dialog) {
  overflow: hidden;
  border-radius: 18px;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.18);
}

:global(.dynamic-favorite-dialog .el-dialog__header) {
  margin: 0;
  padding: 24px 24px 12px;
}

:global(.dynamic-favorite-dialog .el-dialog__title) {
  color: var(--color-text-main);
  font-size: 20px;
  font-weight: 800;
}

:global(.dynamic-favorite-dialog .el-dialog__headerbtn) {
  top: 18px;
  right: 18px;
}

:global(.dynamic-favorite-dialog .el-dialog__body) {
  padding: 10px 24px 4px;
}

:global(.dynamic-favorite-dialog .el-dialog__footer) {
  padding: 16px 24px 22px;
}

:global(.dynamic-favorite-dialog .el-dialog__footer .el-button) {
  min-width: 88px;
  border-radius: 999px;
  font-weight: 700;
}

@keyframes feed-card-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 560px) {
  .feed-card {
    padding: 16px;
  }

  .interaction-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 6px;
  }

  .interaction-button {
    border-right: 0;
  }

  .comment-composer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
