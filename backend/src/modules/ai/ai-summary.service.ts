import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

import { VIDEO_AGENT_SYSTEM_PROMPT } from './constants/video-agent-prompt';
import { VIDEO_SUMMARY_PROMPT } from './constants/video-summary-prompt';

const DEFAULT_DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

interface DashScopeChoiceMessagePart {
  type?: string;
  text?: string;
}

interface DashScopeChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | DashScopeChoiceMessagePart[];
    };
  }>;
}

@Injectable()
export class AiSummaryService {
  private readonly logger = new Logger(AiSummaryService.name);

  constructor(private readonly configService: ConfigService) {}

  async generateSummary(framePaths: string[]): Promise<{ summary: string; model: string }> {
    const result = await this.requestTextWithFrames(framePaths, VIDEO_SUMMARY_PROMPT, 0.2);

    return {
      summary: result.text,
      model: result.model,
    };
  }

  async chatWithFrames(framePaths: string[], prompt: string): Promise<{ reply: string; model: string }> {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      throw new BadRequestException('Prompt is required');
    }

    const result = await this.requestTextWithFrames(
      framePaths,
      `${VIDEO_AGENT_SYSTEM_PROMPT}\n\n用户问题：${normalizedPrompt}`,
      0.3,
    );

    return {
      reply: result.text,
      model: result.model,
    };
  }

  async generateTextReply(prompt: string, temperature = 0.2): Promise<{ text: string; model: string }> {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      throw new BadRequestException('Prompt is required');
    }

    return this.requestTextOnly(normalizedPrompt, temperature);
  }

  private async requestTextWithFrames(framePaths: string[], prompt: string, temperature: number) {
    if (framePaths.length === 0) {
      throw new BadGatewayException('No frames available for AI summary');
    }

    const apiKey = this.configService.get<string>('DASHSCOPE_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('DASHSCOPE_API_KEY is not configured');
    }

    const model = this.configService.get<string>('QWEN_VL_MODEL') || 'qwen3.6-plus';
    const baseUrl =
      this.configService.get<string>('DASHSCOPE_BASE_URL') || DEFAULT_DASHSCOPE_BASE_URL;
    const timeoutMs = Number(this.configService.get<string>('AI_SUMMARY_MODEL_TIMEOUT_MS') || 120000);
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 120000,
    );

    try {
      const content: Array<Record<string, unknown>> = [{ type: 'text', text: prompt }];

      for (const framePath of framePaths) {
        content.push({
          type: 'image_url',
          image_url: {
            url: await this.toDataUrl(framePath),
          },
        });
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          messages: [
            {
              role: 'user',
              content,
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new BadGatewayException(
          `Qwen API request failed with status ${response.status}: ${message || 'empty response'}`,
        );
      }

      const payload = (await response.json()) as DashScopeChatCompletionResponse;
      const text = this.extractSummary(payload);

      if (!text) {
        throw new BadGatewayException('Qwen API returned empty summary');
      }

      return {
        text,
        model,
      };
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof InternalServerErrorException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadGatewayException('Qwen API request timed out');
      }

      this.logger.error(`Failed to call Qwen API: ${this.getErrorMessage(error)}`);
      throw new BadGatewayException('Failed to generate summary from Qwen API');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async requestTextOnly(prompt: string, temperature: number) {
    const apiKey = this.configService.get<string>('DASHSCOPE_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('DASHSCOPE_API_KEY is not configured');
    }

    const model = this.configService.get<string>('QWEN_VL_MODEL') || 'qwen3.6-plus';
    const baseUrl =
      this.configService.get<string>('DASHSCOPE_BASE_URL') || DEFAULT_DASHSCOPE_BASE_URL;
    const timeoutMs = Number(this.configService.get<string>('AI_SUMMARY_MODEL_TIMEOUT_MS') || 120000);
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 120000,
    );

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: prompt }],
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new BadGatewayException(
          `Qwen API request failed with status ${response.status}: ${message || 'empty response'}`,
        );
      }

      const payload = (await response.json()) as DashScopeChatCompletionResponse;
      const text = this.extractSummary(payload);
      if (!text) {
        throw new BadGatewayException('Qwen API returned empty summary');
      }

      return {
        text,
        model,
      };
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof InternalServerErrorException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadGatewayException('Qwen API request timed out');
      }

      this.logger.error(`Failed to call Qwen API: ${this.getErrorMessage(error)}`);
      throw new BadGatewayException('Failed to generate summary from Qwen API');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async toDataUrl(framePath: string) {
    const buffer = await readFile(framePath);
    const extension = path.extname(framePath).toLowerCase();
    const mimeType = extension === '.png' ? 'image/png' : 'image/jpeg';

    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  private extractSummary(payload: DashScopeChatCompletionResponse) {
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return '';
    }

    if (typeof content === 'string') {
      return content.trim();
    }

    return content
      .map((part) => part.text?.trim() ?? '')
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
