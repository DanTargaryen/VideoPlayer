<template>
  <article class="comment-node" :class="{ 'comment-node-pending': comment.isPendingGrok }">
    <div class="comment-shell">
      <span class="comment-avatar">{{ userInitial }}</span>
      <div class="comment-main">
        <strong>{{ comment.user.nickname }}</strong>
        <p>
          <span v-if="comment.content">{{ comment.content }}</span>
          <span v-if="comment.isPendingGrok" class="pending-dots" aria-hidden="true">
            <i></i><i></i><i></i>
          </span>
        </p>
        <img
          v-if="comment.imageUrl"
          :src="comment.imageUrl"
          :alt="`${comment.user.nickname} 的评论图片`"
          class="comment-image"
        />
        <div class="comment-meta">
          <span>{{ comment.isPendingGrok ? '等待回复中' : formatTime(comment.createdAt) }}</span>
          <button v-if="!comment.isPendingGrok" class="link-btn" @click="toggleReplyBox">回复</button>
          <button v-if="!comment.isPendingGrok" class="link-btn danger" @click="$emit('report', comment.id)">举报</button>
        </div>
      </div>
    </div>

    <div v-if="!comment.isPendingGrok && activeReplyId === comment.id" class="reply-box">
      <el-input
        :model-value="replyFormValue"
        type="textarea"
        :rows="2"
        placeholder="输入回复内容"
        @update:model-value="$emit('update:replyFormValue', $event)"
      />
      <div class="comment-actions">
        <el-button type="primary" size="small" @click="handleSubmitReply">发送回复</el-button>
      </div>
    </div>

    <button
      v-if="comment.replies.length > 0"
      class="expand-btn"
      @click="repliesExpanded = !repliesExpanded"
    >
      <span class="expand-arrow" :class="{ expanded: repliesExpanded }">▶</span>
      {{ repliesExpanded ? '收起回复' : `展开 ${comment.replies.length} 条回复` }}
    </button>

    <div v-if="comment.replies.length > 0 && repliesExpanded" class="reply-list">
      <CommentThread
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :root-id="rootId"
        :active-reply-id="activeReplyId"
        :reply-form-value="replyFormValue"
        :expanded-comment-ids="expandedCommentIds"
        @update:reply-form-value="$emit('update:replyFormValue', $event)"
        @toggle-reply="$emit('toggle-reply', $event)"
        @submit-reply="$emit('submit-reply', $event)"
        @report="$emit('report', $event)"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { CommentReply } from '@/types/api';

const props = defineProps<{
  comment: CommentReply;
  rootId: number;
  activeReplyId: number | null;
  replyFormValue: string;
  expandedCommentIds: Set<number>;
}>();

const emit = defineEmits<{
  (e: 'toggle-reply', commentId: number): void;
  (e: 'submit-reply', payload: { parentId: number; rootId: number }): void;
  (e: 'report', commentId: number): void;
  (e: 'update:replyFormValue', value: string): void;
}>();

const repliesExpanded = ref(props.expandedCommentIds.has(props.comment.id));
const userInitial = computed(() => props.comment.user.nickname.trim().charAt(0).toUpperCase() || '评');

watch(
  () => props.expandedCommentIds.has(props.comment.id),
  (shouldExpand) => {
    if (shouldExpand) {
      repliesExpanded.value = true;
    }
  },
);

watch(
  () => props.comment.replies.length,
  (nextLength, previousLength) => {
    if (nextLength > previousLength) {
      repliesExpanded.value = true;
    }
  },
);

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

function toggleReplyBox() {
  emit('toggle-reply', props.comment.id);
}

function handleSubmitReply() {
  emit('submit-reply', { parentId: props.comment.id, rootId: props.rootId });
}
</script>

<style scoped>
.comment-node {
  display: grid;
  gap: 12px;
}

.comment-shell {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.comment-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  overflow: hidden;
  flex-shrink: 0;
  border-radius: 13px;
  background: linear-gradient(135deg, var(--color-primary-light), var(--color-bg-page));
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 800;
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.1);
}

.comment-main {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.comment-node-pending {
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--color-primary-light);
}

.comment-main strong {
  color: var(--color-text-main);
  font-size: 14px;
  line-height: 1.35;
}

.comment-main p {
  margin: 0;
  color: #334155;
  font-size: 14px;
  line-height: 1.7;
}

.comment-image {
  display: block;
  max-width: min(320px, 100%);
  max-height: 320px;
  border-radius: 14px;
  object-fit: cover;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.pending-dots {
  display: inline-flex;
  gap: 4px;
  margin-left: 6px;
  vertical-align: middle;
}

.pending-dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: pending-bounce 1s infinite ease-in-out;
}

.pending-dots i:nth-child(2) {
  animation-delay: 0.15s;
}

.pending-dots i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes pending-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.35;
  }

  40% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

.comment-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  color: var(--color-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.reply-box {
  display: grid;
  gap: 8px;
}

.reply-box :deep(.el-textarea__inner) {
  border-radius: 12px;
  background: var(--color-bg-page);
  color: var(--color-text-main);
  box-shadow: 0 0 0 1px var(--color-border) inset;
}

.reply-box :deep(.el-textarea__inner::placeholder) {
  color: var(--color-text-muted);
}

.reply-box :deep(.el-textarea__inner:focus) {
  background: var(--color-bg-card);
  box-shadow:
    0 0 0 1px var(--color-primary) inset,
    0 0 0 3px rgba(37, 99, 235, 0.12);
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
}

.reply-list {
  display: grid;
  gap: 12px;
  padding-left: 50px;
  border-left: 0;
  margin-left: 0;
}

.link-btn {
  padding: 0;
  color: var(--color-text-secondary);
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 12px;
  transition: color 160ms cubic-bezier(0.16, 1, 0.3, 1);
}

.link-btn:hover {
  color: var(--color-primary);
}

.link-btn.danger {
  color: var(--color-text-muted);
}

.link-btn.danger:hover {
  color: var(--color-danger);
}

.expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  margin-left: 50px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  transition: color 0.12s ease;
}

.expand-btn:hover {
  color: var(--color-primary-hover);
}

.expand-arrow {
  display: inline-block;
  font-size: 10px;
  transition: transform 0.2s ease;
}

.expand-arrow.expanded {
  transform: rotate(90deg);
}

@media (max-width: 640px) {
  .comment-shell {
    grid-template-columns: 1fr;
  }

  .comment-avatar {
    display: none;
  }

  .reply-list,
  .expand-btn {
    margin-left: 0;
    padding-left: 14px;
  }
}
</style>
