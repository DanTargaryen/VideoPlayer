import { issueServiceToken } from '@videoplayer/shared-contracts';

import type { GovernanceTargetType, ReviewRecord } from './types.js';

export interface ModerationTargetSnapshot {
  targetType: GovernanceTargetType;
  targetId: string;
  videoId: string;
  content?: string;
  status: string;
  title?: string;
  description?: string;
  coverUrl?: string | null;
  playUrl?: string | null;
  durationSeconds?: number;
  creatorId?: string;
  createdAt?: string;
  publishedAt?: string | null;
  video?: { id: string; title: string };
  [key: string]: unknown;
}

export class ContentApplyError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
  }
}

export interface ContentModerationClient {
  apply(decision: ReviewRecord): Promise<void>;
  getTarget?(targetType: GovernanceTargetType, targetId: string, requestId: string): Promise<ModerationTargetSnapshot>;
}

export interface HttpContentModerationClientOptions {
  baseUrl: string;
  jwtSecret: string;
  timeoutMs?: number;
}

function videoDecision(decision: ReviewRecord): 'APPROVED' | 'REJECTED' | 'HIDDEN' {
  if (decision.decision === 'APPROVE') return 'APPROVED';
  if (decision.decision === 'REJECT') return 'REJECTED';
  return 'HIDDEN';
}

export class HttpContentModerationClient implements ContentModerationClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: HttpContentModerationClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 2_000;
  }

  async getTarget(targetType: GovernanceTargetType, targetId: string, requestId: string): Promise<ModerationTargetSnapshot> {
    const token = issueServiceToken({
      caller: 'governance-ai',
      audience: 'content-media',
      scopes: ['internal:moderation-target-read'],
      secret: this.options.jwtSecret,
      requestId,
    });
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/internal/v1/moderation-targets/${targetType}/${encodeURIComponent(targetId)}`, {
        headers: { authorization: `Bearer ${token}`, 'x-request-id': requestId },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new ContentApplyError(`content-media target lookup failed: ${error instanceof Error ? error.message : String(error)}`, true);
    }
    if (!response.ok) throw new ContentApplyError(`content-media target lookup returned ${response.status}`, response.status >= 500, response.status);
    const payload = await response.json() as { data?: ModerationTargetSnapshot };
    if (!payload.data?.videoId) throw new ContentApplyError('content-media returned an invalid target snapshot', false);
    return payload.data;
  }

  async apply(decision: ReviewRecord): Promise<void> {
    if (!decision.decision) throw new ContentApplyError('moderation decision has no action', false);
    // KEEP resolves a report without mutating the target's current visibility.
    if (decision.decision === 'KEEP') return;
    const isVideo = decision.targetType === 'VIDEO';
    const videoId = isVideo ? decision.targetId : decision.videoId;
    if (!videoId) throw new ContentApplyError('text moderation decision is missing videoId', false);
    const scope = isVideo ? 'internal:review-decision' : 'internal:text-status';
    const token = issueServiceToken({
      caller: 'governance-ai',
      audience: 'content-media',
      scopes: [scope],
      secret: this.options.jwtSecret,
      requestId: decision.decisionId,
    });
    const path = isVideo
      ? `/internal/v1/videos/${videoId}/review-decision`
      : `/internal/v1/videos/${videoId}/text-status`;
    const body = isVideo
      ? { decisionId: decision.decisionId, decision: videoDecision(decision), reason: decision.reason ?? null }
      : {
          targetType: decision.targetType === 'VIDEO_DANMAKU' ? 'DANMAKU' : 'COMMENT',
          targetId: String(decision.targetId),
          status: decision.decision === 'APPROVE' ? 'VISIBLE' : 'HIDDEN',
        };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'x-request-id': decision.decisionId,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ContentApplyError(`content-media request failed: ${message}`, true);
    }

    if (!response.ok) {
      const message = `content-media returned ${response.status}`;
      throw new ContentApplyError(message, response.status >= 500 || response.status === 429, response.status);
    }
  }
}
