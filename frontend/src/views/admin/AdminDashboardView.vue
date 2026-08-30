<template>
  <section class="page">
    <div class="hero">
      <div>
        <h1>审核后台</h1>
        <p>这里统一处理视频审核、文本审核和举报记录。</p>
      </div>
      <el-button type="primary" @click="refreshAll">
        <el-icon><RefreshRight /></el-icon>
        <span>刷新数据</span>
      </el-button>
    </div>

    <div class="stats-grid">
      <article class="stat-card" v-for="item in statCards" :key="item.label">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <section class="panel">
      <h2>视频审核记录</h2>
      <div class="review-list">
        <article v-for="item in queue" :key="String(item.id)" class="review-card">
          <button
            v-if="item.video"
            class="review-cover-button"
            type="button"
            @click="openVideoPreview(item)"
          >
            <img :src="item.video.coverUrl" :alt="item.video.title" class="review-cover-thumb" />
            <span class="review-cover-overlay">查看完整视频</span>
          </button>
          <div class="review-main">
            <h3>{{ item.video?.title }}</h3>
            <p>{{ item.video?.description }}</p>
            <span class="status">审核记录 ID：{{ item.id }} · 状态：{{ formatReviewStatus(item.status) }}</span>
            <span class="status">提交时间：{{ formatTime(item.createdAt) }}</span>
            <span v-if="item.reviewedAt" class="status">
              审核时间：{{ formatTime(item.reviewedAt) }} · 审核人：{{ item.reviewer?.nickname || '管理员' }}
            </span>
            <span v-if="item.reason" class="status">审核意见：{{ item.reason }}</span>
          </div>
          <div class="actions">
            <el-button plain :disabled="!item.video?.playUrl" @click="openVideoPreview(item)">预览视频</el-button>
            <el-button type="success" @click="handleReview(Number(item.id), 'APPROVE')">
              {{ item.status === 'REJECTED' ? '改为通过' : '通过' }}
            </el-button>
            <el-button type="danger" plain @click="handleReview(Number(item.id), 'REJECT')">
              {{ item.status === 'APPROVED' ? '撤回并驳回' : '驳回' }}
            </el-button>
          </div>
        </article>
        <el-empty v-if="queue.length === 0" description="当前没有视频审核记录" />
      </div>
    </section>

    <el-dialog v-model="previewDialogVisible" :title="previewItem?.video?.title || '视频预览'" width="860px" top="6vh">
      <div v-if="previewItem?.video" class="preview-dialog-body">
        <video
          ref="previewPlayerRef"
          :key="`${previewItem.video.id}-${previewItem.video.playUrl}-${previewItem.video.coverUrl}`"
          class="preview-player"
          :src="previewItem.video.playUrl"
          controls
          preload="auto"
        />
        <p class="preview-description">{{ previewItem.video.description || '暂无简介' }}</p>
      </div>
    </el-dialog>

    <section class="panel">
      <div class="panel-head">
        <h2>文本审核</h2>
        <el-select v-model="textFilter" placeholder="筛选类型" style="width: 180px">
          <el-option label="全部" value="ALL" />
          <el-option label="评论" value="COMMENT" />
          <el-option label="视频弹幕" value="VIDEO_DANMAKU" />
        </el-select>
      </div>
      <div class="review-list">
        <article v-for="item in textReviews" :key="`${item.targetType}-${item.id}`" class="review-card">
          <div>
            <h3>{{ item.targetType }} · {{ item.video?.title || `视频 #${item.videoId || '未知'}` }}</h3>
            <p>{{ item.content || '内容快照暂不可用' }}</p>
            <span class="status">状态：{{ item.status }} · 用户：{{ item.user?.nickname || '未知用户' }}</span>
          </div>
          <div class="actions">
            <el-button @click="handleTextModeration(item.targetType, item.targetId, 'KEEP')">保留</el-button>
            <el-button type="warning" @click="handleTextModeration(item.targetType, item.targetId, 'HIDE')">隐藏</el-button>
            <el-button type="danger" plain @click="handleTextModeration(item.targetType, item.targetId, 'DELETE')">删除</el-button>
          </div>
        </article>
        <el-empty v-if="textReviews.length === 0" description="当前没有待处理文本内容" />
      </div>
    </section>

    <section class="panel">
      <h2>举报处理</h2>
      <div class="review-list">
        <article v-for="item in reports" :key="item.id" class="review-card">
          <div>
            <h3 class="report-title">
              <span>{{ formatReportTargetType(item.targetType) }} 举报</span>
              <el-tag size="small" :type="item.status === 'PENDING' ? 'warning' : 'success'">
                {{ formatReportStatus(item.status) }}
              </el-tag>
            </h3>
            <p>原因：{{ item.reason }}</p>
            <p v-if="item.video">视频：{{ item.video.title }}</p>
            <p v-if="item.comment">评论：{{ item.comment.content }}</p>
            <p v-if="item.danmaku">弹幕：{{ item.danmaku.content }}</p>
            <span class="status">举报人：{{ item.reporter?.nickname || '未知用户' }} · 提交时间：{{ formatTime(item.createdAt) }}</span>
            <span v-if="isReportHandled(item)" class="status">
              处理时间：{{ formatTime(item.handledAt) }} · 处理人：{{ item.handler?.nickname || '管理员' }}
            </span>
            <span v-if="item.handleNote" class="status">处理备注：{{ item.handleNote }}</span>
          </div>
          <div class="actions">
            <template v-if="item.status === 'PENDING'">
              <el-button @click="handleReportAction(item.id, 'KEEP')">保留</el-button>
              <el-button type="danger" plain @click="handleReportAction(item.id, 'DELETE')">删除</el-button>
            </template>
            <template v-else>
              <el-button disabled>已处理</el-button>
              <el-button type="danger" plain @click="deleteHandledReport(item.id)">删除记录</el-button>
            </template>
          </div>
        </article>
        <el-empty v-if="reports.length === 0" description="当前没有举报记录" />
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { RefreshRight } from '@element-plus/icons-vue';

