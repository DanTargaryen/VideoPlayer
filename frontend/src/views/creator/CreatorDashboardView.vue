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
            <span class="stat-item">
              <strong>{{ dashboard.coinBalance }}</strong>
              <span>平台货币</span>
            </span>
            <el-button size="small" type="primary" :loading="claimingDaily" @click="handleDailyClaim">每日打卡 +2</el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'home' }" @click="activeTab = 'home'">主页</button>
      <button class="tab-btn" :class="{ active: activeTab === 'favorites' }" @click="activeTab = 'favorites'">我的收藏</button>
      <button class="tab-btn" :class="{ active: activeTab === 'likes' }" @click="activeTab = 'likes'">最近点赞</button>
      <button class="tab-btn" :class="{ active: activeTab === 'history' }" @click="activeTab = 'history'">历史记录</button>
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

      <section class="panel play-trend-panel">
        <div class="panel-head play-trend-head">
          <div class="play-trend-heading">
            <h2>{{ activeTrendTitle }}</h2>
            <span class="subtle">{{ activeTrendDescription }}</span>
          </div>
          <div class="play-trend-side">
            <div class="play-trend-switch">
              <button
                class="play-trend-switch-btn"
                :class="{ active: trendMode === 'play' }"
                type="button"
                @click="trendMode = 'play'"
              >
                播放量
              </button>
              <button
                class="play-trend-switch-btn"
                :class="{ active: trendMode === 'follower' }"
                type="button"
                @click="trendMode = 'follower'"
              >
                粉丝量
              </button>
            </div>
            <div class="play-trend-summary">
              <span>{{ activeTrendSummaryLabel }}</span>
              <strong>{{ activeTrendSummaryValue }}</strong>
            </div>
          </div>
        </div>

        <div class="play-trend-chart">
          <svg
            class="play-trend-svg"
            :viewBox="`0 0 ${playTrendChartWidth} ${playTrendChartHeight}`"
            preserveAspectRatio="none"
            role="img"
            :aria-label="activeTrendTitle"
          >
            <g v-for="tick in playTrendYAxisTicks" :key="`tick-${tick.y}`">
              <line
                class="play-trend-grid"
                :x1="playTrendYAxisX"
                :x2="playTrendChartRight"
                :y1="tick.y"
                :y2="tick.y"
              />
              <text class="play-trend-axis-text" :x="playTrendYAxisX - 10" :y="tick.y + 4">{{ tick.value }}</text>
            </g>

            <line
              class="play-trend-axis"
              :x1="playTrendYAxisX"
              :x2="playTrendChartRight"
              :y1="playTrendXAxisY"
              :y2="playTrendXAxisY"
            />

            <path v-if="playTrendAreaPath" class="play-trend-area" :d="playTrendAreaPath" />
            <path v-if="playTrendLinePath" class="play-trend-line" :d="playTrendLinePath" />

            <g v-for="point in playTrendChartPoints" :key="point.date">
              <circle class="play-trend-point" :cx="point.x" :cy="point.y" r="4.5" />
              <text class="play-trend-point-value" :x="point.x" :y="point.valueY">{{ point.value }}</text>
              <text class="play-trend-label" :x="point.x" :y="playTrendChartHeight - 10">{{ point.label }}</text>
            </g>
          </svg>
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
              <el-button
                type="danger"
                plain
                :loading="deletingVideoId === item.id"
                @click="handleDeleteVideo(item)"
              >
                删除视频
              </el-button>
            </div>
          </article>
        </div>
      </section>
    </template>

    <template v-if="activeTab === 'favorites'">
      <section class="panel favorite-panel">
        <div class="favorite-panel-head">
          <div>
            <h2>我的收藏夹</h2>
            <span class="subtle">默认收藏夹会保留你之前已有的收藏，也可以新建自己的收藏夹。</span>
          </div>
        </div>

        <div class="favorite-layout">
          <aside class="favorite-sidebar">
            <div class="favorite-create-row">
              <el-input
                v-model="favoriteFolderName"
                maxlength="64"
                placeholder="输入新收藏夹名称"
                @keyup.enter="handleCreateFavoriteFolder"
              />
              <el-button type="primary" :loading="creatingFavoriteFolder" @click="handleCreateFavoriteFolder">
                创建
              </el-button>
            </div>

            <div class="favorite-folder-list" v-if="favoriteFolders.length > 0">
              <article
                v-for="folder in favoriteFolders"
                :key="folder.id"
                class="favorite-folder-card"
                :class="{ active: selectedFavoriteFolderId === folder.id }"
              >
                <button class="favorite-folder-select" type="button" @click="handleSelectFavoriteFolder(folder.id)">
                  <div class="favorite-folder-title-row">
                    <strong>{{ folder.name }}</strong>
                    <span v-if="folder.isDefault" class="favorite-folder-tag">默认</span>
                  </div>
                  <span class="favorite-folder-meta">{{ folder.videoCount }} 个视频</span>
                </button>
                <button
                  v-if="!folder.isDefault"
                  class="favorite-folder-delete"
                  type="button"
                  :disabled="deletingFavoriteFolderId === folder.id"
                  @click.stop="handleDeleteFavoriteFolder(folder)"
                >
                  {{ deletingFavoriteFolderId === folder.id ? '删除中...' : '删除' }}
                </button>
              </article>
            </div>
            <el-empty v-else description="还没有收藏夹" />
          </aside>

          <div class="favorite-content">
            <div class="favorite-content-head" v-if="activeFavoriteFolder">
              <div>
                <h3>{{ activeFavoriteFolder.name }}</h3>
                <span class="subtle">共 {{ activeFavoriteFolder.videoCount }} 个视频</span>
              </div>
              <el-input
                v-model="favoriteSearchKeyword"
                class="video-search-input"
                clearable
                placeholder="在当前收藏夹中搜索视频"
              />
            </div>

            <div class="video-grid" v-if="filteredFavoriteVideos.length > 0">
              <RouterLink v-for="v in filteredFavoriteVideos" :key="v.id" :to="`/video/${v.id}`" class="grid-card">
                <img :src="v.coverUrl" :alt="v.title" class="grid-cover" />
                <div class="grid-body">
                  <h3>{{ v.title }}</h3>
                  <span class="grid-meta">{{ v.creator.nickname }} · <svg class="meta-icon" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg> {{ v.likeCount }} <svg class="meta-icon" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> {{ v.favoriteCount }}</span>
                </div>
              </RouterLink>
            </div>
            <el-empty
              v-else
              :description="favoriteVideos.length > 0 ? '当前收藏夹中没有匹配的视频' : activeFavoriteFolder ? '这个收藏夹还没有视频' : '还没有收藏视频'"
            />
          </div>
        </div>
      </section>
    </template>

    <template v-if="activeTab === 'likes'">
      <section class="panel">
        <div class="collection-head">
          <h2>最近点赞</h2>
          <el-input
            v-model="likesSearchKeyword"
            class="video-search-input"
            clearable
            placeholder="搜索点赞视频"
          />
        </div>
        <div class="video-grid" v-if="filteredLikedVideos.length > 0">
          <RouterLink v-for="v in filteredLikedVideos" :key="v.id" :to="`/video/${v.id}`" class="grid-card">
            <img :src="v.coverUrl" :alt="v.title" class="grid-cover" />
            <div class="grid-body">
              <h3>{{ v.title }}</h3>
              <span class="grid-meta">{{ v.creator.nickname }} · <svg class="meta-icon" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg> {{ v.likeCount }} <svg class="meta-icon" viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> {{ v.favoriteCount }}</span>
            </div>
          </RouterLink>
        </div>
        <el-empty v-else :description="likedVideos.length > 0 ? '没有匹配的点赞视频' : '还没有点赞视频'" />
      </section>
    </template>

    <template v-if="activeTab === 'history'">
      <section class="panel">
        <div class="collection-head">
          <h2>历史记录</h2>
          <el-input
            v-model="historySearchKeyword"
            class="video-search-input"
            clearable
            placeholder="搜索历史记录"
          />
        </div>
        <div class="video-grid" v-if="filteredHistoryVideos.length > 0">
          <RouterLink v-for="v in filteredHistoryVideos" :key="`${v.id}-${v.watchedAt ?? ''}`" :to="`/video/${v.id}`" class="grid-card">
            <img :src="v.coverUrl" :alt="v.title" class="grid-cover" />
            <div class="grid-body">
              <h3>{{ v.title }}</h3>
              <span class="grid-meta">{{ v.creator.nickname }} · 最近观看 {{ formatTime(v.watchedAt) }}</span>
            </div>
          </RouterLink>
        </div>
        <el-empty v-else :description="historyVideos.length > 0 ? '没有匹配的历史记录' : '还没有观看记录'" />
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
          <el-form-item label="私信权限">
            <div class="form-row privacy-row">
              <el-radio-group v-model="messagePrivacyDraft">
                <el-radio-button label="ALLOW_ALL">允许所有人</el-radio-button>
                <el-radio-button label="FOLLOWING_ONLY">仅我关注的人</el-radio-button>
                <el-radio-button label="DISABLED">禁止私信</el-radio-button>
              </el-radio-group>
              <el-button type="primary" @click="saveMessagePrivacy">保存</el-button>
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
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  createMyFavoriteFolder,
  createVideo,
  deleteAccount,
  deleteCreatorVideo,
  deleteMyFavoriteFolder,
  sendEmailCode,
  fetchCreatorDashboard,
  fetchCreatorFollowerTrend,
  fetchMyFavoriteFolders,
  fetchCreatorPlayTrend,
  fetchCreatorVideos,
  claimDailyCoins,
  fetchFollowers,
  fetchFollowing,
  fetchMyFavoritesByFolder,
  fetchMyHistory,
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
import type {
  CreatorDashboardData,
  CreatorFollowerTrendPoint,
  CreatorPlayTrendPoint,
  CreatorVideo,
  DirectMessagePrivacy,
  FavoriteFolderSummary,
  FollowUserItem,
  MyVideoItem,
  ReviewHistoryItem,
} from '@/types/api';

const fallbackAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=320&q=80';
const store = useAppStore();
const router = useRouter();
const route = useRoute();
const pageLoading = ref(false);
const creating = ref(false);
const savingDraft = ref(false);
const savingAvatar = ref(false);
const activeTab = ref<'home' | 'favorites' | 'likes' | 'history' | 'settings'>('home');
const deleteAccountDialogVisible = ref(false);
const deleteAccountPassword = ref('');
const deletingAccount = ref(false);
const claimingDaily = ref(false);
const deletingVideoId = ref<number | null>(null);

const dashboard = ref<CreatorDashboardData>({
  id: 0,
  username: '',
  nickname: '',
  avatarUrl: null,
  bio: null,
  email: '',
  messagePrivacy: 'ALLOW_ALL',
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
  coinBalance: 0,
  recentRejectedVideos: [],
});
const videos = ref<CreatorVideo[]>([]);
const reviewHistory = ref<ReviewHistoryItem[]>([]);
const favoriteVideos = ref<MyVideoItem[]>([]);
const favoriteFolders = ref<FavoriteFolderSummary[]>([]);
const likedVideos = ref<MyVideoItem[]>([]);
const historyVideos = ref<MyVideoItem[]>([]);
const creatorFollowerTrend = ref<CreatorFollowerTrendPoint[]>([]);
const creatorPlayTrend = ref<CreatorPlayTrendPoint[]>([]);
const trendMode = ref<'play' | 'follower'>('play');
const selectedFavoriteFolderId = ref<number | null>(null);
const favoriteFolderName = ref('');
const favoriteSearchKeyword = ref('');
const likesSearchKeyword = ref('');
const historySearchKeyword = ref('');
const creatingFavoriteFolder = ref(false);
const deletingFavoriteFolderId = ref<number | null>(null);
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
const messagePrivacyDraft = ref<DirectMessagePrivacy>('ALLOW_ALL');
const sendingEmailCode = ref(false);
const countdown = ref(0);
let countdownTimer: number | null = null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const playTrendChartWidth = 640;
const playTrendChartHeight = 240;
const playTrendPaddingTop = 20;
const playTrendPaddingRight = 16;
const playTrendPaddingBottom = 36;
const playTrendPaddingLeft = 48;
const playTrendYAxisX = playTrendPaddingLeft;
const playTrendChartRight = playTrendChartWidth - playTrendPaddingRight;
const playTrendXAxisY = playTrendChartHeight - playTrendPaddingBottom;
const playTrendPlotWidth = playTrendChartRight - playTrendYAxisX;
const playTrendPlotHeight = playTrendXAxisY - playTrendPaddingTop;

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
const activeTrendTitle = computed(() =>
  trendMode.value === 'play' ? '所属视频的播放量变化曲线' : '粉丝数量变化曲线',
);
const activeTrendDescription = computed(() =>
  trendMode.value === 'play'
    ? '仅展示最近 7 天内，该账号下全部视频每天新增播放量之和。'
    : '仅展示最近 7 天内，该账号每天的粉丝总数。',
);
const activeTrendSummaryLabel = computed(() =>
  trendMode.value === 'play' ? '7 日累计播放量' : '当前粉丝数',
);
const activeTrendSeries = computed(() =>
  trendMode.value === 'play'
    ? creatorPlayTrend.value.map((item) => ({ date: item.date, value: item.playCount }))
    : creatorFollowerTrend.value.map((item) => ({ date: item.date, value: item.followerCount })),
);
const activeTrendSummaryValue = computed(() => {
  if (trendMode.value === 'play') {
    return activeTrendSeries.value.reduce((total, item) => total + item.value, 0);
  }

  return activeTrendSeries.value[activeTrendSeries.value.length - 1]?.value ?? dashboard.value.followerCount;
});
const activeFavoriteFolder = computed(
  () => favoriteFolders.value.find((folder) => folder.id === selectedFavoriteFolderId.value) ?? null,
);
const filteredFavoriteVideos = computed(() => filterVideosByKeyword(favoriteVideos.value, favoriteSearchKeyword.value));
const filteredLikedVideos = computed(() => filterVideosByKeyword(likedVideos.value, likesSearchKeyword.value));
const filteredHistoryVideos = computed(() => filterVideosByKeyword(historyVideos.value, historySearchKeyword.value));
const playTrendMax = computed(() => activeTrendSeries.value.reduce((max, item) => Math.max(max, item.value), 0));
const playTrendScaleMax = computed(() => {
  const max = playTrendMax.value;

  if (max <= 0) return 1;
  if (max <= 5) return 5;

  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / magnitude) * magnitude;
});
const playTrendYAxisTicks = computed(() => {
  const divisions = 4;

  return Array.from({ length: divisions + 1 }, (_, index) => {
    const ratio = index / divisions;
    return {
      y: playTrendPaddingTop + playTrendPlotHeight * ratio,
      value: Math.round(playTrendScaleMax.value * (1 - ratio)),
    };
  });
});
const playTrendChartPoints = computed(() => {
  const scaleMax = playTrendScaleMax.value;
  const pointCount = activeTrendSeries.value.length;

  return activeTrendSeries.value.map((item, index) => {
    const x = pointCount <= 1 ? playTrendYAxisX + playTrendPlotWidth / 2 : playTrendYAxisX + (playTrendPlotWidth * index) / (pointCount - 1);
    const yRatio = scaleMax <= 0 ? 0 : item.value / scaleMax;
    const y = playTrendPaddingTop + playTrendPlotHeight * (1 - yRatio);

    return {
      ...item,
      x,
      y,
      valueY: Math.max(y - 10, playTrendPaddingTop + 12),
      label: item.date.slice(5),
    };
  });
});
const playTrendLinePath = computed(() => playTrendChartPoints.value.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' '));
const playTrendAreaPath = computed(() => {
  const points = playTrendChartPoints.value;

  if (!points.length) return '';

  const commands = points.map((point) => `L ${point.x} ${point.y}`).join(' ');
  return `M ${points[0].x} ${playTrendXAxisY} ${commands} L ${points[points.length - 1].x} ${playTrendXAxisY} Z`;
});

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

