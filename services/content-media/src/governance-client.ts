import { issueServiceToken } from '@videoplayer/shared-contracts';

export interface SubmittedReview {
  id: number;
  targetType: 'VIDEO';
  targetId: string;
  requestId: string;
}

export interface GovernanceReviewClient {
  submitVideoReview(videoId: string, requestId: string): Promise<SubmittedReview>;
}

export class GovernanceReviewError extends Error {
  constructor(
    message: string,
    readonly unavailable: boolean,
  ) {
    super(message);
    this.name = 'GovernanceReviewError';
  }
}

export interface HttpGovernanceReviewClientOptions {
  baseUrl: string;
  jwtSecret: string;
  timeoutMs?: number;
}

export class HttpGovernanceReviewClient implements GovernanceReviewClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: HttpGovernanceReviewClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 2_000;
  }

  async submitVideoReview(videoId: string, requestId: string): Promise<SubmittedReview> {
    const token = issueServiceToken({
      caller: 'content-media',
      audience: 'governance-ai',
      scopes: ['governance.reviews.write'],
      secret: this.options.jwtSecret,
      requestId,
    });
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/internal/v1/reviews`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'x-request-id': requestId,
        },
        body: JSON.stringify({ targetType: 'VIDEO', targetId: videoId }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new GovernanceReviewError(
        `governance review submission failed: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
    if (!response.ok) {
      throw new GovernanceReviewError(`governance review submission returned ${response.status}`, response.status >= 500 || response.status === 429);
    }
    const payload = await response.json() as { data?: Partial<SubmittedReview> };
    const review = payload.data;
    if (!Number.isInteger(review?.id) || review?.targetType !== 'VIDEO' || review.targetId !== videoId || review.requestId !== requestId) {
      throw new GovernanceReviewError('governance review submission returned an invalid response', false);
    }
    return review as SubmittedReview;
  }
}
