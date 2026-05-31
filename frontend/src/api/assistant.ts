import http from './http';
import type { ApiResponse } from '@/types/api';

export interface AssistantContext {
  path?: string;
  routeName?: string;
  videoId?: number;
  videoTitle?: string;
  category?: string;
  keyword?: string;
  metadata?: Record<string, unknown>;
}

export interface AssistantHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatPayload {
  message: string;
  conversationId?: string;
  context?: AssistantContext;
  history?: AssistantHistoryMessage[];
}

export interface AssistantChatResult {
  conversationId: string;
  reply: string;
  mode: 'chat' | 'site-help';
  suggestions?: string[];
  model?: string;
  source?: 'model' | 'local' | 'knowledge';
}

export async function chatWithAssistant(payload: AssistantChatPayload) {
  const timeoutMs = Number(import.meta.env.VITE_ASSISTANT_TIMEOUT_MS ?? 60000);
  const { data } = await http.post<ApiResponse<AssistantChatResult>>('/assistant/chat', payload, {
    timeout: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60000,
  });
  return data.data;
}
