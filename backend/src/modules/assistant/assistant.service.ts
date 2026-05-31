import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiSummaryService } from '../ai/ai-summary.service';
import { ASSISTANT_SYSTEM_PROMPT } from './constants/assistant-system-prompt';
import { searchSiteHelpKnowledge, type SiteHelpKnowledgeMatch } from './constants/site-help-knowledge';
import { CreateAssistantChatDto } from './dto/create-assistant-chat.dto';
import { SiteKnowledgeService, type KnowledgeSnippet } from './site-knowledge.service';

export interface AssistantReplyPayload {
  conversationId: string;
  reply: string;
  mode: 'chat' | 'site-help';
  suggestions: string[];
  model: string;
  source: 'model' | 'local' | 'knowledge';
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly aiSummaryService: AiSummaryService,
    private readonly siteKnowledgeService: SiteKnowledgeService,
  ) {}

  async chat(dto: CreateAssistantChatDto): Promise<AssistantReplyPayload> {
    const message = dto.message.trim();
    if (!message) {
      throw new BadRequestException('Message is required');
    }

    const conversationId = dto.conversationId?.trim() || this.createConversationId();
    const shouldUseSiteHelp = this.isSiteHelpQuestion(message);

    if (shouldUseSiteHelp) {
      const structuredMatches = searchSiteHelpKnowledge(message);
      const snippets = await this.siteKnowledgeService.search(message);
      const siteHelpSuggestions = this.buildSiteHelpSuggestions(message, structuredMatches);

      if (structuredMatches.length > 0) {
        return {
          conversationId,
          reply: this.buildStructuredSiteHelpReply(structuredMatches),
          mode: 'site-help',
          suggestions: siteHelpSuggestions,
          model: 'local-structured-knowledge',
          source: 'knowledge',
        };
      }

      if (snippets.length > 0) {
        const prompt = this.buildSiteHelpPrompt(dto, message, structuredMatches, snippets);
        const remoteApiKey = this.configService.get<string>('DASHSCOPE_API_KEY')?.trim();

        if (remoteApiKey) {
          try {
            const result = await this.aiSummaryService.generateTextReply(prompt, 0.2);

            return {
              conversationId,
              reply: result.text,
              mode: 'site-help',
              suggestions: siteHelpSuggestions,
              model: result.model,
              source: 'knowledge',
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Remote site-help failed, falling back to local answer: ${errorMessage}`);
          }
        }

        return {
          conversationId,
          reply: this.buildLocalSiteHelpReply(snippets),
          mode: 'site-help',
          suggestions: siteHelpSuggestions,
          model: 'local-knowledge',
          source: 'knowledge',
        };
      }
    }

    const prompt = this.buildChatPrompt(dto, message);
    const remoteApiKey = this.configService.get<string>('DASHSCOPE_API_KEY')?.trim();
    if (remoteApiKey) {
      try {
        const result = await this.aiSummaryService.generateTextReply(prompt, 0.45);

        return {
          conversationId,
          reply: result.text,
          mode: 'chat',
          suggestions: this.buildChatSuggestions(),
          model: result.model,
          source: 'model',
        };
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Remote assistant failed, falling back to local reply: ${messageText}`);
      }
    }

    return {
      conversationId,
      reply: this.buildLocalReply(message),
      mode: 'chat',
      suggestions: this.buildChatSuggestions(),
      model: 'local-fallback',
      source: 'local',
    };
  }

  private isSiteHelpQuestion(message: string) {
    return /(怎么|如何|哪里|在哪|入口|功能|功能介绍|网站有哪些功能|有哪些功能|网站能做什么|能做什么|使用|教程|板块|页面|投稿|上传|发布|审核|搜索|评论|弹幕|收藏|点赞|投币|直播|开播|消息|通知|登录|注册|个人中心|管理员|封面|草稿|稿件|视频|回放|私信)/.test(
      message,
    );
  }

  private buildSiteHelpPrompt(
    dto: CreateAssistantChatDto,
    message: string,
    structuredMatches: SiteHelpKnowledgeMatch[],
    snippets: KnowledgeSnippet[],
  ) {
    const history = (dto.history ?? [])
      .slice(-8)
      .map((item) => `${item.role === 'user' ? '用户' : '澜澜'}：${item.content.trim()}`)
      .filter((item) => item.length > 3)
      .join('\n');

    const structuredKnowledgeText = structuredMatches.length
      ? structuredMatches
          .map((match, index) => `[功能说明 ${index + 1}] ${match.item.title}\n${match.item.content}`)
          .join('\n\n')
      : '无';

    const knowledgeText = snippets
      .map((snippet, index) => `[项目片段 ${index + 1}] 来源：${snippet.source}\n${snippet.excerpt}`)
      .join('\n\n');

    return [
      '你是观澜视频平台的 AI 小助手澜澜，需要回答用户关于网站功能的问题。',
      '请优先使用“结构化功能说明”，它是根据当前项目代码整理出的用户操作说明。',
      '如果结构化功能说明里已经给出步骤，必须直接按步骤回答，不要说“我目前没有找到完整说明”。',
      '项目片段只作为补充证据；不要把后端技术实现、MinIO、接口细节当作主要操作步骤，除非用户明确询问技术实现。',
      '回答使用 Markdown，尽量包含清晰步骤和页面入口。',
      '',
      history ? `最近对话：\n${history}\n` : '最近对话：无\n',
      '结构化功能说明：',
      structuredKnowledgeText,
      '',
      '项目知识片段：',
      knowledgeText || '无',
      '',
      `用户问题：${message}`,
      '',
      '请用中文直接回答。',
    ].join('\n');
  }

  private buildStructuredSiteHelpReply(matches: SiteHelpKnowledgeMatch[]) {
    const primary = matches[0].item;
    const related = matches
      .slice(1, 3)
      .map((match) => match.item.title)
      .filter((title) => title !== primary.title);

    return [
      primary.content,
      related.length > 0 ? `你还可以继续问我：${related.join('、')}。` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private buildLocalSiteHelpReply(snippets: KnowledgeSnippet[]) {
    const topSnippet = snippets[0];

    if (topSnippet) {
      return [
        '我找到了相关项目说明，先根据现有内容简单回答：',
        '',
        topSnippet.excerpt,
        '',
        '如果你想让我回答得更像“用户操作指南”，可以再问得具体一点，例如“如何投稿视频”或“怎么发弹幕”。',
      ].join('\n');
    }

    return '我暂时没有找到足够完整的项目说明，不过你可以告诉我更具体的问题，我再帮你找。';
  }

  private buildChatPrompt(dto: CreateAssistantChatDto, message: string) {
    const history = (dto.history ?? [])
      .slice(-8)
      .map((item) => `${item.role === 'user' ? '用户' : '澜澜'}：${item.content.trim()}`)
      .filter((item) => item.length > 3)
      .join('\n');

    return [
      ASSISTANT_SYSTEM_PROMPT,
      '',
      history ? `最近对话：\n${history}\n` : '最近对话：无\n',
      `用户：${message}`,
      '',
      '请以「澜澜」的身份自然回复；如果用户问的是网站功能或页面操作，就直接回答，不要回避。',
    ].join('\n');
  }

  private buildLocalReply(message: string) {
    const normalized = message.trim();

    if (/^(你好|嗨|哈喽|hello|hi|在吗|在不在)/i.test(normalized)) {
      return '我在呀，今天想跟我聊点什么？';
    }

    if (/(累|烦|难受|焦虑|压力|崩溃|emo|想哭)/i.test(normalized)) {
      return '抱抱你。要不要先慢一点，我们可以一起把现在最难受的那件事拆开聊？';
    }

    if (/(学习|作业|考试|论文|代码|编程|项目)/i.test(normalized)) {
      return '可以，我陪你一起捋。你把最卡住的点告诉我，我尽量帮你理清楚。';
    }

    if (/(饿|困|睡觉|午睡|休息|喝水|吃饭)/i.test(normalized)) {
      return '先照顾一下自己也很好。喝口水、伸个懒腰，休息一下再回来聊也可以。';
    }

    if (/(谢谢|多谢|thanks)/i.test(normalized)) {
      return '不客气呀，我一直都在。';
    }

    return '我在听呢，你可以慢慢说，我会认真陪你聊。';
  }

  private buildChatSuggestions() {
    return ['陪我聊聊天', '给我一点学习动力', '今天有点累怎么办？'];
  }

  private buildSiteHelpSuggestions(message: string, structuredMatches: SiteHelpKnowledgeMatch[] = []) {
    const primarySuggestions = structuredMatches[0]?.item.suggestions;
    if (primarySuggestions?.length) {
      return primarySuggestions;
    }

    if (/投稿|上传|封面|审核|稿件/.test(message)) {
      return ['如何投稿视频？', '怎么上传封面？', '投稿后为什么要审核？'];
    }

    if (/直播|开播/.test(message)) {
      return ['怎么开直播？', '直播录播怎么保存？', '直播封面怎么上传？'];
    }

    if (/评论|弹幕/.test(message)) {
      return ['怎么发评论？', '怎么发弹幕？', '怎么召唤 @grok？'];
    }

    return ['如何投稿视频？', '怎么搜索视频？', '怎么查看消息通知？'];
  }

  private createConversationId() {
    return `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
