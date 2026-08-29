import { issueServiceToken } from '@videoplayer/shared-contracts';

import { ContentApplyError, type ContentModerationClient } from './content-client.js';
import type { ReviewRecord } from './types.js';

export class ModerationSideEffectClient implements ContentModerationClient {
  private readonly identityBaseUrl: string;

  constructor(
    private readonly content: ContentModerationClient,
    identityBaseUrl: string,
    private readonly jwtSecret: string,
    private readonly timeoutMs = 2_000,
  ) {
    this.identityBaseUrl = identityBaseUrl.replace(/\/$/, '');
  }

  getTarget(targetType: ReviewRecord['targetType'], targetId: string, requestId: string) {
    if (!this.content.getTarget) throw new ContentApplyError('content target lookup is not configured', true);
    return this.content.getTarget(targetType, targetId, requestId);
  }

  async apply(decision: ReviewRecord): Promise<void> {
    await this.content.apply(decision);
    if (!decision.notificationRecipientId || !decision.reportId) return;
    const requestId = `${decision.decisionId}:notification`.slice(0, 128);
    const token = issueServiceToken({
      caller: 'governance-ai',
      audience: 'identity-community',
      scopes: ['internal:notification-write'],
      secret: this.jwtSecret,
      requestId,
    });
    let response: Response;
    try {
      response = await fetch(`${this.identityBaseUrl}/internal/v1/notifications`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-request-id': requestId },
        body: JSON.stringify({
          recipientId: decision.notificationRecipientId,
          actorId: decision.operatorId ?? null,
          type: 'REPORT',
          title: '举报处理结果',
          content: decision.decision === 'KEEP' ? '你提交的举报已审核，目标内容予以保留。' : '你提交的举报已审核，目标内容已处理。',
          relatedType: 'REPORT',
          relatedId: decision.reportId,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new ContentApplyError(`identity notification request failed: ${error instanceof Error ? error.message : String(error)}`, true);
    }
    if (!response.ok) throw new ContentApplyError(`identity notification returned ${response.status}`, response.status >= 500 || response.status === 429, response.status);
  }
}
