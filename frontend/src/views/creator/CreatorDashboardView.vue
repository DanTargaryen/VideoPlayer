<template>
  <section class="page">
    <div class="hero">
      <div>
        <h1>用户中心</h1>
        <p>这里已经串起“真实文件上传 -> 创建稿件 -> 编辑稿件 -> 提交审核”的主流程。</p>
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

    <section v-if="dashboard.recentRejectedVideos.length > 0" class="panel">
      <div class="panel-head">
        <h2>违规提醒</h2>
        <span class="subtle">最近被驳回的稿件会显示在这里，便于重新修改后提交。</span>
      </div>
      <div class="warning-list">
        <article v-for="item in dashboard.recentRejectedVideos" :key="item.id" class="warning-card">
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.rejectReason || '暂无详细驳回原因' }}</p>
          </div>
          <span class="subtle">{{ formatTime(item.updatedAt) }}</span>
        </article>
      </div>
    </section>

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
          <el-form-item label="分区">
            <el-select v-model="form.category">
              <el-option v-for="item in videoCategoryOptions" :key="item.code" :label="item.label" :value="item.code" />
            </el-select>
          </el-form-item>
          <el-form-item label="封面地址（可选）">
            <el-input v-model="form.coverUrl" />
          </el-form-item>
          <el-form-item label="视频文件">
            <input type="file" accept="video/*" @change="handleVideoFileChange" />
            <span v-if="selectedVideoFile" class="hint">已选择：{{ selectedVideoFile.name }}</span>
          </el-form-item>
          <el-form-item v-if="autoCoverPreview" label="自动截取封面预览">
            <div class="cover-preview-wrapper">
              <img :src="autoCoverPreview" alt="自动截取的封面" class="cover-preview-img" />
              <div class="cover-preview-actions">
                <el-button size="small" @click="handleRecaptureFrame">重新截取</el-button>
                <el-button size="small" type="primary" @click="handleUseAutoCover">使用此封面</el-button>
              </div>
            </div>
          </el-form-item>
          <el-form-item label="封面图片（可选）">
            <input type="file" accept="image/*" @change="handleCoverFileChange" />
            <span v-if="selectedCoverFile" class="hint">已选择：{{ selectedCoverFile.name }}</span>
            <span v-if="!selectedCoverFile && autoCoverPreview" class="hint success">未选择自定义封面，将自动使用截取画面作为封面</span>
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
            <div class="actions-block">
              <el-button plain @click="openReviewDialog(item)">审核记录</el-button>
              <el-button
                plain
                :disabled="item.status !== 'DRAFT' && item.status !== 'REJECTED'"
                @click="openEditDialog(item)"
              >
                编辑稿件
              </el-button>
              <el-button
                type="primary"
                plain
                :disabled="item.status !== 'DRAFT' && item.status !== 'REJECTED'"
                @click="handleSubmitReview(Number(item.id))"
              >
                提交审核
              </el-button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <el-dialog v-model="editDialogVisible" title="编辑稿件" width="560px">
      <el-form :model="editForm" label-position="top">
        <el-form-item label="标题">
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="editForm.description" type="textarea" />
        </el-form-item>
        <el-form-item label="分区">
          <el-select v-model="editForm.category">
            <el-option v-for="item in videoCategoryOptions" :key="item.code" :label="item.label" :value="item.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="封面地址">
          <el-input v-model="editForm.coverUrl" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingDraft" @click="handleSaveDraft">保存修改</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reviewDialogVisible" title="审核记录" width="620px">
      <div class="history-list">
        <article v-for="item in reviewHistory" :key="item.id" class="history-card">
          <div>
            <strong>{{ item.status }}</strong>
            <p>{{ item.reason || '暂无审核意见' }}</p>
            <span class="subtle">
              提交时间 {{ formatTime(item.createdAt) }}
              <template v-if="item.reviewedAt"> · 处理时间 {{ formatTime(item.reviewedAt) }}</template>
            </span>
          </div>
          <span class="subtle">{{ item.reviewer?.nickname || '待处理' }}</span>
        </article>
        <el-empty v-if="reviewHistory.length === 0" description="当前稿件还没有审核记录" />
      </div>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

