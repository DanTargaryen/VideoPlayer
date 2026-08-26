<template>
  <section class="page">
    <div class="hero">
      <div>
        <h1>投稿</h1>
        <p>上传你的视频作品</p>
      </div>
    </div>

    <div class="upload-form-wrapper" data-tour="upload-form">
      <el-form :model="form" label-position="top">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="请输入视频标题" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.description" type="textarea" placeholder="请输入视频简介" />
        </el-form-item>
        <el-form-item label="分区">
          <el-select v-model="form.categories" multiple placeholder="请选择分区">
            <el-option
              v-for="item in videoCategoryOptions"
              :key="item.code"
              :label="item.label"
              :value="item.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="封面地址（可选）">
          <el-input v-model="form.coverUrl" placeholder="请输入封面图片URL" />
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
          <span v-if="!selectedCoverFile && autoCoverPreview" class="hint success"
            >未选择自定义封面，将自动使用截取画面作为封面</span
          >
        </el-form-item>
        <div class="form-actions">
          <el-button :loading="creating" type="primary" data-tour="upload-create" @click="handleCreateDraft">创建稿件</el-button>
          <RouterLink to="/user/dashboard" class="back-link">返回个人主页</RouterLink>
        </div>
      </el-form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import { createVideo, uploadVideo } from '@/api/platform';
import { videoCategoryOptions } from '@/constants/categories';
import {
  isRecoverableUploadSubmissionError,
  resolveApiErrorMessage,
} from '@/utils/apiErrors';

const router = useRouter();

const form = reactive({
  title: '',
  description: '',
  categories: ['entertainment'] as string[],
  coverUrl: '',
});

const creating = ref(false);
const selectedVideoFile = ref<File | null>(null);
const selectedCoverFile = ref<File | null>(null);
const autoCoverPreview = ref<string | null>(null);
const autoCoverFile = ref<File | null>(null);
const captureTimeSeconds = ref(1);
const selectedVideoDurationSeconds = ref<number | null>(null);

function handleVideoFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  selectedVideoFile.value = input.files?.[0] ?? null;
  selectedVideoDurationSeconds.value = null;
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

function handleRecaptureFrame() {
  if (selectedVideoFile.value) {
    autoCoverPreview.value = null;
    autoCoverFile.value = null;
    captureTimeSeconds.value += 2;
    captureVideoFrame(selectedVideoFile.value, captureTimeSeconds.value);
  }
}

function captureVideoFrame(file: File, timeSeconds: number) {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  const blobUrl = URL.createObjectURL(file);
  video.src = blobUrl;

  video.onloadedmetadata = () => {
    const duration = video.duration;
    selectedVideoDurationSeconds.value = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null;
    if (timeSeconds >= duration) {
      captureTimeSeconds.value = 1;
      video.currentTime = 1;
    } else {
      video.currentTime = timeSeconds;
    }
  };

  video.onseeked = () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(blobUrl);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    autoCoverPreview.value = canvas.toDataURL('image/jpeg', 0.85);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          autoCoverFile.value = new File([blob], `auto-cover-${Date.now()}.jpg`, { type: 'image/jpeg' });
        }
        URL.revokeObjectURL(blobUrl);
      },
      'image/jpeg',
      0.85,
    );
  };

  video.onerror = () => {
    ElMessage.error('无法读取视频文件');
    URL.revokeObjectURL(blobUrl);
  };
}

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const blobUrl = URL.createObjectURL(file);
    video.src = blobUrl;

    const cleanup = () => {
      URL.revokeObjectURL(blobUrl);
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      resolve(Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null);
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };
  });
}

function handleUseAutoCover() {
  if (autoCoverPreview.value) {
    form.coverUrl = '';
    ElMessage.success('已选择截取封面，提交时将自动上传');
  }
}

function resetSelectedUploadFiles() {
  selectedVideoFile.value = null;
  selectedCoverFile.value = null;
  autoCoverPreview.value = null;
  autoCoverFile.value = null;
  captureTimeSeconds.value = 1;
  selectedVideoDurationSeconds.value = null;
}

