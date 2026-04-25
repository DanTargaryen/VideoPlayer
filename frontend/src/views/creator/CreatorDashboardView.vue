<template>
  <section class="page" v-loading="pageLoading">
    <div class="profile-banner">
      <div class="profile-left">
        <div class="avatar-wrapper" @click="openAvatarEdit">
          <img :src="profileAvatarUrl" :alt="dashboard.nickname" class="avatar" />
          <span class="avatar-edit-hint">编辑</span>
        </div>
        <div class="profile-info">
          <div class="nickname-row">
            <h1 v-if="!editingNickname">{{ dashboard.nickname }}</h1>
            <el-input
              v-else
              v-model="nicknameDraft"
              size="small"
              class="nickname-input"
              @keyup.enter="saveNickname"
              @keyup.escape="cancelNickname"
            />
            <button v-if="!editingNickname" class="edit-nickname-btn" @click="startEditNickname">✏️</button>
            <template v-else>
              <el-button size="small" type="primary" @click="saveNickname">保存</el-button>
              <el-button size="small" @click="cancelNickname">取消</el-button>
            </template>
          </div>
          <div class="bio-row">
            <template v-if="!editingBio">
              <span class="bio-text" :class="{ placeholder: !dashboard.bio }" @click="startEditBio">
                {{ dashboard.bio || '编辑个性签名' }}
              </span>
            </template>
            <template v-else>
              <el-input
                v-model="bioDraft"
                size="small"
                class="bio-input"
                maxlength="200"
                show-word-limit
                placeholder="写点什么介绍自己吧..."
                @keyup.enter="saveBio"
                @keyup.escape="cancelBio"
              />
              <el-button size="small" type="primary" @click="saveBio">保存</el-button>
              <el-button size="small" @click="cancelBio">取消</el-button>
            </template>
          </div>
          <div class="profile-stats">
            <button class="stat-link" @click="openFollowersDialog">
              <strong>{{ dashboard.followerCount }}</strong>
              <span>粉丝</span>
            </button>
            <button class="stat-link" @click="openFollowingDialog">
              <strong>{{ followingCount }}</strong>
              <span>关注</span>
            </button>
            <span class="stat-item">
              <strong>{{ dashboard.totalLikes }}</strong>
              <span>获赞</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'home' }" @click="activeTab = 'home'">主页</button>
      <button class="tab-btn" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">账号设置</button>
    </div>

    <template v-if="activeTab === 'home'">
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

        <section class="panel">
          <h2>我的作品</h2>
          <div class="video-list">
            <article v-for="item in videos" :key="item.id" class="video-card">
              <button class="video-cover-button" type="button" @click="openVideoPreview(item)">
                <img :src="item.coverUrl" :alt="item.title" class="video-cover-thumb" />
                <span class="video-cover-overlay">查看完整视频</span>
              </button>
              <div class="video-main">
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
                <span class="status">状态：{{ item.status }}</span>
                <span class="reason">时长：{{ item.durationSeconds ?? 0 }} 秒</span>
                <span v-if="item.rejectReason" class="reason">驳回原因：{{ item.rejectReason }}</span>
              </div>
              <div class="actions-block">
                <el-button plain @click="openVideoPreview(item)">预览视频</el-button>
                <el-button plain @click="openReviewDialog(item)">审核记录</el-button>
                <el-button
                  type="warning"
                  plain
                  :disabled="item.status !== 'PENDING_REVIEW'"
                  @click="handleWithdrawReview(item.id)"
                >
                  撤回审核
                </el-button>
                <el-button
                  plain
                  :disabled="
                    item.status !== 'DRAFT' &&
                    item.status !== 'REJECTED' &&
                    item.status !== 'PENDING_REVIEW' &&
                    item.status !== 'PUBLISHED'
                  "
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
    </template>

    <template v-if="activeTab === 'home'">
      <section class="panel">
        <h2>我的收藏</h2>
        <div class="video-grid" v-if="favoriteVideos.length > 0">
          <RouterLink v-for="v in favoriteVideos" :key="v.id" :to="`/video/${v.id}`" class="grid-card">
            <img :src="v.coverUrl" :alt="v.title" class="grid-cover" />
            <div class="grid-body">
              <h3>{{ v.title }}</h3>
              <span class="grid-meta">{{ v.creator.nickname }} · <svg class="meta-icon" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg> {{ v.likeCount }} <svg class="meta-icon" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> {{ v.favoriteCount }}</span>
            </div>
          </RouterLink>
        </div>
        <el-empty v-else description="还没有收藏视频" />
      </section>

      <section class="panel">
        <h2>最近点赞</h2>
        <div class="video-grid" v-if="likedVideos.length > 0">
          <RouterLink v-for="v in likedVideos" :key="v.id" :to="`/video/${v.id}`" class="grid-card">
            <img :src="v.coverUrl" :alt="v.title" class="grid-cover" />
            <div class="grid-body">
              <h3>{{ v.title }}</h3>
              <span class="grid-meta">{{ v.creator.nickname }} · <svg class="meta-icon" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg> {{ v.likeCount }} <svg class="meta-icon" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> {{ v.favoriteCount }}</span>
            </div>
          </RouterLink>
        </div>
        <el-empty v-else description="还没有点赞视频" />
      </section>
    </template>

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

    <el-dialog v-model="previewDialogVisible" :title="previewVideo?.title || '视频预览'" width="860px" top="6vh">
      <div v-if="previewVideo" class="preview-dialog-body">
        <video
          class="preview-player"
          :src="previewVideo.playUrl"
          :poster="previewVideo.coverUrl"
          controls
          preload="metadata"
        />
        <p class="preview-description">{{ previewVideo.description || '暂无简介' }}</p>
      </div>
    </el-dialog>

    <el-dialog v-model="avatarDialogVisible" title="修改头像" width="420px">
      <el-form label-position="top">
        <el-form-item label="上传头像图片">
          <input type="file" accept="image/*" @change="handleAvatarFileChange" class="avatar-file-input" />
          <div v-if="avatarPreview" class="avatar-preview-box">
            <img :src="avatarPreview" alt="预览" class="avatar-preview-img" />
          </div>
        </el-form-item>
        <el-form-item label="或输入头像链接">
          <el-input v-model="avatarDraft" placeholder="输入头像图片 URL" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="avatarDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingAvatar" @click="saveAvatar">保存</el-button>
      </template>
    </el-dialog>

    <template v-if="activeTab === 'settings'">
      <section class="panel">
        <h2>账号信息</h2>
        <el-form label-position="top" class="account-settings-form" @submit.prevent>
          <el-form-item label="登录账号">
            <div class="form-row">
              <el-input :model-value="dashboard.username || ''" disabled />
              <span class="form-btn-placeholder"></span>
            </div>
          </el-form-item>
          <el-form-item label="昵称">
            <div class="form-row">
              <el-input
                v-model="nicknameDraft"
                maxlength="64"
                show-word-limit
                placeholder="输入要显示给其他用户看的昵称"
                @keyup.enter="saveNickname"
              />
              <el-button type="primary" :disabled="!nicknameDraft.trim()" @click="saveNickname">保存</el-button>
            </div>
          </el-form-item>
          <el-form-item label="个性签名">
            <div class="form-row bio-row">
              <el-input
                v-model="bioDraft"
                type="textarea"
                :rows="3"
                maxlength="200"
                show-word-limit
                placeholder="写点什么介绍自己吧..."
              />
              <el-button type="primary" @click="saveBio">保存</el-button>
            </div>
          </el-form-item>
          <el-form-item label="邮箱">
            <div v-if="!editingEmail" class="form-row">
              <el-input :model-value="dashboard.email || '未绑定'" disabled />
              <el-button type="primary" @click="startEditEmail">绑定/修改</el-button>
            </div>
            <div v-else class="email-edit-rows">
              <div class="email-edit-row">
                <el-input
                  v-model="emailDraft"
                  placeholder="请输入邮箱"
                  maxlength="128"
                  show-word-limit
                />
                <el-button type="primary" @click="saveEmail">保存</el-button>
              </div>
              <div class="email-edit-row">
                <el-input
                  v-model="emailCode"
                  placeholder="请输入验证码"
                  maxlength="6"
                  show-word-limit
                >
                  <template #append>
                    <el-button
                      :disabled="sendingEmailCode || countdown > 0"
                      @click="sendEmailCodeApi"
                    >
                      {{ sendingEmailCode ? '发送中...' : (countdown > 0 ? `${countdown}s后重发` : '获取验证码') }}
                    </el-button>
                  </template>
                </el-input>
                <el-button @click="cancelEmail">取消</el-button>
              </div>
            </div>
          </el-form-item>
        </el-form>
      </section>

      <section class="panel">
        <h2>账号设置</h2>
        <div class="danger-zone">
          <div class="danger-zone-header">
            <h3>危险操作</h3>
            <p class="subtle">以下操作不可逆，请谨慎操作。</p>
          </div>
          <div class="danger-action">
            <div>
              <strong>退出登录</strong>
              <p class="subtle">退出当前账号登录状态，回到登录页面。</p>
            </div>
            <el-button type="warning" plain @click="handleLogout">退出登录</el-button>
          </div>
          <div class="danger-action">
            <div>
              <strong>注销账户</strong>
              <p class="subtle">永久删除您的账号及所有相关数据（视频、评论、弹幕等），此操作无法撤销。</p>
            </div>
            <el-button type="danger" plain @click="openDeleteAccountDialog">注销账户</el-button>
          </div>
        </div>
      </section>
    </template>

    <el-dialog v-model="deleteAccountDialogVisible" title="注销账户" width="460px">
      <div class="delete-account-warning">
        <p>此操作将永久删除您的账号，包括：</p>
        <ul>
          <li>所有上传的视频</li>
          <li>所有评论和弹幕</li>
          <li>关注关系与互动记录</li>
        </ul>
        <p><strong>此操作不可撤销。</strong></p>
      </div>
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="请输入当前密码以确认">
          <el-input
            v-model="deleteAccountPassword"
            type="password"
            show-password
            placeholder="输入密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="deleteAccountDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="deletingAccount" @click="handleDeleteAccount">
          确认注销
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="followersDialogVisible" title="粉丝列表" width="480px">
      <div class="follow-list" v-if="followersList.length > 0">
        <RouterLink
          v-for="u in followersList"
          :key="u.id"
          :to="`/users/${u.id}`"
          class="follow-item"
        >
          <img :src="u.avatarUrl || fallbackAvatar" :alt="u.nickname" class="follow-avatar" />
          <span class="follow-nickname">{{ u.nickname }}</span>
        </RouterLink>
      </div>
      <el-empty v-else description="暂无粉丝" />
    </el-dialog>

    <el-dialog v-model="followingDialogVisible" title="关注列表" width="480px">
      <div class="follow-list" v-if="followingList.length > 0">
        <RouterLink
          v-for="u in followingList"
          :key="u.id"
          :to="`/users/${u.id}`"
          class="follow-item"
        >
          <img :src="u.avatarUrl || fallbackAvatar" :alt="u.nickname" class="follow-avatar" />
          <span class="follow-nickname">{{ u.nickname }}</span>
        </RouterLink>
      </div>
      <el-empty v-else description="暂无关注" />
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';

