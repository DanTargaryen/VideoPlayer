<template>
  <section class="assistant-panel" aria-label="澜澜 AI 助手聊天面板">
    <header class="assistant-panel__header">
      <div>
        <span class="assistant-panel__eyebrow">AI Assistant</span>
        <h2>澜澜小助手</h2>
      </div>
      <div class="assistant-panel__actions">
        <button type="button" title="清空对话" @click="assistantStore.clearMessages">清空</button>
        <button type="button" aria-label="关闭助手" @click="$emit('close')">×</button>
      </div>
    </header>

    <div ref="messageListRef" class="assistant-panel__messages">
      <article
        v-for="message in assistantStore.messages"
        :key="message.id"
        class="assistant-panel__message"
        :class="[`assistant-panel__message--${message.role}`, { 'assistant-panel__message--failed': message.status === 'failed' }]"
      >
        <div class="assistant-panel__bubble" v-html="renderMarkdown(message.content)"></div>
      </article>
      <div v-if="assistantStore.thinking" class="assistant-panel__loading">
        <span></span>
        <span></span>
        <span></span>
        澜澜正在思考...
      </div>
    </div>

    <section class="assistant-panel__tour-entry" aria-label="网站教程入口">
      <div>
        <strong>网站教程</strong>
        <span>从浏览、搜索、互动到投稿审核，带你完整走一遍。</span>
      </div>
      <button type="button" :disabled="assistantStore.tourActive || assistantStore.tourLoading" @click="startTutorial">
        {{ assistantStore.tourLoading ? '准备中' : assistantStore.tourActive ? '进行中' : '开始教程' }}
      </button>
    </section>

    <div class="assistant-panel__suggestions">
      <button
        v-for="suggestion in assistantStore.suggestions"
        :key="suggestion"
        type="button"
        :disabled="assistantStore.thinking"
        @click="submitSuggestion(suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>

    <form class="assistant-panel__composer" @submit.prevent="submitDraft">
      <textarea
        v-model="draft"
        rows="3"
        :disabled="assistantStore.thinking"
        placeholder="可以问网站功能，例如：如何投稿视频？"
        @keydown.enter.exact.prevent="submitDraft"
      ></textarea>
      <button type="submit" :disabled="assistantStore.thinking || !draft.trim()">
        {{ assistantStore.thinking ? '发送中' : '发送' }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

import { useAssistantStore } from '@/stores/assistant';
import { useAppStore } from '@/stores/app';
import { renderMarkdown } from '@/utils/markdown';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'send', content: string): void;
}>();

const assistantStore = useAssistantStore();
const appStore = useAppStore();
const draft = ref('');
const messageListRef = ref<HTMLElement | null>(null);

watch(
  () => [assistantStore.messages.length, assistantStore.thinking],
  () => {
    void scrollToBottom();
  },
  { flush: 'post' },
);

assistantStore.ensureWelcomeMessage();

function submitDraft() {
  const content = draft.value.trim();
  if (!content || assistantStore.thinking) return;
  draft.value = '';
  emit('send', content);
}

function submitSuggestion(content: string) {
  if (assistantStore.thinking) return;
  emit('send', content);
}

function startTutorial() {
  if (assistantStore.tourActive || assistantStore.tourLoading) return;
  void assistantStore.startTour(appStore.isLoggedIn);
}

async function scrollToBottom() {
  await nextTick();
  const el = messageListRef.value;
  if (el) {
    el.scrollTop = el.scrollHeight;
  }
}
</script>

<style scoped>
.assistant-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto auto;
  width: min(380px, calc(100vw - 28px));
  height: min(540px, calc(100vh - 32px));
  overflow: hidden;
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 26px 70px rgba(15, 23, 42, 0.22);
  backdrop-filter: blur(18px);
}

.assistant-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 18px 14px;
  background:
    radial-gradient(circle at 12% 0%, rgba(245, 158, 11, 0.2), transparent 34%),
    linear-gradient(135deg, #eff6ff, #ffffff);
  border-bottom: 1px solid rgba(37, 99, 235, 0.1);
}

.assistant-panel__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.assistant-panel__header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
}

.assistant-panel__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.assistant-panel__actions button {
  min-width: 34px;
  height: 34px;
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 12px;
  background: #fff;
  color: #64748b;
  font-weight: 800;
  cursor: pointer;
}

.assistant-panel__actions button:hover {
  color: #2563eb;
  border-color: rgba(37, 99, 235, 0.24);
}

.assistant-panel__messages {
  min-height: 0;
  padding: 18px;
  overflow-y: auto;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
}