function normalizeSearchKeyword(value: string) {
  return value.trim().toLocaleLowerCase();
}

function filterVideosByKeyword(items: MyVideoItem[], keyword: string) {
  const normalizedKeyword = normalizeSearchKeyword(keyword);

  if (!normalizedKeyword) {
    return items;
  }

  return items.filter((item) => {
    const searchText = [item.title, item.description, item.category, item.creator.nickname]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
    return searchText.includes(normalizedKeyword);
  });
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
  messagePrivacyDraft.value = dashboardData.messagePrivacy;
  videos.value = videoList;
}

async function handleDailyClaim() {
  claimingDaily.value = true;
  try {
    const result = await claimDailyCoins();
    dashboard.value.coinBalance = result.balance;
    if (result.claimed) {
      ElMessage.success(`打卡成功，获得 ${result.amount} 个货币`);
    } else {
      ElMessage.info('今日已打卡');
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '打卡失败'));
  } finally {
    claimingDaily.value = false;
  }
}

async function loadFavoriteVideos() {
  if (!selectedFavoriteFolderId.value) {
    favoriteVideos.value = [];
    return;
  }

  try {
    favoriteVideos.value = await fetchMyFavoritesByFolder(selectedFavoriteFolderId.value);
  } catch {
    favoriteVideos.value = [];
  }
}

