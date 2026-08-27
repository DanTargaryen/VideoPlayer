import { createHealthServer, type ServiceRuntimeOptions } from '@videoplayer/shared-contracts';

export const SERVICE_OPTIONS: ServiceRuntimeOptions = {
  serviceName: 'live-reward',
  defaultPort: 3103,
};

export function createLiveService() {
  return createHealthServer(SERVICE_OPTIONS);
}
