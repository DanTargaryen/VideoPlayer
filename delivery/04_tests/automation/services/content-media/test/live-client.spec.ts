import { once } from 'node:events';
import { createServer, type Server } from 'node:http';

import { verifyServiceToken } from '@videoplayer/shared-contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { HttpLiveWalletClient } from '../src/live-client.js';

const secret = 'content-live-wallet-test-secret-0123456789';
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

async function listen(server: Server) {
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  return `http://127.0.0.1:${address.port}`;
}

describe('content live wallet client', () => {
  it('uses the scoped internal wallet contract', async () => {
    const baseUrl = await listen(createServer((request, response) => {
      const token = String(request.headers.authorization).replace(/^Bearer\s+/i, '');
      const claims = verifyServiceToken(token, { audience: 'live-reward', secret, requiredScopes: ['live.wallet.read'], allowedCallers: ['content-media'] });
      expect(claims.requestId).toBe('wallet-client-request');
      expect(request.url).toBe('/internal/v1/users/7/wallet');
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ data: { balance: 23 } }));
    }));
    await expect(new HttpLiveWalletClient(baseUrl, secret, 500).wallet('7', 'wallet-client-request')).resolves.toEqual({ balance: 23 });
  });
});