function resolveFavoriteFolderId(folders: FavoriteFolderSummary[], preferredFolderId?: number | null) {
  if (preferredFolderId && folders.some((folder) => folder.id === preferredFolderId)) {
    return preferredFolderId;
  }

  if (selectedFavoriteFolderId.value && folders.some((folder) => folder.id === selectedFavoriteFolderId.value)) {
    return selectedFavoriteFolderId.value;
  }

  return folders.find((folder) => folder.isDefault)?.id ?? folders[0]?.id ?? null;
}

async function loadFavoriteFolders(preferredFolderId?: number | null) {
  try {
    const folders = await fetchMyFavoriteFolders();
    favoriteFolders.value = folders;
    selectedFavoriteFolderId.value = resolveFavoriteFolderId(folders, preferredFolderId);
    await loadFavoriteVideos();
  } catch {
    favoriteFolders.value = [];
    favoriteVideos.value = [];
    selectedFavoriteFolderId.value = null;
  }
}

async function handleSelectFavoriteFolder(folderId: number) {
  if (selectedFavoriteFolderId.value === folderId) {
    return;
  }

  selectedFavoriteFolderId.value = folderId;
  await loadFavoriteVideos();
}

async function handleCreateFavoriteFolder() {
  const name = favoriteFolderName.value.trim();

  if (!name) {
    ElMessage.warning('请输入收藏夹名称');
    return;
  }

  creatingFavoriteFolder.value = true;
  try {
    const folder = await createMyFavoriteFolder({ name });
    favoriteFolderName.value = '';
    ElMessage.success('收藏夹已创建');
    await loadFavoriteFolders(folder.id);
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '创建收藏夹失败'));
  } finally {
    creatingFavoriteFolder.value = false;
  }
}

