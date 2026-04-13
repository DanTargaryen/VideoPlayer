<template>
  <section class="page">
    <div class="hero">
      <div>
        <h1>审核后台</h1>
        <p>这里统一处理视频审核、文本审核和举报记录。</p>
      </div>
      <el-button type="primary" @click="refreshAll">刷新数据</el-button>
    </div>

    <div class="stats-grid">
      <article class="stat-card" v-for="item in statCards" :key="item.label">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <section class="panel">
      <h2>待审视频队列</h2>
      <div class="review-list">
        <article v-for="item in queue" :key="String(item.id)" class="review-card">
          <div>
            <h3>{{ item.video?.title }}</h3>
            <p>{{ item.video?.description }}</p>
            <span class="status">审核记录 ID：{{ item.id }}</span>
          </div>
          <div class="actions">
            <el-button type="success" @click="handleReview(Number(item.id), 'APPROVE')">通过</el-button>
            <el-button type="danger" plain @click="handleReview(Number(item.id), 'REJECT')">驳回</el-button>
          </div>
        </article>
        <el-empty v-if="queue.length === 0" description="当前没有待审视频" />
      </div>
    </section>

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
            <h3>{{ item.targetType }} · {{ item.video.title }}</h3>
            <p>{{ item.content }}</p>
            <span class="status">状态：{{ item.status }} · 用户：{{ item.user.nickname }}</span>
          </div>
          <div class="actions">
            <el-button @click="handleTextModeration(item.targetType, item.id, 'KEEP')">保留</el-button>
            <el-button type="warning" @click="handleTextModeration(item.targetType, item.id, 'HIDE')">隐藏</el-button>
            <el-button type="danger" plain @click="handleTextModeration(item.targetType, item.id, 'DELETE')">删除</el-button>
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
            <h3>{{ item.targetType }} 举报</h3>
            <p>原因：{{ item.reason }}</p>
            <p v-if="item.video">视频：{{ item.video.title }}</p>
            <p v-if="item.comment">评论：{{ item.comment.content }}</p>
            <p v-if="item.danmaku">弹幕：{{ item.danmaku.content }}</p>
            <span class="status">状态：{{ item.status }} · 举报人：{{ item.reporter?.nickname }}</span>
          </div>
          <div class="actions">
            <el-button @click="handleReportAction(item.id, 'KEEP')">保留</el-button>
            <el-button type="warning" @click="handleReportAction(item.id, 'HIDE')">隐藏</el-button>
            <el-button type="danger" plain @click="handleReportAction(item.id, 'DELETE')">删除</el-button>
          </div>
        </article>
        <el-empty v-if="reports.length === 0" description="当前没有举报记录" />
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  fetchAdminDashboard,
  fetchReports,
  fetchReviewQueue,
  fetchTextReviewQueue,
  handleReport,
  moderateTextContent,
  reviewVideo,
} from '@/api/platform';
import type { ReportItem, TextReviewItem } from '@/types/api';

const dashboard = ref<Record<string, number | string>>({});
const queue = ref<import('@/types/api').ReviewQueueItem[]>([]);
const textReviews = ref<TextReviewItem[]>([]);
const reports = ref<ReportItem[]>([]);
const textFilter = ref<'ALL' | 'COMMENT' | 'VIDEO_DANMAKU'>('ALL');

const statCards = computed(() => [
  { label: '总视频数', value: dashboard.value.totalVideos ?? 0 },
  { label: '待审视频', value: dashboard.value.pendingReviews ?? 0 },
  { label: '待处理举报', value: dashboard.value.pendingReports ?? 0 },
  { label: '异常评论', value: dashboard.value.hiddenComments ?? 0 },
  { label: '异常弹幕', value: dashboard.value.hiddenDanmakus ?? 0 },
]);

async function loadTextReviews() {
  textReviews.value = await fetchTextReviewQueue(textFilter.value === 'ALL' ? undefined : textFilter.value);
}

async function refreshAll() {
  dashboard.value = await fetchAdminDashboard();
  queue.value = await fetchReviewQueue();
  reports.value = await fetchReports();
  await loadTextReviews();
}

async function handleReview(id: number, action: 'APPROVE' | 'REJECT') {
  try {
    const reason =
      action === 'REJECT'
        ? await ElMessageBox.prompt('请输入驳回原因', '驳回视频', {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
          }).then((result) => result.value)
        : undefined;

    await reviewVideo(id, action, reason);
    ElMessage.success(action === 'APPROVE' ? '审核通过' : '已驳回视频');
    await refreshAll();
  } catch (error) {
    if (action === 'REJECT') {
      return;
    }
    ElMessage.error('审核操作失败');
  }
}

async function handleTextModeration(
  targetType: 'COMMENT' | 'VIDEO_DANMAKU',
  id: number,
  action: 'KEEP' | 'HIDE' | 'DELETE',
) {
  try {
    await moderateTextContent(targetType, id, action);
    ElMessage.success('文本审核处理完成');
    await refreshAll();
  } catch {
    ElMessage.error('文本审核处理失败');
  }
}

async function handleReportAction(id: number, action: 'KEEP' | 'HIDE' | 'DELETE') {
  try {
    const reason =
      action !== 'KEEP'
        ? await ElMessageBox.prompt('请输入处理备注', '处理举报', {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
          }).then((result) => result.value)
        : undefined;
    await handleReport(id, action, reason);
    ElMessage.success('举报处理完成');
    await refreshAll();
  } catch {
    if (action !== 'KEEP') {
      return;
    }
    ElMessage.error('举报处理失败');
  }
}

watch(textFilter, () => {
  void loadTextReviews();
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

.review-card h3 {
  margin: 0;
  color: #111827;
}

.review-card p {
  color: #4b5563;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.status {
  display: block;
  margin-top: 8px;
  color: #6b7280;
}
</style>
