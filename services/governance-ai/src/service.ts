import { createHealthServer, type ServiceRuntimeOptions } from '@videoplayer/shared-contracts';

import { GovernanceApplication } from './application.js';
import { ModerationCompensator } from './compensation.js';
import { HttpContentModerationClient, type ContentModerationClient } from './content-client.js';
import { ModerationSideEffectClient } from './identity-client.js';
import { PrismaGovernanceStore } from './prisma-store.js';
import { createGovernanceRoute } from './routes.js';
import type { GovernanceStore } from './types.js';

export const SERVICE_OPTIONS: ServiceRuntimeOptions = {
  serviceName: 'governance-ai',
  defaultPort: 3104,
};

export interface GovernanceServiceDependencies {
  store?: GovernanceStore;
  jwtSecret?: string;
  contentClient?: ContentModerationClient;
  compensationIntervalMs?: number | false;
}

export function createGovernanceService(dependencies: GovernanceServiceDependencies = {}) {
  const store = dependencies.store ?? new PrismaGovernanceStore();
  const jwtSecret = dependencies.jwtSecret ?? process.env.SERVICE_JWT_SECRET ?? process.env.INTERNAL_JWT_SECRET ?? '';
  if (jwtSecret.length < 32) throw new Error('SERVICE_JWT_SECRET must contain at least 32 characters');
  const application = new GovernanceApplication(store);
  const contentBaseUrl = process.env.CONTENT_MEDIA_BASE_URL?.trim();
  const rawContentClient = dependencies.contentClient ?? (contentBaseUrl
    ? new HttpContentModerationClient({ baseUrl: contentBaseUrl, jwtSecret })
    : null);
  const identityBaseUrl = process.env.IDENTITY_COMMUNITY_BASE_URL?.trim();
  const contentClient = rawContentClient && identityBaseUrl
    ? new ModerationSideEffectClient(rawContentClient, identityBaseUrl, jwtSecret)
    : rawContentClient;
  const intervalMs = dependencies.compensationIntervalMs === undefined
    ? Number(process.env.GOVERNANCE_COMPENSATION_INTERVAL_MS ?? 30_000)
    : dependencies.compensationIntervalMs;
  const compensator = contentClient ? new ModerationCompensator(store, contentClient) : null;
  const server = createHealthServer({
    ...SERVICE_OPTIONS,
    ready: () => store.ready(),
    route: createGovernanceRoute(application, jwtSecret, contentClient, compensator ? () => compensator.runOnce() : undefined),
  });
  const timer = compensator && intervalMs !== false && Number.isFinite(intervalMs) && intervalMs >= 1_000
    ? setInterval(() => void compensator.runOnce().catch(() => undefined), intervalMs)
    : null;
  timer?.unref();
  server.on('close', () => {
    if (timer) clearInterval(timer);
    void store.close();
  });
  return server;
}