async function handleDeleteFavoriteFolder(folder: FavoriteFolderSummary) {
  try {
    await ElMessageBox.confirm(
      `确认删除收藏夹“${folder.name}”吗？其中的视频会自动移动到默认收藏夹。`,
      '删除收藏夹',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  deletingFavoriteFolderId.value = folder.id;
  try {
    const result = await deleteMyFavoriteFolder(folder.id);
    ElMessage.success('收藏夹已删除');
    const preferredFolderId = selectedFavoriteFolderId.value === folder.id ? result.movedToFolderId : selectedFavoriteFolderId.value;
    await loadFavoriteFolders(preferredFolderId);
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '删除收藏夹失败'));
  } finally {
    if (deletingFavoriteFolderId.value === folder.id) {
      deletingFavoriteFolderId.value = null;
    }
  }
}

async function loadLikedVideos() {
  try {
    likedVideos.value = await fetchMyLikes();
  } catch {
    likedVideos.value = [];
  }
}

async function loadHistoryVideos() {
  try {
    historyVideos.value = await fetchMyHistory();
  } catch {
    historyVideos.value = [];
  }
}

async function loadCreatorPlayTrend() {
  try {
    creatorPlayTrend.value = await fetchCreatorPlayTrend();
  } catch {
    creatorPlayTrend.value = [];
  }
}

