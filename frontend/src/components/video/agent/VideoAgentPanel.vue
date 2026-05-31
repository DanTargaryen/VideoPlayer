<template>
  <div class="video-agent-panel">
    <header class="video-agent-header">
      <div class="video-agent-brand">
        <span class="video-agent-logo" aria-hidden="true">
          <el-icon :size="27"><VideoPlay /></el-icon>
          <span class="video-agent-logo-spark">✦</span>
        </span>
        <div class="video-agent-title-row">
          <strong>{{ VIDEO_AGENT_TITLE }}</strong>
          <span>{{ VIDEO_AGENT_BADGE_TEXT }}</span>
        </div>
      </div>
      <button type="button" class="video-agent-close" aria-label="关闭视频智能体" @click="$emit('close')">
        <el-icon :size="25"><ArrowUpBold /></el-icon>
      </button>
    </header>

    <section class="video-agent-content" v-loading="historyLoading">
      <div v-if="showWelcome" class="video-agent-welcome">
        <p v-for="line in VIDEO_AGENT_WELCOME_LINES" :key="line">{{ line }}</p>
        <span class="welcome-quote" aria-hidden="true">”</span>
        <span class="welcome-spark" aria-hidden="true">✦</span>
      </div>

      <div v-if="showWelcome" class="video-agent-actions">
        <button
          v-for="action in VIDEO_AGENT_QUICK_ACTIONS"
          :key="action.key"
          type="button"
          class="video-agent-action"
          :disabled="loading || historyLoading"
          @click="sendQuickAction(action)"
        >
          <span class="action-icon" :class="`action-icon-${action.icon}`">
            <el-icon v-if="action.icon === 'summary'" :size="35"><Document /></el-icon>
            <el-icon v-else-if="action.icon === 'highlight'" :size="38"><Star /></el-icon>
            <el-icon v-else :size="40"><Location /></el-icon>
          </span>
          <span class="action-copy">
            <strong>{{ action.title }}</strong>
            <small>{{ action.subtitle }}</small>
          </span>
          <el-icon class="action-arrow" :size="24"><ArrowRight /></el-icon>
        </button>
      </div>

      <div v-else ref="messagesRef" class="video-agent-messages">
        <div
          v-for="item in visibleMessages"
          :key="item.id"
          class="video-agent-message"
          :class="item.role === 'user' ? 'video-agent-message-user' : 'video-agent-message-assistant'"
        >
          <p>{{ item.content }}</p>
        </div>
      </div>

      <div v-if="loading" class="video-agent-thinking">
        <span />
        <span>{{ VIDEO_AGENT_LOADING_TEXT }}</span>
      </div>

      <p v-if="error" class="video-agent-error">{{ error }}</p>
    </section>

    <form class="video-agent-composer" @submit.prevent="sendFreeChat">
      <el-input
        v-model="draft"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 4 }"
        resize="none"
        :placeholder="VIDEO_AGENT_INPUT_PLACEHOLDER"
        :disabled="loading || historyLoading"
        @keydown.enter.exact.prevent="sendFreeChat"
      />
      <button
        type="submit"
        class="video-agent-send"
        aria-label="发送问题"
        :disabled="loading || historyLoading || !draft.trim()"
      >
        <el-icon :size="25"><Promotion /></el-icon>
      </button>
    </form>

    <footer class="video-agent-footer">
      <span>
        <el-icon :size="18"><InfoFilled /></el-icon>
        {{ VIDEO_AGENT_FOOTER_NOTICE }}
      </span>
      <button type="button" :disabled="historyLoading" @click="$emit('reload-history')">
        <el-icon :size="20"><RefreshLeft /></el-icon>
        {{ VIDEO_AGENT_HISTORY_LABEL }}
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  ArrowRight,
  ArrowUpBold,
  Document,
  InfoFilled,
  Location,
  Promotion,
  RefreshLeft,
  Star,
  VideoPlay,
} from '@element-plus/icons-vue';

import {
  VIDEO_AGENT_BADGE_TEXT,
  VIDEO_AGENT_FOOTER_NOTICE,
  VIDEO_AGENT_GREETING_TEXT,
  VIDEO_AGENT_HISTORY_LABEL,
  VIDEO_AGENT_INPUT_PLACEHOLDER,
  VIDEO_AGENT_LOADING_TEXT,
  VIDEO_AGENT_QUICK_ACTIONS,
  VIDEO_AGENT_TITLE,
  VIDEO_AGENT_WELCOME_LINES,
  type VideoAgentQuickActionConfig,
  type VideoAgentTaskType,
} from './videoAgentConfig';

interface AgentPanelMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

const props = defineProps<{
  messages: AgentPanelMessage[];
  loading: boolean;
  historyLoading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  close: [];
  'reload-history': [];
  send: [payload: { prompt: string; taskType: VideoAgentTaskType }];
}>();