import {
  createVideo,
  fetchCreatorDashboard,
  fetchCreatorVideos,
  fetchVideoReviews,
  submitReview,
  updateVideoDraft,
  uploadVideo,
} from '@/api/platform';
import { videoCategoryOptions } from '@/constants/categories';
import type { CreatorDashboardData, CreatorVideo, ReviewHistoryItem } from '@/types/api';

const creating = ref(false);
const savingDraft = ref(false);
const dashboard = ref<CreatorDashboardData>({
  nickname: '',
  role: 'USER',
  totalVideos: 0,
  pendingReviews: 0,
  publishedVideos: 0,
  rejectedVideos: 0,
  followerCount: 0,
  totalLikes: 0,
  totalFavorites: 0,
  totalComments: 0,
  recentRejectedVideos: [],
});
const videos = ref<CreatorVideo[]>([]);
const reviewHistory = ref<ReviewHistoryItem[]>([]);
const selectedVideoFile = ref<File | null>(null);
const selectedCoverFile = ref<File | null>(null);
const autoCoverPreview = ref<string | null>(null);
const autoCoverFile = ref<File | null>(null);
const captureTimeSeconds = ref(1);
const editDialogVisible = ref(false);
const reviewDialogVisible = ref(false);
const editingVideoId = ref<number | null>(null);
const form = reactive({
  title: '新的演示投稿',
  description: '这是通过用户中心上传真实文件后创建并提交审核的演示稿件。',
  category: 'entertainment' as string,
  coverUrl: '',
});
const editForm = reactive({
  title: '',
  description: '',
  category: 'entertainment' as string,
  coverUrl: '',
});

const statCards = computed(() => [
  { label: '总稿件数', value: dashboard.value.totalVideos },
  { label: '待审核', value: dashboard.value.pendingReviews },
  { label: '已发布', value: dashboard.value.publishedVideos },
  { label: '粉丝数', value: dashboard.value.followerCount },
  { label: '累计点赞', value: dashboard.value.totalLikes },
  { label: '累计评论', value: dashboard.value.totalComments },
]);

function formatTime(value?: string | null) {
  if (!value) {
    return '暂无';
  }

  return new Date(value).toLocaleString('zh-CN');
}

function handleVideoFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedVideoFile.value = input.files?.[0] ?? null;
  if (selectedVideoFile.value) {
    captureVideoFrame(selectedVideoFile.value, captureTimeSeconds.value);
  } else {
    autoCoverPreview.value = null;
    autoCoverFile.value = null;
  }
}

function handleCoverFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedCoverFile.value = input.files?.[0] ?? null;
}

function captureVideoFrame(file: File, timeSeconds: number) {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  const url = URL.createObjectURL(file);
  video.src = url;

  video.onloadedmetadata = () => {
    const seekTime = Math.min(timeSeconds, Math.max(0, video.duration - 0.1));
    video.currentTime = seekTime;
  };

  video.onseeked = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    autoCoverPreview.value = dataUrl;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          autoCoverFile.value = new File([blob], `auto-cover-${Date.now()}.jpg`, { type: 'image/jpeg' });
        }
        URL.revokeObjectURL(url);
      },
      'image/jpeg',
      0.85,
    );
  };

  video.onerror = () => {
    URL.revokeObjectURL(url);
    autoCoverPreview.value = null;
    autoCoverFile.value = null;
  };
}

function handleRecaptureFrame() {
  if (!selectedVideoFile.value) return;
  captureTimeSeconds.value = Math.min(captureTimeSeconds.value + 2, 30);
  captureVideoFrame(selectedVideoFile.value, captureTimeSeconds.value);
}

function handleUseAutoCover() {
  if (autoCoverFile.value) {
    selectedCoverFile.value = autoCoverFile.value;
    ElMessage.success({ message: '已选择自动截取的画面作为封面', duration: 1500 });
  }
}