.assistant-panel__message {
  display: flex;
  margin-bottom: 12px;
}

.assistant-panel__message--user {
  justify-content: flex-end;
}

.assistant-panel__bubble {
  max-width: 82%;
  padding: 10px 13px;
  border-radius: 16px;
  color: #334155;
  font-size: 14px;
  line-height: 1.65;
  white-space: normal;
  word-break: break-word;
}

.assistant-panel__message--assistant .assistant-panel__bubble {
  border-bottom-left-radius: 5px;
  background: #eef2ff;
  color: #1e293b;
}

.assistant-panel__message--user .assistant-panel__bubble {
  border-bottom-right-radius: 5px;
  background: #2563eb;
  color: #fff;
}

.assistant-panel__message--failed .assistant-panel__bubble {
  background: #fef2f2;
  color: #b91c1c;
}
.assistant-panel__bubble :deep(p) {
  margin: 0;
}

.assistant-panel__bubble :deep(p + p),
.assistant-panel__bubble :deep(p + ol),
.assistant-panel__bubble :deep(p + ul),
.assistant-panel__bubble :deep(ol + p),
.assistant-panel__bubble :deep(ul + p) {
  margin-top: 8px;
}

.assistant-panel__bubble :deep(ol),
.assistant-panel__bubble :deep(ul) {
  margin: 6px 0 0;
  padding-left: 20px;
}

.assistant-panel__bubble :deep(li) {
  margin: 4px 0;
}

.assistant-panel__bubble :deep(strong) {
  font-weight: 900;
}

.assistant-panel__bubble :deep(em) {
  font-style: italic;
}

.assistant-panel__bubble :deep(code) {
  padding: 2px 5px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace;
  font-size: 0.92em;
}

.assistant-panel__bubble :deep(pre) {
  margin: 8px 0 0;
  padding: 10px;
  overflow-x: auto;
  border-radius: 12px;
  background: #0f172a;
  color: #e2e8f0;
}

.assistant-panel__bubble :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
  white-space: pre;
}

.assistant-panel__bubble :deep(h1),
.assistant-panel__bubble :deep(h2),
.assistant-panel__bubble :deep(h3),
.assistant-panel__bubble :deep(h4) {
  margin: 0 0 6px;
  color: inherit;
  font-size: 1em;
  line-height: 1.45;
}

.assistant-panel__loading {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
}

.assistant-panel__loading span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2563eb;
  animation: assistant-dot 900ms infinite ease-in-out;
}

.assistant-panel__loading span:nth-child(2) {
  animation-delay: 120ms;
}

.assistant-panel__loading span:nth-child(3) {
  animation-delay: 240ms;
}


.assistant-panel__tour-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 14px;
  border-top: 1px solid rgba(37, 99, 235, 0.08);
  background: linear-gradient(135deg, #ffffff, #eff6ff);
}

.assistant-panel__tour-entry div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.assistant-panel__tour-entry strong {
  color: #1e293b;
  font-size: 13px;
  font-weight: 900;
}

.assistant-panel__tour-entry span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.assistant-panel__tour-entry button {
  flex: 0 0 auto;
  min-width: 78px;
  height: 34px;
  border: 0;
  border-radius: 12px;
  background: #2563eb;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.assistant-panel__tour-entry button:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.assistant-panel__suggestions {
  display: flex;
  gap: 8px;
  padding: 10px 14px 0;
  overflow-x: auto;
  background: #fff;
}

.assistant-panel__suggestions button {
  flex: 0 0 auto;
  padding: 7px 10px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.assistant-panel__suggestions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.assistant-panel__composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 12px 14px 14px;
  background: #fff;
}

.assistant-panel__composer textarea {
  width: 100%;
  min-height: 74px;
  resize: none;
  border: 1px solid #dbeafe;
  border-radius: 16px;
  padding: 10px 12px;
  color: #0f172a;
  outline: none;
  line-height: 1.5;
}

.assistant-panel__composer textarea:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.assistant-panel__composer button {
  align-self: end;
  min-width: 70px;
  height: 42px;
  border: 0;
  border-radius: 14px;
  background: #2563eb;
  color: #fff;
  font-weight: 900;
  cursor: pointer;
}

.assistant-panel__composer button:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

@keyframes assistant-dot {
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.45;
  }

  40% {
    transform: translateY(-3px);
    opacity: 1;
  }
}

@media (max-width: 720px) {
  .assistant-panel {
    left: 14px !important;
    top: auto !important;
    right: 14px;
    bottom: 86px;
    width: auto;
    height: min(520px, calc(100vh - 118px));
  }
}
</style>