const draft = ref('');
const messagesRef = ref<HTMLElement | null>(null);

const visibleMessages = computed(() => props.messages.filter((item) => item.content !== VIDEO_AGENT_GREETING_TEXT));
const showWelcome = computed(() => visibleMessages.value.length === 0 && !props.loading);

function sendQuickAction(action: VideoAgentQuickActionConfig) {
  if (props.loading || props.historyLoading) {
    return;
  }

  emit('send', {
    prompt: action.prompt,
    taskType: action.taskType,
  });
}

function sendFreeChat() {
  const prompt = draft.value.trim();
  if (!prompt || props.loading || props.historyLoading) {
    return;
  }

  draft.value = '';
  emit('send', {
    prompt,
    taskType: 'free_chat',
  });
}

async function scrollToBottom() {
  await nextTick();
  const container = messagesRef.value;
  if (!container) {
    return;
  }

  container.scrollTop = container.scrollHeight;
}

watch(
  () => [visibleMessages.value.length, props.loading],
  () => {
    void scrollToBottom();
  },
);
</script>

<style scoped>
.video-agent-panel {
  --agent-blue: #1768ff;
  --agent-blue-deep: #0755ef;
  --agent-ink: #07183a;
  --agent-muted: #7180a2;
  --agent-line: rgba(122, 164, 255, 0.28);

  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: 14px;
  min-height: calc(100dvh - 112px);
  padding: 18px 16px 16px;
  border: 1px solid rgba(118, 164, 255, 0.32);
  border-radius: 22px;
  background:
    radial-gradient(circle at 12% 0%, rgba(56, 125, 255, 0.12), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 251, 255, 0.98));
  box-shadow:
    0 24px 54px rgba(24, 80, 170, 0.14),
    0 1px 0 rgba(255, 255, 255, 0.95) inset;
  color: var(--agent-ink);
}

.video-agent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.video-agent-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.video-agent-logo {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  border: 1px solid rgba(118, 164, 255, 0.28);
  border-radius: 50%;
  background: linear-gradient(180deg, #ffffff, #f2f7ff);
  color: var(--agent-blue);
  box-shadow: 0 12px 24px rgba(24, 104, 255, 0.1);
}

.video-agent-logo-spark {
  position: absolute;
  top: 9px;
  right: 8px;
  color: var(--agent-blue);
  font-size: 14px;
  line-height: 1;
}

.video-agent-title-row {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  flex-wrap: wrap;
}

.video-agent-title-row strong {
  color: var(--agent-ink);
  font-size: 22px;
  line-height: 1.08;
  font-weight: 900;
  letter-spacing: 0;
  white-space: nowrap;
}

.video-agent-title-row span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  background: linear-gradient(180deg, #eef5ff, #e5efff);
  color: var(--agent-blue);
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}

.video-agent-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--agent-ink);
  cursor: pointer;
  transition: background 180ms ease, color 180ms ease;
}

.video-agent-close:hover {
  background: rgba(23, 104, 255, 0.09);
  color: var(--agent-blue);
}

.video-agent-content {
  display: grid;
  align-content: start;
  gap: 14px;
  min-height: 0;
}

.video-agent-welcome {
  position: relative;
  display: grid;
  gap: 10px;
  min-height: 168px;
  padding: 24px 28px;
  overflow: hidden;
  border: 1px solid rgba(110, 158, 255, 0.42);
  border-radius: 18px;
  background:
    radial-gradient(circle at 90% 10%, rgba(23, 104, 255, 0.12), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(241, 248, 255, 0.94));
  box-shadow: 0 12px 28px rgba(54, 108, 190, 0.08);
}

.video-agent-welcome p {
  position: relative;
  z-index: 1;
  margin: 0;
  color: var(--agent-ink);
  font-size: 17px;
  line-height: 1.32;
  font-weight: 800;
  letter-spacing: 0;
}

.welcome-quote {
  position: absolute;
  top: 10px;
  right: 28px;
  color: rgba(23, 104, 255, 0.15);
  font-size: 88px;
  line-height: 1;
  font-family: Georgia, serif;
  font-weight: 900;
}

.welcome-spark {
  position: absolute;
  right: 48px;
  bottom: 34px;
  color: rgba(23, 104, 255, 0.1);
  font-size: 34px;
}

.video-agent-actions {
  display: grid;
  gap: 10px;
}

.video-agent-action {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 15px;
  min-height: 82px;
  padding: 14px 18px;
  border: 1px solid rgba(146, 177, 235, 0.28);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--agent-ink);
  text-align: left;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(45, 84, 144, 0.06);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.video-agent-action:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(23, 104, 255, 0.42);
  box-shadow: 0 18px 36px rgba(45, 84, 144, 0.1);
}

.video-agent-action:disabled {
  cursor: default;
  opacity: 0.66;
}

