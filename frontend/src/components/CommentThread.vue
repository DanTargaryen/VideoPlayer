<template>
  <article class="comment-node" :class="{ 'comment-node-pending': comment.isPendingGrok }">
    <div class="comment-main">
      <strong>{{ comment.user.nickname }}</strong>
      <p>
        {{ comment.content }}
        <span v-if="comment.isPendingGrok" class="pending-dots" aria-hidden="true">
          <i></i><i></i><i></i>
        </span>
      </p>
      <div class="comment-meta">
        <span>{{ comment.isPendingGrok ? '等待回复中' : formatTime(comment.createdAt) }}</span>
        <button v-if="!comment.isPendingGrok" class="link-btn" @click="toggleReplyBox">回复</button>
        <button v-if="!comment.isPendingGrok" class="link-btn danger" @click="$emit('report', comment.id)">举报</button>
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
import { ref, watch } from 'vue';
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

.comment-main {
  display: grid;
  gap: 8px;
}

.comment-node-pending {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.05);
}

.comment-main strong {
  color: #111827;
}

.comment-main p {
  margin: 0;
  color: #374151;
  line-height: 1.6;
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
  background: #2563eb;
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
  gap: 16px;
  flex-wrap: wrap;
  color: #6b7280;
}

.reply-box {
  display: grid;
  gap: 8px;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
}

.reply-list {
  display: grid;
  gap: 12px;
  padding-left: 24px;
  border-left: 2px solid rgba(15, 23, 42, 0.08);
  margin-left: 8px;
}

.link-btn {
  color: #2563eb;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.link-btn.danger {
  color: #dc2626;
}

.expand-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: #2563eb;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.12s ease;
}

.expand-btn:hover {
  color: #1d4ed8;
}

.expand-arrow {
  display: inline-block;
  font-size: 10px;
  transition: transform 0.2s ease;
}

.expand-arrow.expanded {
  transform: rotate(90deg);
}
</style>
