import { createHealthServer, type ServiceRuntimeOptions } from '@videoplayer/shared-contracts';

export const SERVICE_OPTIONS: ServiceRuntimeOptions = {
  serviceName: 'governance-ai',
  defaultPort: 3104,
};

export function createGovernanceService() {
  return createHealthServer(SERVICE_OPTIONS);
}
