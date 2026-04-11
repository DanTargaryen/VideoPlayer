<template>
  <article class="comment-node">
    <div class="comment-main">
      <strong>{{ comment.user.nickname }}</strong>
      <p>{{ comment.content }}</p>
      <div class="comment-meta">
        <span>{{ formatTime(comment.createdAt) }}</span>
        <button class="link-btn" @click="toggleReplyBox">回复</button>
        <button class="link-btn danger" @click="$emit('report', comment.id)">举报</button>
      </div>
    </div>

    <div v-if="activeReplyId === comment.id" class="reply-box">
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

    <div v-if="comment.replies.length > 0" class="reply-list">
      <CommentThread
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :root-id="rootId"
        :active-reply-id="activeReplyId"
        :reply-form-value="replyFormValue"
        @update:reply-form-value="$emit('update:replyFormValue', $event)"
        @toggle-reply="$emit('toggle-reply', $event)"
        @submit-reply="$emit('submit-reply', $event)"
        @report="$emit('report', $event)"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import type { CommentReply } from '@/types/api';

const props = defineProps<{
  comment: CommentReply;
  rootId: number;
  activeReplyId: number | null;
  replyFormValue: string;
}>();

const emit = defineEmits<{
  (e: 'toggle-reply', commentId: number): void;
  (e: 'submit-reply', payload: { parentId: number; rootId: number }): void;
  (e: 'report', commentId: number): void;
  (e: 'update:replyFormValue', value: string): void;
}>();

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

.comment-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: #94a3b8;
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
  border-left: 2px solid rgba(148, 163, 184, 0.18);
  margin-left: 8px;
}

.link-btn {
  color: #60a5fa;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.link-btn.danger {
  color: #fca5a5;
}
</style>
