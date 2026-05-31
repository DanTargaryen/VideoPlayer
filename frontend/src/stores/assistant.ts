import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import { chatWithAssistant, type AssistantChatResult, type AssistantContext } from '@/api/assistant';
import { createAssistantTourSteps, type AssistantTourStep } from '@/constants/assistant-tour';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  status: 'sending' | 'success' | 'failed';
}

interface AssistantPosition {
  x: number;
  y: number;
}

const STORAGE_POSITION_KEY = 'vp_assistant_position';
const STORAGE_MESSAGES_KEY = 'vp_assistant_messages';
const STORAGE_CONVERSATION_KEY = 'vp_assistant_conversation_id';
const FIXED_REPLY_MIN_THINKING_MS = 3000;

function createMessage(role: 'user' | 'assistant', content: string, status: AssistantMessage['status'] = 'success'): AssistantMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    status,
  };
}

function loadPosition(): AssistantPosition | null {
  try {
    const raw = localStorage.getItem(STORAGE_POSITION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as AssistantPosition;
    if (Number.isFinite(value.x) && Number.isFinite(value.y)) {
      return value;
    }
  } catch {
    return null;
  }
  return null;
}

function loadMessages(): AssistantMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_MESSAGES_KEY);
    if (!raw) return [];
    const value = JSON.parse(raw) as AssistantMessage[];
    if (Array.isArray(value)) {
      return value.slice(-20);
    }
  } catch {
    return [];
  }
  return [];
}

export const useAssistantStore = defineStore('assistant', () => {
  const panelOpen = ref(false);
  const thinking = ref(false);
  const unreadCount = ref(0);
  const position = ref<AssistantPosition | null>(loadPosition());
  const conversationId = ref(localStorage.getItem(STORAGE_CONVERSATION_KEY) ?? '');
  const messages = ref<AssistantMessage[]>(loadMessages());
  const suggestions = ref<string[]>(['如何投稿视频？', '怎么开直播？', '怎么发弹幕？']);
  const lastError = ref('');
  const tourActive = ref(false);
  const tourLoading = ref(false);
  const tourStepIndex = ref(0);
  const tourSteps = ref<AssistantTourStep[]>([]);
  const tourError = ref('');

  const hasMessages = computed(() => messages.value.length > 0);
  const currentTourStep = computed(() => tourSteps.value[tourStepIndex.value] ?? null);

  function openPanel() {
    panelOpen.value = true;
    unreadCount.value = 0;
    ensureWelcomeMessage();
  }

  function closePanel() {
    panelOpen.value = false;
  }

  function togglePanel() {
    if (panelOpen.value) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function ensureWelcomeMessage() {
    if (messages.value.length > 0) return;
    messages.value = [
      createMessage('assistant', '你好呀，我是澜澜。你可以问我网站功能，也可以和我随便聊聊。'),
    ];
    persistMessages();
  }

  function setPosition(nextPosition: AssistantPosition) {
    position.value = nextPosition;
    localStorage.setItem(STORAGE_POSITION_KEY, JSON.stringify(nextPosition));
  }

  function clearMessages() {
    messages.value = [];
    conversationId.value = '';
    suggestions.value = ['如何投稿视频？', '怎么开直播？', '怎么发弹幕？'];
    localStorage.removeItem(STORAGE_MESSAGES_KEY);
    localStorage.removeItem(STORAGE_CONVERSATION_KEY);
    ensureWelcomeMessage();
  }

  async function startTour(isLoggedIn: boolean) {
    if (tourLoading.value) return;

    ensureWelcomeMessage();
    panelOpen.value = false;
    tourActive.value = true;
    tourLoading.value = true;
    tourError.value = '';
    tourStepIndex.value = 0;
    tourSteps.value = [];

    try {
      tourSteps.value = await createAssistantTourSteps({ isLoggedIn });
      if (tourSteps.value.length === 0) {
        throw new Error('没有可用的教程步骤');
      }
    } catch (error) {
      tourError.value = error instanceof Error ? error.message : '教程准备失败';
      tourActive.value = false;
    } finally {
      tourLoading.value = false;
    }
  }

  function stopTour() {
    tourActive.value = false;
    tourLoading.value = false;
    tourError.value = '';
    tourStepIndex.value = 0;
    tourSteps.value = [];
  }

  function nextTourStep() {
    if (!tourActive.value || tourLoading.value) return;

    if (tourStepIndex.value >= tourSteps.value.length - 1) {
      stopTour();
      return;
    }

    tourStepIndex.value += 1;
  }

  function previousTourStep() {
    if (!tourActive.value || tourLoading.value) return;
    tourStepIndex.value = Math.max(0, tourStepIndex.value - 1);
  }

  async function sendMessage(content: string, context: AssistantContext) {
    const prompt = content.trim();
    if (!prompt || thinking.value) return;

    ensureWelcomeMessage();
    lastError.value = '';
    messages.value.push(createMessage('user', prompt));
    persistMessages();
    thinking.value = true;
    const thinkingStartedAt = Date.now();

    try {
      const result = await chatWithAssistant({
        message: prompt,
        conversationId: conversationId.value || undefined,
        context,
        history: messages.value
          .filter((item) => item.status === 'success')
          .slice(-10)
          .map((item) => ({ role: item.role, content: item.content })),
      });

      if (shouldDelayFixedReply(result)) {
        await waitUntilMinimumThinkingTime(thinkingStartedAt);
      }

      conversationId.value = result.conversationId;
      localStorage.setItem(STORAGE_CONVERSATION_KEY, result.conversationId);
      messages.value.push(createMessage('assistant', result.reply));
      suggestions.value = result.suggestions?.length ? result.suggestions : suggestions.value;
      if (!panelOpen.value) {
        unreadCount.value += 1;
      }
    } catch (error) {
      const message = resolveAssistantError(error);
      lastError.value = message;
      messages.value.push(createMessage('assistant', `抱歉，澜澜暂时回答不了：${message}`, 'failed'));
    } finally {
      thinking.value = false;
      persistMessages();
    }
  }

  function persistMessages() {
    localStorage.setItem(STORAGE_MESSAGES_KEY, JSON.stringify(messages.value.slice(-20)));
  }

  return {
    panelOpen,
    thinking,
    unreadCount,
    position,
    conversationId,
    messages,
    suggestions,
    lastError,
    tourActive,
    tourLoading,
    tourStepIndex,
    tourSteps,
    tourError,
    hasMessages,
    currentTourStep,
    openPanel,
    closePanel,
    togglePanel,
    setPosition,
    clearMessages,
    startTour,
    stopTour,
    nextTourStep,
    previousTourStep,
    sendMessage,
    ensureWelcomeMessage,
  };
});

function resolveAssistantError(error: unknown) {
  const candidate = error as { code?: string; response?: { data?: { message?: string | string[] } } };

  if (candidate.code === 'ECONNABORTED') {
    return '请求超时，请稍后重试';
  }

  const message = candidate.response?.data?.message;
  if (Array.isArray(message)) {
    return message.join('; ');
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return '网络或服务异常';
}

function shouldDelayFixedReply(result: AssistantChatResult) {
  return result.mode === 'site-help' || result.model?.startsWith('local-') || result.source === 'knowledge';
}

async function waitUntilMinimumThinkingTime(startedAt: number) {
  const elapsed = Date.now() - startedAt;
  const remaining = FIXED_REPLY_MIN_THINKING_MS - elapsed;

  if (remaining > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, remaining));
  }
}