.action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
}

.action-icon-summary {
  background: #e9f1ff;
  color: var(--agent-blue);
}

.action-icon-highlight {
  background: #ecfaee;
  color: #2bb545;
}

.action-icon-segment {
  background: #e8faff;
  color: #13a9d7;
}

.action-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.action-copy strong {
  overflow-wrap: anywhere;
  color: var(--agent-ink);
  font-size: 19px;
  line-height: 1.12;
  font-weight: 900;
}

.action-copy small {
  overflow-wrap: anywhere;
  color: var(--agent-muted);
  font-size: 13px;
  line-height: 1.2;
  font-weight: 650;
}

.action-arrow {
  color: #526895;
}

.video-agent-messages {
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 390px;
  max-height: calc(100dvh - 372px);
  overflow-y: auto;
  padding: 4px 3px 8px;
}

.video-agent-message {
  display: flex;
}

.video-agent-message p {
  max-width: 90%;
  margin: 0;
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.video-agent-message-user {
  justify-content: flex-end;
}

.video-agent-message-user p {
  border-bottom-right-radius: 6px;
  background: linear-gradient(180deg, #2f7dff, var(--agent-blue-deep));
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(23, 104, 255, 0.2);
}

.video-agent-message-assistant p {
  border: 1px solid rgba(146, 177, 235, 0.26);
  border-bottom-left-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  color: #24324f;
  box-shadow: 0 10px 22px rgba(45, 84, 144, 0.06);
}

.video-agent-thinking {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  width: fit-content;
  padding: 10px 13px;
  border-radius: 999px;
  background: rgba(232, 241, 255, 0.88);
  color: #526895;
  font-size: 13px;
  font-weight: 700;
}

.video-agent-thinking span:first-child {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--agent-blue);
  box-shadow: 0 0 0 6px rgba(23, 104, 255, 0.12);
}

.video-agent-error {
  margin: 0;
  color: #dc2626;
  font-size: 13px;
  line-height: 1.5;
  font-weight: 650;
}

.video-agent-composer {
  position: relative;
  display: grid;
  min-height: 88px;
  padding: 16px 68px 16px 18px;
  border: 1px solid rgba(23, 104, 255, 0.56);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow:
    0 12px 28px rgba(45, 84, 144, 0.07),
    0 0 0 4px rgba(23, 104, 255, 0.03);
}

.video-agent-composer :deep(.el-textarea__wrapper) {
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.video-agent-composer :deep(.el-textarea__inner) {
  min-height: 54px !important;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--agent-ink);
  font-size: 15px;
  line-height: 1.5;
  font-weight: 700;
  box-shadow: none;
}

.video-agent-composer :deep(.el-textarea__inner::placeholder) {
  color: #7483a7;
}

.video-agent-send {
  position: absolute;
  right: 18px;
  bottom: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 50%;
  background: linear-gradient(180deg, #2f7dff, var(--agent-blue-deep));
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 16px 28px rgba(23, 104, 255, 0.3);
  transition: transform 180ms ease, opacity 180ms ease;
}

.video-agent-send:hover:not(:disabled) {
  transform: translateY(-1px);
}

.video-agent-send:disabled {
  cursor: default;
  opacity: 0.48;
}

.video-agent-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  color: #607197;
  font-size: 12px;
  font-weight: 700;
}

.video-agent-footer span,
.video-agent-footer button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.video-agent-footer button {
  border: 0;
  background: transparent;
  color: var(--agent-blue);
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  white-space: nowrap;
}

.video-agent-footer button:disabled {
  cursor: default;
  opacity: 0.55;
}

@media (max-width: 760px) {
  .video-agent-panel {
    min-height: 100dvh;
    border-radius: 0;
    padding: 16px 14px;
  }

  .video-agent-title-row strong {
    font-size: 20px;
  }

  .video-agent-title-row span {
    min-height: 28px;
    font-size: 14px;
  }

  .video-agent-logo {
    width: 48px;
    height: 48px;
  }

  .video-agent-welcome {
    min-height: 154px;
    padding: 22px;
  }

  .video-agent-welcome p {
    font-size: 16px;
  }

  .video-agent-action {
    min-height: 78px;
    gap: 12px;
    padding: 14px 16px;
  }

  .action-icon {
    width: 50px;
    height: 50px;
  }

  .action-copy strong {
    font-size: 18px;
  }

  .action-copy small {
    font-size: 13px;
  }

  .video-agent-messages {
    min-height: 280px;
    max-height: calc(100dvh - 322px);
  }

  .video-agent-composer {
    min-height: 92px;
    padding: 16px 68px 16px 18px;
  }

  .video-agent-send {
    width: 48px;
    height: 48px;
  }

  .video-agent-footer {
    align-items: flex-start;
    font-size: 12px;
  }
}
</style>