import {
  createVideo,
  deleteAccount,
  sendEmailCode,
  fetchCreatorDashboard,
  fetchCreatorVideos,
  fetchFollowers,
  fetchFollowing,
  fetchMyFavorites,
  fetchMyLikes,
  fetchVideoReviews,
  submitReview,
  updateProfile,
  updateVideoDraft,
  uploadAvatar,
  uploadVideo,
  verifyEmailCode,
  withdrawVideoReview,
} from '@/api/platform';
import { videoCategoryOptions } from '@/constants/categories';
import { useAppStore } from '@/stores/app';
import type { CreatorDashboardData, CreatorVideo, FollowUserItem, MyVideoItem, ReviewHistoryItem } from '@/types/api';

const fallbackAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=320&q=80';
const store = useAppStore();
const router = useRouter();
const route = useRoute();
const pageLoading = ref(false);
const creating = ref(false);
const savingDraft = ref(false);
const savingAvatar = ref(false);
const activeTab = ref<'home' | 'settings'>('home');
const deleteAccountDialogVisible = ref(false);
const deleteAccountPassword = ref('');
const deletingAccount = ref(false);

const dashboard = ref<CreatorDashboardData>({
  id: 0,
  username: '',
  nickname: '',
  avatarUrl: null,
  bio: null,
  email: '',
  role: 'USER',
  totalVideos: 0,
  pendingReviews: 0,
  publishedVideos: 0,
  rejectedVideos: 0,
  followerCount: 0,
  followingCount: 0,
  totalLikes: 0,
  totalFavorites: 0,
  totalComments: 0,
  recentRejectedVideos: [],
});
const videos = ref<CreatorVideo[]>([]);
const reviewHistory = ref<ReviewHistoryItem[]>([]);
const favoriteVideos = ref<MyVideoItem[]>([]);
const likedVideos = ref<MyVideoItem[]>([]);
const followersList = ref<FollowUserItem[]>([]);
const followingList = ref<FollowUserItem[]>([]);
const followingCount = ref(0);

