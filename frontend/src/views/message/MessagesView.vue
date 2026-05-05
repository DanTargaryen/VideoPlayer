<template>
  <section class="page">
    <div class="hero">
      <div>
        <h1>私信</h1>
        <p>与其他用户一对一聊天，并按对方设置遵守私信权限。</p>
      </div>
      <el-button type="primary" plain @click="refreshAll">刷新</el-button>
    </div>

    <div class="layout">
      <aside class="sidebar">
        <section class="sidebar-card">
          <div class="section-head">
            <h2>我的关注</h2>
            <span class="subtle">按最近对话排序</span>
          </div>
          <div v-if="followingConversationList.length > 0" class="user-list">
            <button
              v-for="item in followingConversationList"
              :key="item.id"
              type="button"
              class="user-item"
              :class="{ active: activeTargetUserId === item.id }"
              @click="openConversation(item.id)"
            >
              <img :src="item.avatarUrl || fallbackAvatar" :alt="item.nickname" class="avatar" />
              <div class="user-main">
                <div class="user-top">
                  <strong>{{ item.nickname }}</strong>
                  <span v-if="item.lastMessage" class="time">{{ formatListTime(item.lastMessage.createdAt) }}</span>
                </div>
                <p class="preview">{{ formatSidebarPreview(item) }}</p>
              </div>
              <span v-if="item.unreadCount > 0" class="unread-pill">{{ item.unreadCount }}</span>
            </button>
          </div>
          <el-empty v-else description="你还没有关注任何人" />
        </section>
      </aside>

      <section class="chat-card">
        <template v-if="activeConversation">
          <div class="chat-head">
            <div class="chat-user">
              <img
                :src="activeConversation.targetUser.avatarUrl || fallbackAvatar"
                :alt="activeConversation.targetUser.nickname"
                class="chat-avatar"
              />
              <div>
                <h2>{{ activeConversation.targetUser.nickname }}</h2>
                <p>{{ formatPrivacyLabel(activeConversation.messagePrivacy) }}</p>
              </div>
            </div>
            <RouterLink :to="`/users/${activeConversation.targetUser.id}`" class="profile-link">查看主页</RouterLink>
          </div>

          <div class="permission-banner" :class="{ blocked: !activeConversation.canSend }">
            <template v-if="activeConversation.canSend">
              可以发送私信
              <span v-if="activeConversation.senderFollowsRecipient" class="subtle-inline">你已关注对方</span>
            </template>
            <template v-else>
              {{ activeConversation.reason || '当前无法发送私信' }}
            </template>
          </div>

          <div ref="messageListRef" class="message-list">
            <div v-if="activeConversation.messages.length === 0" class="empty-chat">
              <el-empty description="还没有聊天记录，发一条消息开始吧" />
            </div>
            <div
              v-for="item in activeConversation.messages"
              :key="item.id"
              class="message-row"
              :class="{ self: item.senderId === store.userId }"
            >
              <img
                :src="item.senderId === store.userId ? currentUserAvatar : (activeConversation.targetUser.avatarUrl || fallbackAvatar)"
                :alt="item.sender.nickname"
                class="message-avatar"
              />
              <div class="bubble-wrap">
                <div class="bubble">{{ item.content }}</div>
                <span class="bubble-time">{{ formatMessageTime(item.createdAt) }}</span>
              </div>
            </div>
          </div>

          <div class="composer">
            <el-input
              v-model="messageDraft"
              type="textarea"
              :rows="3"
              maxlength="1000"
              show-word-limit
              placeholder="输入私信内容..."
              :disabled="!activeConversation.canSend || sendingMessage"
              @keydown.enter="handleComposerEnter"
            />
            <div class="composer-actions">
              <span class="subtle">Enter 发送，Ctrl + Enter 换行</span>
              <el-button
                type="primary"
                :loading="sendingMessage"
                :disabled="!activeConversation.canSend || !messageDraft.trim()"
                @click="sendMessage"
              >
                发送
              </el-button>
            </div>
          </div>
        </template>

        <el-empty v-else description="从左侧选择一个联系人开始私聊" />
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import {
  fetchDirectMessageConversation,
  fetchDirectMessageConversations,
  fetchFollowing,
  fetchUnreadDirectMessageCount,
  sendDirectMessage,
} from '@/api/platform';
import { useAppStore } from '@/stores/app';
import type { DirectMessageConversationDetail, DirectMessageConversationSummary, FollowUserItem } from '@/types/api';

const fallbackAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=320&q=80';
const store = useAppStore();
const route = useRoute();
const router = useRouter();

const conversations = ref<DirectMessageConversationSummary[]>([]);
const followingContacts = ref<FollowUserItem[]>([]);
const activeConversation = ref<DirectMessageConversationDetail | null>(null);
const activeTargetUserId = ref<number | null>(null);
const messageDraft = ref('');
const sendingMessage = ref(false);
const messageListRef = ref<HTMLDivElement | null>(null);

const initialTargetUserId = computed(() => {
  const raw = route.query.userId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
});

const currentUserAvatar = computed(() => store.avatarUrl || fallbackAvatar);


type FollowingConversationItem = FollowUserItem & {
  unreadCount: number;
  lastMessage: DirectMessageConversationSummary['lastMessage'] | null;
};

const followingConversationList = computed<FollowingConversationItem[]>(() => {
  const conversationMap = new Map(conversations.value.map((item) => [item.user.id, item] as const));

  return [...followingContacts.value]
    .map((contact) => {
      const conversation = conversationMap.get(contact.id);
      return {
        ...contact,
        unreadCount: conversation?.unreadCount ?? 0,
        lastMessage: conversation?.lastMessage ?? null,
      };
    })
    .sort((left, right) => {
      const leftTime = left.lastMessage?.createdAt ?? left.followedAt;
      const rightTime = right.lastMessage?.createdAt ?? right.followedAt;
      return new Date(rightTime).getTime() - new Date(leftTime).getTime();
    });
});

function formatPrivacyLabel(value: DirectMessageConversationDetail['messagePrivacy']) {
  if (value === 'ALLOW_ALL') return '允许所有人私信';
  if (value === 'FOLLOWING_ONLY') return '仅允许自己关注的人私信';
  return '已关闭私信';
}

function formatListTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}小时前`;
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}


function formatSidebarPreview(item: FollowingConversationItem) {
  if (!item.lastMessage) {
    return '还没有聊天记录';
  }

  return `${item.lastMessage.senderId === store.userId ? '你：' : ''}${item.lastMessage.content}`;
}

async function syncUnreadCount() {
  if (!store.isLoggedIn) {
    store.setUnreadDirectMessageCount(0);
    return;
  }

  try {
    const result = await fetchUnreadDirectMessageCount();
    store.setUnreadDirectMessageCount(result.unreadCount);
  } catch {
    store.setUnreadDirectMessageCount(0);
  }
}

async function loadConversation(targetUserId: number) {
  try {
    activeConversation.value = await fetchDirectMessageConversation(targetUserId);
    activeTargetUserId.value = targetUserId;
    messageDraft.value = '';
    await Promise.all([loadConversations(), syncUnreadCount()]);
    await nextTick();
    messageListRef.value?.scrollTo({ top: messageListRef.value.scrollHeight, behavior: 'smooth' });
  } catch (error) {
    ElMessage.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || '加载会话失败');
  }
}

async function loadConversations() {
  conversations.value = await fetchDirectMessageConversations();
}

async function loadFollowingContacts() {
  if (!store.userId) {
    followingContacts.value = [];
    return;
  }

  followingContacts.value = await fetchFollowing(store.userId);
}

async function refreshAll() {
  if (!store.isLoggedIn) {
    ElMessage.warning('请先登录后使用私信功能');
    return;
  }

  try {
    await Promise.all([loadConversations(), loadFollowingContacts(), syncUnreadCount()]);
    const targetUserId = activeTargetUserId.value ?? initialTargetUserId.value;
    if (targetUserId) {
      await loadConversation(targetUserId);
    }
  } catch {
    ElMessage.error('加载私信数据失败');
  }
}

async function openConversation(targetUserId: number) {
  await router.replace({ path: '/messages', query: { userId: String(targetUserId) } });
  await loadConversation(targetUserId);
}

function handleComposerEnter(event: KeyboardEvent) {
  if (event.isComposing || event.ctrlKey) {
    return;
  }

  event.preventDefault();
  void sendMessage();
}

async function sendMessage() {
  const targetUserId = activeTargetUserId.value;
  if (!targetUserId || !messageDraft.value.trim()) {
    return;
  }

  sendingMessage.value = true;
  try {
    const result = await sendDirectMessage(targetUserId, messageDraft.value);
    if (activeConversation.value) {
      activeConversation.value.messages.push(result.message);
    }
    messageDraft.value = '';
    await Promise.all([loadConversations(), syncUnreadCount()]);
    await nextTick();
    messageListRef.value?.scrollTo({ top: messageListRef.value.scrollHeight, behavior: 'smooth' });
  } catch (error) {
    ElMessage.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message || '发送私信失败');
  } finally {
    sendingMessage.value = false;
  }
}

watch(
  () => route.query.userId,
  (value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0 && id !== activeTargetUserId.value && store.isLoggedIn) {
      void loadConversation(id);
    }
  },
);

onMounted(() => {
  void refreshAll();
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

.layout {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 20px;
  height: 620px;
  min-height: 620px;
  align-items: stretch;
}

.sidebar {
  display: grid;
  min-height: 0;
}

.sidebar-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.chat-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.sidebar-card,
.chat-card {
  padding: 20px;
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

.section-head,
.chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-head h2,
.chat-head h2 {
  margin: 0;
  color: #111827;
}

.subtle,
.chat-head p,
.time,
.bubble-time,
.subtle-inline {
  color: #6b7280;
  font-size: 12px;
}

.user-list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 76px;
  padding: 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 12px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;
  box-sizing: border-box;
  flex: 0 0 auto;
}

.user-item:hover,
.user-item.active {
  border-color: rgba(37, 99, 235, 0.18);
  background: rgba(37, 99, 235, 0.06);
}

.avatar,
.chat-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.chat-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-main {
  flex: 1;
  min-width: 0;
}

.user-main.simple {
  display: flex;
  align-items: center;
}

.user-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.user-top strong,
.user-main strong,
.profile-link {
  color: #111827;
}

.preview {
  margin: 4px 0 0;
  color: #4b5563;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-pill {
  min-width: 22px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 12px;
  text-align: center;
}

.profile-link {
  text-decoration: none;
}

.permission-banner {
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(22, 163, 74, 0.08);
  color: #15803d;
  font-size: 14px;
}

.permission-banner.blocked {
  background: rgba(239, 68, 68, 0.08);
  color: #b91c1c;
}

.message-list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: flex-start;
  gap: 14px;
  min-height: 0;
  padding: 18px 16px;
  border-radius: 14px;
  background: #f5f7fb;
  border: 1px solid rgba(15, 23, 42, 0.05);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 12px;
}

.empty-chat {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  place-items: center;
  min-height: 240px;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.message-row.self {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 10px;
  object-fit: cover;
  background: #e5e7eb;
}

.bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: min(76%, 560px);
}

.message-row.self .bubble-wrap {
  align-items: flex-end;
}

.bubble {
  padding: 10px 14px;
  border-radius: 14px;
  background: #ffffff;
  color: #111827;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.message-row.self .bubble {
  background: #d9fdd3;
  color: #111827;
}

.composer {
  display: grid;
  gap: 10px;
}

.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