import {
  deleteReportRecord,
  fetchAdminDashboard,
  fetchReports,
  fetchReviewQueue,
  fetchTextReviewQueue,
  handleReport,
  moderateTextContent,
  reviewVideo,
} from '@/api/platform';
import type { ReportItem, ReviewQueueItem, TextReviewItem } from '@/types/api';

const dashboard = ref<Record<string, number | string>>({});
const queue = ref<ReviewQueueItem[]>([]);
const textReviews = ref<TextReviewItem[]>([]);
const reports = ref<ReportItem[]>([]);
const textFilter = ref<'ALL' | 'COMMENT' | 'VIDEO_DANMAKU'>('ALL');
const previewDialogVisible = ref(false);
const previewItem = ref<ReviewQueueItem | null>(null);
const previewPlayerRef = ref<HTMLVideoElement | null>(null);

const statCards = computed(() => {
  const available = [
    { key: 'totalVideos', label: '总视频数' },
    { key: 'pendingReviews', label: '待审视频' },
    { key: 'pendingReports', label: '待处理举报' },
    { key: 'retryingDecisions', label: '待重试处置' },
    { key: 'hiddenComments', label: '异常评论' },
    { key: 'hiddenDanmakus', label: '异常弹幕' },
  ];
  return available.flatMap(({ key, label }) => {
    const value = dashboard.value[key];
    return typeof value === 'number' ? [{ label, value }] : [];
  });
});

function formatTime(value?: string | null) {
  if (!value) return '暂无';
  return new Date(value).toLocaleString('zh-CN');
}

function formatReviewStatus(status: ReviewQueueItem['status']) {
  if (status === 'APPROVED') return '已通过';
  if (status === 'REJECTED') return '已驳回';
  return '待审核';
}

function formatReportTargetType(targetType: ReportItem['targetType']) {
  if (targetType === 'VIDEO') return '视频';
  if (targetType === 'COMMENT') return '评论';
  return '弹幕';
}

function formatReportStatus(status: ReportItem['status']) {
  if (status === 'PENDING') return '待处理';
  return '已处理';
}

function isReportHandled(item: ReportItem) {
  return item.status !== 'PENDING';
}

function isUserCancelled(error: unknown) {
  return error === 'cancel' || error === 'close';
}

async function loadTextReviews() {
  textReviews.value = await fetchTextReviewQueue(textFilter.value === 'ALL' ? undefined : textFilter.value);
}

async function refreshAll() {
  dashboard.value = await fetchAdminDashboard();
  queue.value = await fetchReviewQueue();
  reports.value = await fetchReports();
  await loadTextReviews();
}

function openVideoPreview(item: ReviewQueueItem) {
  if (!item.video?.playUrl) {
    ElMessage.warning('当前稿件暂时没有可播放的视频地址');
    return;
  }

  previewItem.value = item;
  previewDialogVisible.value = true;
}

function resetPreviewPlayer() {
  const player = previewPlayerRef.value;
  if (!player) {
    return;
  }
  player.pause();
  try {
    player.currentTime = 0;
  } catch {
    // Some media sources reject seeks before their metadata is ready.
  }
}

