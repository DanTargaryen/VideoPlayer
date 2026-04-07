<template>
  <section class="page">
    <div class="hero">
      <div>
        <h1>用户中心</h1>
        <p>这里已经串起“真实文件上传 -> 创建稿件 -> 提交审核”的第一条完整链路。</p>
      </div>
      <el-button type="primary" @click="refreshAll">刷新数据</el-button>
    </div>

    <el-alert
      title="请先用用户账号登录，再选择本地视频文件与封面上传并创建稿件。随后切换管理员账号到审核后台处理。"
      type="warning"
      :closable="false"
    />

    <div class="stats-grid">
      <article class="stat-card" v-for="item in statCards" :key="item.label">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <div class="panels">
      <section class="panel">
        <h2>新建投稿</h2>
        <el-form :model="form" label-position="top">
          <el-form-item label="标题">
            <el-input v-model="form.title" />
          </el-form-item>
          <el-form-item label="简介">
            <el-input v-model="form.description" type="textarea" />
          </el-form-item>
          <el-form-item label="分区 ID">
            <el-input-number v-model="form.categoryId" :min="1" />
          </el-form-item>
          <el-form-item label="封面地址（可选）">
            <el-input v-model="form.coverUrl" />
          </el-form-item>
          <el-form-item label="视频文件">
            <input type="file" accept="video/*" @change="handleVideoFileChange" />
            <span v-if="selectedVideoFile" class="hint">已选择：{{ selectedVideoFile.name }}</span>
          </el-form-item>
          <el-form-item label="封面图片（可选）">
            <input type="file" accept="image/*" @change="handleCoverFileChange" />
            <span v-if="selectedCoverFile" class="hint">已选择：{{ selectedCoverFile.name }}</span>
          </el-form-item>
          <div class="panel-actions">
            <el-button :loading="creating" @click="handleCreateDraft">创建稿件</el-button>
          </div>
        </el-form>
      </section>

      <section class="panel">
        <h2>我的稿件</h2>
        <div class="video-list">
          <article v-for="item in videos" :key="item.id" class="video-card">
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
              <span class="status">状态：{{ item.status }}</span>
              <span class="reason">时长：{{ item.durationSeconds ?? 0 }} 秒</span>
              <span v-if="item.rejectReason" class="reason">驳回原因：{{ item.rejectReason }}</span>
            </div>
            <el-button
              type="primary"
              plain
              :disabled="item.status !== 'DRAFT' && item.status !== 'REJECTED'"
              @click="handleSubmitReview(Number(item.id))"
            >
              提交审核
            </el-button>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

import {
  createVideo,
  fetchCreatorDashboard,
  fetchCreatorVideos,
  submitReview,
  uploadVideo,
} from '@/api/platform';

const creating = ref(false);
const dashboard = ref<Record<string, number | string>>({});
const videos = ref<import('@/types/api').CreatorVideo[]>([]);
const selectedVideoFile = ref<File | null>(null);
const selectedCoverFile = ref<File | null>(null);
const form = reactive({
  title: '新的演示投稿',
  description: '这是通过用户中心上传真实文件后创建并提交审核的演示稿件。',
  categoryId: 1,
  coverUrl: '',
});

const statCards = computed(() => [
  { label: '总稿件数', value: dashboard.value.totalVideos ?? 0 },
  { label: '待审核', value: dashboard.value.pendingReviews ?? 0 },
  { label: '已发布', value: dashboard.value.publishedVideos ?? 0 },
  { label: '已驳回', value: dashboard.value.rejectedVideos ?? 0 },
]);

function handleVideoFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedVideoFile.value = input.files?.[0] ?? null;
}

function handleCoverFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedCoverFile.value = input.files?.[0] ?? null;
}

async function refreshAll() {
  dashboard.value = await fetchCreatorDashboard();
  videos.value = await fetchCreatorVideos();
}

async function handleCreateDraft() {
  if (!selectedVideoFile.value) {
    ElMessage.warning('请先选择视频文件');
    return;
  }

  creating.value = true;
  try {
    const upload = await uploadVideo(selectedVideoFile.value, 'ORIGINAL');
    let coverAssetId: number | undefined;

    if (selectedCoverFile.value) {
      const coverUpload = await uploadVideo(selectedCoverFile.value, 'COVER');
      coverAssetId = coverUpload.assetId;
    }

    await createVideo({
      assetId: upload.assetId,
      title: form.title,
      description: form.description,
      categoryId: form.categoryId,
      coverUrl: form.coverUrl || undefined,
      coverAssetId,
    });

    selectedVideoFile.value = null;
    selectedCoverFile.value = null;
    ElMessage.success('稿件创建成功');
    await refreshAll();
  } catch {
    ElMessage.error('创建稿件失败，请确认 MinIO 服务已启动且已使用用户账号登录');
  } finally {
    creating.value = false;
  }
}

async function handleSubmitReview(videoId: number) {
  try {
    await submitReview(videoId);
    ElMessage.success('已提交审核');
    await refreshAll();
  } catch {
    ElMessage.error('提交审核失败');
  }
}

onMounted(async () => {
  try {
    await refreshAll();
  } catch {
    ElMessage.warning('请先登录用户账号查看此页面');
  }
});
</script>

<style scoped>
.page {
  display: grid;
  gap: 20px;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.stat-card,
.panel,
.video-card {
  padding: 20px;
  border-radius: 16px;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.stat-card {
  display: grid;
  gap: 8px;
}

.stat-card strong {
  font-size: 28px;
}

.panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.panel {
  display: grid;
  gap: 16px;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
}

.video-list {
  display: grid;
  gap: 12px;
}

.video-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.status,
.reason,
.hint {
  display: block;
  margin-top: 8px;
  color: #94a3b8;
}
</style>