async function loadCreatorFollowerTrend() {
  try {
    creatorFollowerTrend.value = await fetchCreatorFollowerTrend();
  } catch {
    creatorFollowerTrend.value = [];
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

async function saveMessagePrivacy() {
  try {
    const result = await updateProfile({ messagePrivacy: messagePrivacyDraft.value });
    dashboard.value.messagePrivacy = result.messagePrivacy || messagePrivacyDraft.value;
    messagePrivacyDraft.value = dashboard.value.messagePrivacy;
    ElMessage.success('私信权限已更新');
  } catch {
    ElMessage.error('更新私信权限失败');
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

async function handleDeleteVideo(video: CreatorVideo) {
  try {
    await ElMessageBox.confirm(
      `确认删除《${video.title}》吗？删除后将同时移除播放、评论、弹幕、点赞与收藏等相关数据，且无法恢复。`,
      '删除视频',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  deletingVideoId.value = video.id;
  try {
    await deleteCreatorVideo(video.id);
    if (previewVideo.value?.id === video.id) {
      previewDialogVisible.value = false;
      previewVideo.value = null;
    }
    if (editingVideoId.value === video.id) {
      editDialogVisible.value = false;
      editingVideoId.value = null;
      editingVideoStatus.value = '';
    }
    ElMessage.success('视频已删除');
    await refreshAll();
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '删除视频失败'));
  } finally {
    if (deletingVideoId.value === video.id) {
      deletingVideoId.value = null;
    }
  }
}

onMounted(async () => {
  const tabParam = route.query.tab as string;
  if (tabParam === 'collections' || tabParam === 'favorites') {
    activeTab.value = 'favorites';
  } else if (tabParam === 'likes') {
    activeTab.value = 'likes';
  } else if (tabParam === 'history') {
    activeTab.value = 'history';
  } else if (tabParam === 'settings') {
    activeTab.value = 'settings';
  }

  pageLoading.value = true;
  try {
    await refreshAll();
    followingCount.value = dashboard.value.followingCount;
    if (activeTab.value === 'home') {
      await Promise.all([loadCreatorPlayTrend(), loadCreatorFollowerTrend()]);
    } else if (activeTab.value === 'favorites') {
      await loadFavoriteFolders();
    } else if (activeTab.value === 'likes') {
      await loadLikedVideos();
    } else if (activeTab.value === 'history') {
      await loadHistoryVideos();
    }
  } catch {
    ElMessage.warning({ message: '请先登录用户账号查看此页面', duration: 2500 });
  } finally {
    pageLoading.value = false;
  }
});

watch(activeTab, (tab) => {
  if (tab === 'home') {
    void Promise.all([loadCreatorPlayTrend(), loadCreatorFollowerTrend()]);
  } else if (tab === 'favorites') {
    void loadFavoriteFolders();
  } else if (tab === 'likes') {
    void loadLikedVideos();
  } else if (tab === 'history') {
    void loadHistoryVideos();
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

.privacy-row {
  align-items: center;
  flex-wrap: wrap;
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

.play-trend-panel {
  gap: 18px;
}

.play-trend-head {
  align-items: flex-start;
}

.play-trend-heading {
  display: grid;
  gap: 4px;
}

.play-trend-side {
  display: grid;
  justify-items: end;
  gap: 12px;
}

.play-trend-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  border-radius: 999px;
  background: #eff6ff;
}

.play-trend-switch-btn {
  border: 0;
  background: transparent;
  color: #64748b;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.play-trend-switch-btn.active {
  background: #2563eb;
  color: #ffffff;
}

.play-trend-summary {
  display: grid;
  justify-items: end;
  gap: 4px;
  min-width: 120px;
}

.play-trend-summary span {
  color: #6b7280;
  font-size: 13px;
}

.play-trend-summary strong {
  color: #111827;
  font-size: 28px;
  line-height: 1;
}

.play-trend-chart {
  width: 100%;
  min-height: 260px;
}

.play-trend-svg {
  width: 100%;
  height: 260px;
  overflow: visible;
}

.play-trend-grid {
  stroke: rgba(148, 163, 184, 0.28);
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

.play-trend-axis {
  stroke: rgba(100, 116, 139, 0.5);
  stroke-width: 1.5;
}

.play-trend-area {
  fill: rgba(37, 99, 235, 0.12);
}

.play-trend-line {
  fill: none;
  stroke: #2563eb;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.play-trend-point {
  fill: #ffffff;
  stroke: #2563eb;
  stroke-width: 3;
}

.play-trend-axis-text,
.play-trend-label,
.play-trend-point-value {
  fill: #6b7280;
  font-size: 12px;
}

.play-trend-axis-text {
  text-anchor: end;
}

.play-trend-label,
.play-trend-point-value {
  text-anchor: middle;
}

.play-trend-point-value {
  fill: #111827;
  font-size: 12px;
  font-weight: 600;
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

.favorite-panel {
  gap: 20px;
}

.favorite-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.favorite-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 20px;
  align-items: flex-start;
}

.favorite-sidebar,
.favorite-content {
  display: grid;
  gap: 16px;
}

.favorite-create-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.favorite-folder-list {
  display: grid;
  gap: 10px;
}

.favorite-folder-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: #f8fafc;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.favorite-folder-card.active {
  border-color: rgba(37, 99, 235, 0.4);
  background: rgba(37, 99, 235, 0.06);
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.08);
}

.favorite-folder-select,
.favorite-folder-delete {
  border: 0;
  background: transparent;
}

.favorite-folder-select {
  display: grid;
  gap: 6px;
  text-align: left;
  cursor: pointer;
  padding: 0;
}

.favorite-folder-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.favorite-folder-title-row strong {
  color: #111827;
  font-size: 14px;
}

.favorite-folder-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
  font-size: 12px;
}

.favorite-folder-meta {
  color: #6b7280;
  font-size: 12px;
}

.favorite-folder-delete {
  color: #ef4444;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 6px;
}

.favorite-folder-delete:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

.favorite-content-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.collection-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.video-search-input {
  width: min(320px, 100%);
}

.favorite-content-head h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
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
