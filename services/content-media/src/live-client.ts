import { issueServiceToken } from '@videoplayer/shared-contracts';

export interface LiveWalletClient {
  wallet(userId: string, requestId: string): Promise<{ balance: number }>;
}

export class HttpLiveWalletClient implements LiveWalletClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string, private readonly secret: string, private readonly timeoutMs = 1_000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async wallet(userId: string, requestId: string) {
    const token = issueServiceToken({ caller: 'content-media', audience: 'live-reward', scopes: ['live.wallet.read'], secret: this.secret, requestId });
    const response = await fetch(`${this.baseUrl}/internal/v1/users/${encodeURIComponent(userId)}/wallet`, {
      headers: { authorization: `Bearer ${token}`, 'x-request-id': requestId },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`live wallet returned ${response.status}`);
    const payload = await response.json() as { data?: { balance?: unknown } };
    const balance = Number(payload.data?.balance);
    if (!Number.isFinite(balance)) throw new Error('live wallet returned an invalid response');
    return { balance };
  }
}