const selectedVideoFile = ref<File | null>(null);
const selectedCoverFile = ref<File | null>(null);
const autoCoverPreview = ref<string | null>(null);
const autoCoverFile = ref<File | null>(null);
const captureTimeSeconds = ref(1);
const editDialogVisible = ref(false);
const reviewDialogVisible = ref(false);
const avatarDialogVisible = ref(false);
const followersDialogVisible = ref(false);
const followingDialogVisible = ref(false);
const editingVideoId = ref<number | null>(null);
const editingVideoStatus = ref<CreatorVideo['status'] | ''>('');
const previewDialogVisible = ref(false);
const previewVideo = ref<CreatorVideo | null>(null);

const avatarDraft = ref('');
const avatarFile = ref<File | null>(null);
const avatarPreview = ref('');
const editingNickname = ref(false);
const nicknameDraft = ref('');
const editingBio = ref(false);
const bioDraft = ref('');
const editingEmail = ref(false);
const emailDraft = ref('');
const emailCode = ref('');
const sendingEmailCode = ref(false);
const countdown = ref(0);
let countdownTimer: number | null = null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown, fallback: string) {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (typeof responseMessage === 'string' && responseMessage) {
    return responseMessage;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

const profileAvatarUrl = computed(() => dashboard.value.avatarUrl || fallbackAvatar);

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

function formatTime(value?: string | null) {
  if (!value) return '暂无';
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
    if (!ctx) { URL.revokeObjectURL(url); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    autoCoverPreview.value = dataUrl;
    canvas.toBlob(
      (blob) => {
        if (blob) autoCoverFile.value = new File([blob], `auto-cover-${Date.now()}.jpg`, { type: 'image/jpeg' });
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

function openVideoPreview(video: CreatorVideo) {
  if (!video.playUrl) {
    ElMessage.warning('当前稿件暂时没有可播放的视频地址');
    return;
  }

  previewVideo.value = video;
  previewDialogVisible.value = true;
}

async function refreshAll() {
  const [dashboardData, videoList] = await Promise.all([fetchCreatorDashboard(), fetchCreatorVideos()]);
  dashboard.value = dashboardData;
  nicknameDraft.value = dashboardData.nickname;
  bioDraft.value = dashboardData.bio || '';
  emailDraft.value = dashboardData.email || '';
  videos.value = videoList;
}

async function loadHomeData() {
  try {
    const [fav, likes] = await Promise.all([fetchMyFavorites(), fetchMyLikes()]);
    favoriteVideos.value = fav;
    likedVideos.value = likes;
  } catch {
    favoriteVideos.value = [];
    likedVideos.value = [];
  }
}

function startEditNickname() {
  nicknameDraft.value = dashboard.value.nickname;
  editingNickname.value = true;
}

function cancelNickname() {
  editingNickname.value = false;
}

async function saveNickname() {
  const nextNickname = nicknameDraft.value.trim();

  if (!nextNickname) return;

  try {
    const result = await updateProfile({ nickname: nextNickname });
    dashboard.value.nickname = result.nickname;
    nicknameDraft.value = result.nickname;
    store.setAuth({ token: store.token, userId: store.userId, role: store.role === 'admin' ? 'ADMIN' : 'USER', nickname: result.nickname });
    editingNickname.value = false;
    ElMessage.success('昵称已更新');
  } catch {
    ElMessage.error('更新昵称失败');
  }
}

function startEditBio() {
  bioDraft.value = dashboard.value.bio || '';
  editingBio.value = true;
}

function cancelBio() {
  editingBio.value = false;
  bioDraft.value = dashboard.value.bio || '';
}

async function saveBio() {
  const nextBio = bioDraft.value.trim();

  try {
    const result = await updateProfile({ bio: nextBio });
    dashboard.value.bio = result.bio;
    bioDraft.value = result.bio || '';
    editingBio.value = false;
    ElMessage.success('个性签名已更新');
  } catch {
    ElMessage.error('更新个性签名失败');
  }
}

function startEditEmail() {
  emailDraft.value = dashboard.value.email || '';
  emailCode.value = '';
  editingEmail.value = true;
}

function cancelEmail() {
  editingEmail.value = false;
  emailDraft.value = dashboard.value.email || '';
  emailCode.value = '';
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  countdown.value = 0;
}

async function sendEmailCodeApi() {
  const email = emailDraft.value.trim();
  if (!emailPattern.test(email)) {
    ElMessage.warning('请输入正确的邮箱');
    return;
  }

  sendingEmailCode.value = true;
  try {
    await sendEmailCode(email);
    ElMessage.success('验证码已发送');
    startCountdown();
  } catch (e: unknown) {
    const msg = getErrorMessage(e, '发送验证码失败');
    if (msg.includes('邮箱格式不正确')) {
      ElMessage.error('邮箱格式不正确');
    } else {
      ElMessage.error(msg);
    }
  } finally {
    sendingEmailCode.value = false;
  }
}

function startCountdown() {
  countdown.value = 60;
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  countdownTimer = window.setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--;
    } else {
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }
  }, 1000);
}

async function saveEmail() {
  const email = emailDraft.value.trim();
  const code = emailCode.value.trim();

  if (!emailPattern.test(email)) {
    ElMessage.warning('请输入正确的邮箱');
    return;
  }

  if (!code) {
    ElMessage.warning('请输入验证码');
    return;
  }

  try {
    await verifyEmailCode(email, code);
    const result = await updateProfile({ email });
    dashboard.value.email = result.email || '';
    emailDraft.value = result.email || '';
    emailCode.value = '';
    editingEmail.value = false;
    store.setAuth({
      token: store.token,
      userId: store.userId,
      role: store.role === 'admin' ? 'ADMIN' : 'USER',
      nickname: store.nickname,
      avatarUrl: store.avatarUrl,
      email: result.email,
    });
    ElMessage.success('邮箱已更新');
  } catch (e: unknown) {
    const msg = getErrorMessage(e, '验证码校验失败或已过期');
    if (msg.includes('邮箱已被使用')) {
      ElMessage.error('邮箱已被使用');
    } else {
      ElMessage.error(msg);
    }
  }
}

function openAvatarEdit() {
  avatarDraft.value = dashboard.value.avatarUrl || '';
  avatarFile.value = null;
  avatarPreview.value = '';
  avatarDialogVisible.value = true;
}

function handleAvatarFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  avatarFile.value = file;
  avatarDraft.value = '';
  const reader = new FileReader();
  reader.onload = (e) => {
    avatarPreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

async function saveAvatar() {
  savingAvatar.value = true;
  try {
    if (avatarFile.value) {
      const result = await uploadAvatar(avatarFile.value);
      dashboard.value.avatarUrl = result.avatarUrl;
      store.setAuth({
        token: store.token,
        userId: store.userId,
        role: store.role as 'USER' | 'ADMIN',
        nickname: store.nickname,
        avatarUrl: result.avatarUrl
      });
    } else if (avatarDraft.value.trim()) {
      await updateProfile({ avatarUrl: avatarDraft.value.trim() });
      dashboard.value.avatarUrl = avatarDraft.value.trim();
      store.setAuth({
        token: store.token,
        userId: store.userId,
        role: store.role as 'USER' | 'ADMIN',
        nickname: store.nickname,
        avatarUrl: avatarDraft.value.trim()
      });
    }
    avatarDialogVisible.value = false;
    ElMessage.success('头像已更新');
  } catch {
    ElMessage.error('更新头像失败');
  } finally {
    savingAvatar.value = false;
  }
}

async function openFollowersDialog() {
  followersDialogVisible.value = true;
  try {
    followersList.value = await fetchFollowers(store.userId);
  } catch {
    followersList.value = [];
  }
}

function handleLogout() {
  store.logout();
  router.push('/login');
}

async function openFollowingDialog() {
  followingDialogVisible.value = true;
  try {
    followingList.value = await fetchFollowing(store.userId);
    followingCount.value = followingList.value.length;
  } catch {
    followingList.value = [];
  }
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
  editingVideoStatus.value = video.status;
  editForm.title = video.title;
  editForm.description = video.description;
  editForm.category = video.category;
  editForm.coverUrl = video.coverUrl;
  editDialogVisible.value = true;
}

async function handleSaveDraft() {
  if (!editingVideoId.value) return;
  savingDraft.value = true;
  try {
    await updateVideoDraft(editingVideoId.value, { ...editForm });
    ElMessage.success({
      message:
        editingVideoStatus.value === 'PENDING_REVIEW' || editingVideoStatus.value === 'PUBLISHED'
          ? '稿件已更新并退回草稿，请重新提交审核'
          : '稿件已更新',
      duration: 1800,
    });
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

async function handleWithdrawReview(videoId: number) {
  try {
    await withdrawVideoReview(videoId);
    ElMessage.success({ message: '稿件已撤回，可继续修改标题、简介和分区', duration: 1800 });
    await refreshAll();
  } catch {
    ElMessage.error({ message: '撤回审核失败', duration: 3000 });
  }
}

onMounted(async () => {
  // 根据 URL 参数设置初始标签页
  const tabParam = route.query.tab as string;
  if (tabParam === 'settings') {
    activeTab.value = 'settings';
  }

  pageLoading.value = true;
  try {
    await refreshAll();
    followingCount.value = dashboard.value.followingCount;
    await loadHomeData();
  } catch {
    ElMessage.warning({ message: '请先登录用户账号查看此页面', duration: 2500 });
  } finally {
    pageLoading.value = false;
  }
});

watch(activeTab, (tab) => {
  if (tab === 'home') {
    void loadHomeData();
  }
});

function openDeleteAccountDialog() {
  deleteAccountPassword.value = '';
  deleteAccountDialogVisible.value = true;
}

async function handleDeleteAccount() {
  if (!deleteAccountPassword.value) {
    ElMessage.warning('请输入密码');
    return;
  }
  deletingAccount.value = true;
  try {
    await deleteAccount({ password: deleteAccountPassword.value });
    deleteAccountDialogVisible.value = false;
    ElMessage.success('账号已注销');
    store.logout();
    router.push('/');
  } catch {
    ElMessage.error('注销失败，请检查密码是否正确');
  } finally {
    deletingAccount.value = false;
  }
}
</script>

<style scoped>
.page {
  display: grid;
  gap: 20px;
}

.profile-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28px 32px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

.profile-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}

.avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(37, 99, 235, 0.15);
  transition: opacity 0.15s;
}

.avatar-wrapper:hover .avatar {
  opacity: 0.7;
}

.avatar-edit-hint {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}

.avatar-wrapper:hover .avatar-edit-hint {
  opacity: 1;
}

.avatar-file-input {
  margin-bottom: 8px;
}

.avatar-preview-box {
  margin-top: 8px;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(15, 23, 42, 0.1);
}

.avatar-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-info {
  display: grid;
  gap: 8px;
}

.bio-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.bio-text {
  color: #374151;
  font-size: 14px;
  line-height: 1.5;
  cursor: pointer;
  transition: color 0.15s;
}

.bio-text:hover {
  color: #2563eb;
}

.bio-text.placeholder {
  color: #9ca3af;
  font-style: italic;
}

.bio-text.placeholder:hover {
  color: #2563eb;
}

.bio-input {
  flex: 1;
  max-width: 400px;
}

.nickname-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nickname-row h1 {
  margin: 0;
  color: #111827;
  font-size: 22px;
}

.edit-nickname-btn {
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.edit-nickname-btn:hover {
  opacity: 1;
}

.nickname-input {
  width: 180px;
}

.account-settings-form {
  max-width: 520px;
}

.account-settings-form .el-form-item__content {
  display: flex;
}

.form-row {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
}

.form-row.bio-row {
  align-items: flex-start;
}

.form-row .el-input,
.form-row .el-textarea {
  flex: 1;
  min-width: 0;
}

.form-row .el-button {
  flex-shrink: 0;
  white-space: nowrap;
}

.form-btn-placeholder {
  flex-shrink: 0;
  width: 80px;
  height: 32px;
}

.email-edit-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.email-edit-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  width: 100%;
}

.email-edit-row .el-input {
  flex: 1;
  min-width: 0;
}

.email-edit-row .el-button {
  flex-shrink: 0;
  white-space: nowrap;
}

.profile-stats {
  display: flex;
  align-items: center;
  gap: 24px;
}

.stat-link {
  display: flex;
  align-items: baseline;
  gap: 4px;
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 0;
  transition: color 0.12s;
}

.stat-link:hover strong {
  color: #2563eb;
}

.stat-link strong {
  font-size: 18px;
  color: #111827;
  transition: color 0.12s;
}

.stat-link span,
.stat-item span {
  font-size: 13px;
  color: #6b7280;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-item strong {
  font-size: 18px;
  color: #111827;
}

.tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 2px solid #e5e7eb;
}

.tab-btn {
  padding: 10px 32px;
  font-size: 15px;
  font-weight: 500;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.15s, border-color 0.15s;
}

.tab-btn:hover {
  color: #111827;
}

.tab-btn.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
}

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

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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

.video-main {
  flex: 1;
  min-width: 0;
}

.video-card p,
.warning-card p,
.history-card p {
  color: #4b5563;
}

.video-cover-button {
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

.video-cover-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.video-cover-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: 10px 12px;
  background: linear-gradient(180deg, transparent, rgba(15, 23, 42, 0.82));
  color: #fff;
  font-size: 13px;
  text-align: left;
}

.actions-block {
  display: grid;
  gap: 10px;
}

.actions-block :deep(.el-button) {
  width: 100%;
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

.compact-panel {
  padding: 16px 20px;
}

.compact-panel :deep(.el-form-item) {
  margin-bottom: 12px;
}

.compact-panel h2 {
  margin-bottom: 8px;
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

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 220px);
  gap: 16px;
  justify-content: center;
}

.grid-card {
  display: grid;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.05);
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.grid-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
}

.grid-cover {
  width: 100%;
  height: 130px;
  object-fit: cover;
}

.grid-body {
  padding: 10px 12px;
  display: grid;
  gap: 4px;
}

.grid-body h3 {
  margin: 0;
  font-size: 14px;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-meta {
  font-size: 12px;
  color: #6b7280;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.meta-icon {
  width: 14px;
  height: 14px;
  vertical-align: middle;
  color: #9ca3af;
}

.follow-list {
  display: grid;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.follow-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  text-decoration: none;
  transition: background 0.12s;
}

.follow-item:hover {
  background: #f3f4f6;
}

.follow-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.follow-nickname {
  color: #111827;
  font-size: 14px;
}

.danger-zone {
  display: grid;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.03);
}

.danger-zone-header h3 {
  margin: 0 0 4px;
  color: #dc2626;
}

.danger-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.danger-action strong {
  color: #111827;
}

.danger-action .subtle {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.delete-account-warning {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.06);
  color: #374151;
}

.delete-account-warning ul {
  margin: 8px 0;
  padding-left: 20px;
  line-height: 1.8;
}
</style>
