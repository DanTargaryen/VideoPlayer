import { createHealthServer, type ServiceRuntimeOptions } from '@videoplayer/shared-contracts';

export const SERVICE_OPTIONS: ServiceRuntimeOptions = {
  serviceName: 'content-media',
  defaultPort: 3102,
};

export function createContentService() {
  return createHealthServer(SERVICE_OPTIONS);
}