async function refreshAll() {
  const [dashboardData, videoList] = await Promise.all([fetchCreatorDashboard(), fetchCreatorVideos()]);
  dashboard.value = dashboardData;
  videos.value = videoList;
}

async function handleCreateDraft() {
  if (!selectedVideoFile.value) {
    ElMessage.warning({ message: '请先选择视频文件', duration: 2000 });
    return;
  }

  creating.value = true;
  try {
    const upload = await uploadVideo(selectedVideoFile.value, 'ORIGINAL');
    let coverUploadToken: string | undefined;
    let coverAssetId: number | undefined;

    const coverToUpload = selectedCoverFile.value || autoCoverFile.value;
    if (coverToUpload) {
      const coverUpload = await uploadVideo(coverToUpload, 'COVER');
      coverAssetId = coverUpload.assetId;
      coverUploadToken = coverUpload.uploadToken;
    }

    await createVideo({
      assetId: upload.assetId,
      uploadToken: upload.uploadToken,
      title: form.title,
      description: form.description,
      category: form.category,
      coverUrl: form.coverUrl || undefined,
      coverAssetId,
      coverUploadToken,
    });

    selectedVideoFile.value = null;
    selectedCoverFile.value = null;
    autoCoverPreview.value = null;
    autoCoverFile.value = null;
    captureTimeSeconds.value = 1;
    ElMessage.success({ message: '稿件创建成功', duration: 1500 });
    await refreshAll();
  } catch {
    ElMessage.error({ message: '创建稿件失败，请确认 MinIO 服务已启动且已使用用户账号登录', duration: 4000 });
  } finally {
    creating.value = false;
  }
}

function openEditDialog(video: CreatorVideo) {
  editingVideoId.value = video.id;
  editForm.title = video.title;
  editForm.description = video.description;
  editForm.category = video.category;
  editForm.coverUrl = video.coverUrl;
  editDialogVisible.value = true;
}

async function handleSaveDraft() {
  if (!editingVideoId.value) {
    return;
  }

  savingDraft.value = true;
  try {
    await updateVideoDraft(editingVideoId.value, { ...editForm });
    ElMessage.success({ message: '稿件已更新', duration: 1500 });
    editDialogVisible.value = false;
    await refreshAll();
  } catch {
    ElMessage.error({ message: '保存稿件失败', duration: 3000 });
  } finally {
    savingDraft.value = false;
  }
}

async function openReviewDialog(video: CreatorVideo) {
  try {
    reviewHistory.value = await fetchVideoReviews(video.id);
    reviewDialogVisible.value = true;
  } catch {
    ElMessage.error({ message: '加载审核记录失败', duration: 3000 });
  }
}

async function handleSubmitReview(videoId: number) {
  try {
    await submitReview(videoId);
    ElMessage.success({ message: '已提交审核', duration: 1500 });
    await refreshAll();
  } catch {
    ElMessage.error({ message: '提交审核失败', duration: 3000 });
  }
}

onMounted(async () => {
  try {
    await refreshAll();
  } catch {
    ElMessage.warning({ message: '请先登录用户账号查看此页面', duration: 2500 });
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
.video-card,
.warning-card,
.history-card {
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

.panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.panel,
.warning-list,
.video-list,
.history-list {
  display: grid;
  gap: 16px;
}

.panel h2 {
  margin: 0;
  color: #111827;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
}

.video-card,
.warning-card,
.history-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.video-card h3,
.warning-card strong,
.history-card strong {
  color: #111827;
}

.video-card p,
.warning-card p,
.history-card p {
  color: #4b5563;
}

.actions-block {
  display: grid;
  gap: 10px;
}

.status,
.reason,
.hint,
.subtle {
  display: block;
  margin-top: 8px;
  color: #6b7280;
}

.hint.success {
  color: #16a34a;
}

.cover-preview-wrapper {
  display: grid;
  gap: 12px;
}

.cover-preview-img {
  width: 100%;
  max-width: 320px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.cover-preview-actions {
  display: flex;
  gap: 8px;
}
</style>