async function handleReview(id: number, action: 'APPROVE' | 'REJECT') {
  let reason: string | undefined;

  try {
    if (action === 'REJECT') {
      const result = await ElMessageBox.prompt('请输入驳回原因', '驳回视频', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
      });
      reason = result.value;
    }

    await reviewVideo(id, action, reason);
  } catch (error) {
    if (isUserCancelled(error)) {
      return;
    }
    ElMessage.error('审核操作失败');
    return;
  }

  ElMessage.success(action === 'APPROVE' ? '审核通过' : '已驳回视频');
  try {
    await refreshAll();
  } catch {
    // 审核已成功，刷新列表失败时不重复提示失败。
  }
}

async function handleTextModeration(
  targetType: 'COMMENT' | 'VIDEO_DANMAKU',
  targetId: string,
  action: 'KEEP' | 'HIDE' | 'DELETE',
) {
  try {
    await moderateTextContent(targetType, targetId, action);
  } catch {
    ElMessage.error('文本审核处理失败');
    return;
  }

  ElMessage.success('文本审核处理完成');
  try {
    await refreshAll();
  } catch {
    // 处理已成功，刷新列表失败时不重复提示失败。
  }
}

async function handleReportAction(id: number, action: 'KEEP' | 'DELETE') {
  let reason: string | undefined;

  try {
    if (action !== 'KEEP') {
      const result = await ElMessageBox.prompt('请输入处理备注', '处理举报', {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
      });
      reason = result.value;
    }

    await handleReport(id, action, reason);
  } catch (error) {
    if (isUserCancelled(error)) {
      return;
    }
    ElMessage.error('举报处理失败');
    return;
  }

  ElMessage.success('举报处理完成');
  try {
    await refreshAll();
  } catch {
    // 处理已成功，刷新列表失败时不重复提示失败。
  }
}

async function deleteHandledReport(id: number) {
  try {
    await ElMessageBox.confirm('删除后该举报记录不再显示，已完成的内容处置结果不会回退。', '删除举报记录', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await deleteReportRecord(id);
  } catch (error) {
    if (isUserCancelled(error)) {
      return;
    }
    ElMessage.error('举报记录删除失败');
    return;
  }

  ElMessage.success('举报记录已删除');
  try {
    await refreshAll();
  } catch {
    // 记录已删除，刷新列表失败时不重复提示失败。
  }
}

watch(textFilter, () => {
  void loadTextReviews();
});

watch(previewDialogVisible, async (visible) => {
  if (!visible) {
    resetPreviewPlayer();
    return;
  }

  await nextTick();
  previewPlayerRef.value?.load();
});

onMounted(async () => {
  try {
    await refreshAll();
  } catch {
    ElMessage.warning('请先登录管理员账号查看此页面');
  }
});
</script>

<style scoped>
.page {
  display: grid;
  gap: 20px;
}

.hero h1 {
  margin: 0;
  color: #111827;
}

.hero p {
  margin: 4px 0 0;
  color: #4b5563;
}

.hero,
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.stat-card,
.panel,
.review-card {
  padding: 20px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

.stat-card {
  display: grid;
  gap: 8px;
}

.stat-card span {
  color: #6b7280;
  font-size: 14px;
}

.stat-card strong {
  font-size: 28px;
  color: #111827;
}

.panel {
  display: grid;
  gap: 16px;
}

.panel h2 {
  margin: 0;
  color: #111827;
}

.review-list {
  display: grid;
  gap: 12px;
}

.review-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.review-main {
  flex: 1;
  min-width: 0;
}

.review-card h3 {
  margin: 0;
  color: #111827;
}

.report-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.review-card p {
  color: #4b5563;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.review-cover-button {
  position: relative;
  width: 220px;
  min-width: 220px;
  aspect-ratio: 16 / 9;
  padding: 0;
  border: 0;
  border-radius: 14px;
  overflow: hidden;
  background: #dbe4f0;
  cursor: pointer;
}

.review-cover-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.review-cover-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: 10px 12px;
  background: linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.82));
  color: #fff;
  font-size: 13px;
  text-align: left;
}

.status {
  display: block;
  margin-top: 8px;
  color: #6b7280;
}

.preview-dialog-body {
  display: grid;
  gap: 16px;
}

.preview-player {
  width: 100%;
  max-height: 70vh;
  border-radius: 16px;
  background: #000;
}

.preview-description {
  margin: 0;
  color: #4b5563;
  line-height: 1.7;
}
</style>
