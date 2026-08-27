import { createHealthServer, type ServiceRuntimeOptions } from '@videoplayer/shared-contracts';

export const SERVICE_OPTIONS: ServiceRuntimeOptions = {
  serviceName: 'identity-community',
  defaultPort: 3101,
};

export function createIdentityService() {
  return createHealthServer(SERVICE_OPTIONS);
}
