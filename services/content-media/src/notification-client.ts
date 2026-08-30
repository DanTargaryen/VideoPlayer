import { issueServiceToken } from '@videoplayer/shared-contracts';

export type ContentNotification = {
  requestId: string;
  recipientId: string;
  actorId: string | null;
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'FAVORITE';
  title: string;
  content: string;
  relatedType: 'VIDEO';
  relatedId: string;
};

export interface IdentityNotificationClient {
  deliver(notification: ContentNotification): Promise<void>;
}

export class IdentityNotificationError extends Error {
  constructor(message: string, readonly retryable: boolean, readonly status?: number) {
    super(message);
    this.name = 'IdentityNotificationError';
  }
}

export class HttpIdentityNotificationClient implements IdentityNotificationClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string, private readonly jwtSecret: string, private readonly timeoutMs = 1_000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async deliver(notification: ContentNotification): Promise<void> {
    const token = issueServiceToken({
      caller: 'content-media',
      audience: 'identity-community',
      scopes: ['internal:notification-write'],
      secret: this.jwtSecret,
      requestId: notification.requestId,
    });
    const numericRelatedId = Number(notification.relatedId);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/internal/v1/notifications`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'x-request-id': notification.requestId,
        },
        body: JSON.stringify({
          recipientId: Number(notification.recipientId),
          actorId: notification.actorId === null ? null : Number(notification.actorId),
          type: notification.type,
          title: notification.title,
          content: notification.content.slice(0, 255),
          relatedType: notification.relatedType,
          relatedId: Number.isSafeInteger(numericRelatedId) ? numericRelatedId : null,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new IdentityNotificationError(`identity notification request failed: ${error instanceof Error ? error.message : String(error)}`, true);
    }
    if (!response.ok) {
      throw new IdentityNotificationError(
        `identity notification returned ${response.status}`,
        response.status >= 500 || response.status === 429,
        response.status,
      );
    }
  }
}
