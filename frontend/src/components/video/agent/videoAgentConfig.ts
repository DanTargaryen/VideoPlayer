import type { VideoAiChatTaskType } from '@/types/api';

export type VideoAgentTaskType = VideoAiChatTaskType;

export interface VideoAgentQuickActionConfig {
  key: string;
  taskType: Exclude<VideoAgentTaskType, 'free_chat'>;
  title: string;
  subtitle: string;
  prompt: string;
  icon: 'summary' | 'highlight' | 'segment';
}

export const VIDEO_AGENT_TITLE = '视频智能体';
export const VIDEO_AGENT_BADGE_TEXT = 'AI BETA';
export const VIDEO_AGENT_FOOTER_NOTICE = 'AI 生成内容仅供参考，请注意核实';
export const VIDEO_AGENT_HISTORY_LABEL = '历史记录';
export const VIDEO_AGENT_INPUT_PLACEHOLDER = '输入你的问题...';
export const VIDEO_AGENT_LOADING_TEXT = '智能体正在分析视频...';

export const VIDEO_AGENT_WELCOME_LINES = [
  '你好！我是你的视频观看助手。',
  '我可以帮你快速理解视频内容，',
  '发现精彩看点，提取关键信息。',
  '你想了解什么呢？🙂',
];

export const VIDEO_AGENT_GREETING_TEXT = VIDEO_AGENT_WELCOME_LINES.join('\n');

export const VIDEO_AGENT_QUICK_ACTIONS: VideoAgentQuickActionConfig[] = [
  {
    key: 'summarize',
    taskType: 'summarize',
    title: '总结视频内容',
    subtitle: '快速了解视频讲了什么',
    prompt: '请作为视频观看助手，总结这个视频的主要内容，按“核心主题、主要情节或信息、结论”三个部分简洁说明。',
    icon: 'summary',
  },
  {
    key: 'analyze-highlights',
    taskType: 'analyze_highlights',
    title: '分析亮点看点',
    subtitle: '发现视频最值得关注的地方',
    prompt: '请作为视频观看助手，分析这个视频最值得关注的亮点、看点和关键信息，并说明为什么这些部分值得观看。',
    icon: 'highlight',
  },
  {
    key: 'locate-key-segments',
    taskType: 'locate_key_segments',
    title: '关键片段定位',
    subtitle: '快速找到视频中的重要时刻',
    prompt: '请作为视频观看助手，帮我定位这个视频中的关键片段或重要时刻，尽量按时间顺序说明每个片段发生了什么。',
    icon: 'segment',
  },
];