async function handleCreateDraft() {
  if (!form.title.trim()) {
    ElMessage.warning('请输入视频标题');
    return;
  }

  if (!selectedVideoFile.value) {
    ElMessage.warning('请选择视频文件');
    return;
  }

  if (form.categories.length === 0) {
    ElMessage.warning('请至少选择一个分区');
    return;
  }

  creating.value = true;

  let originalUploaded = false;
  let draftCreateStarted = false;

  try {
    const durationSeconds = selectedVideoDurationSeconds.value ?? (await readVideoDuration(selectedVideoFile.value));
    selectedVideoDurationSeconds.value = durationSeconds;

    const uploadedVideo = await uploadVideo(selectedVideoFile.value, 'ORIGINAL');
    originalUploaded = true;
    let coverUrl = form.coverUrl.trim() || undefined;
    let coverAssetId: number | undefined;
    let coverUploadToken: string | undefined;
    const coverToUpload = selectedCoverFile.value || autoCoverFile.value;

    if (coverToUpload) {
      const coverResp = await uploadVideo(coverToUpload, 'COVER');
      coverUrl ??= coverResp.url;
      coverAssetId = coverResp.assetId;
      coverUploadToken = coverResp.uploadToken;
    }

    draftCreateStarted = true;
    await createVideo({
      assetId: uploadedVideo.assetId,
      uploadToken: uploadedVideo.uploadToken,
      title: form.title,
      description: form.description,
      category: form.categories[0],
      categories: form.categories,
      durationSeconds: durationSeconds ?? undefined,
      coverUrl,
      coverAssetId,
      coverUploadToken,
    });

    resetSelectedUploadFiles();
    ElMessage.success('稿件创建成功！');
    await router.push('/user/dashboard');
  } catch (error: unknown) {
    if (isRecoverableUploadSubmissionError(error)) {
      if (draftCreateStarted) {
        resetSelectedUploadFiles();
        ElMessage.warning({
          message: '请求没有及时返回，但视频文件已上传，稿件可能已经创建并在后台处理，请稍后到个人主页查看。',
          duration: 6000,
        });
        await router.push('/user/dashboard');
        return;
      }

      if (originalUploaded) {
        ElMessage.warning({
          message: '视频文件已上传，但后续提交暂时没有收到确认，请稍后查看个人主页，若没有出现再重新提交。',
          duration: 6000,
        });
        return;
      }

      ElMessage.warning({
        message: '上传请求没有及时返回，服务器可能仍在保存文件，请稍后确认后再重试。',
        duration: 6000,
      });
      return;
    }

    ElMessage.error(resolveApiErrorMessage(error, '创建稿件失败，请重试'));
  } finally {
    creating.value = false;
  }
}
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
  gap: 16px;
}

.hero h1 {
  margin: 0;
  color: #111827;
}

.hero p {
  margin: 4px 0 0;
  color: #4b5563;
}

.upload-form-wrapper {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 32px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-height: 800px;
  display: flex;
  flex-direction: column;
}

.upload-form-wrapper :deep(.el-form-item) {
  margin-bottom: 24px;
}

.upload-form-wrapper :deep(.el-form-item__label) {
  font-weight: 500;
  font-size: 14px;
  color: #374151;
  margin-bottom: 8px;
}

.upload-form-wrapper :deep(.el-input__wrapper) {
  border-radius: 8px;
  height: 40px;
  transition: all 0.2s ease;
}

.upload-form-wrapper :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.upload-form-wrapper :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  border-color: #409eff;
}

.upload-form-wrapper :deep(.el-textarea__wrapper) {
  border-radius: 8px;
  min-height: 100px;
  transition: all 0.2s ease;
}

.upload-form-wrapper :deep(.el-textarea__wrapper:hover) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.upload-form-wrapper :deep(.el-textarea__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  border-color: #409eff;
}

.upload-form-wrapper :deep(.el-select) {
  width: 100%;
}

.upload-form-wrapper :deep(.el-select .el-input__wrapper) {
  height: 40px;
  border-radius: 8px;
}

.upload-form-wrapper :deep(.el-select .el-input__wrapper:hover) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.upload-form-wrapper :deep(.el-select .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  border-color: #409eff;
}

.upload-form-wrapper :deep(.el-button) {
  border-radius: 8px;
  transition: all 0.2s ease;
}

.upload-form-wrapper :deep(.el-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.hint {
  display: block;
  margin-top: 8px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.4;
}

.hint.success {
  color: #10b981;
}

.cover-preview-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.cover-preview-img {
  max-width: 320px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.cover-preview-actions {
  display: flex;
  gap: 8px;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.back-link {
  color: #6b7280;
  font-size: 14px;
  text-decoration: none;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: #409eff;
  text-decoration: underline;
}

/* 文件输入样式 */
.upload-form-wrapper input[type="file"] {
  display: block;
  width: 100%;
  padding: 8px 0;
  font-size: 14px;
  color: #6b7280;
  cursor: pointer;
}

.upload-form-wrapper input[type="file"]::-webkit-file-upload-button {
  padding: 6px 12px;
  margin-right: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-form-wrapper input[type="file"]::-webkit-file-upload-button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.upload-form-wrapper input[type="file"]::file-selector-button {
  padding: 6px 12px;
  margin-right: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  color: #374151;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-form-wrapper input[type="file"]::file-selector-button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}
</style>
