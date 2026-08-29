import { resolvePort, writeServiceLog } from '@videoplayer/shared-contracts';

import { createGovernanceService, SERVICE_OPTIONS } from './service.js';

const port = resolvePort(SERVICE_OPTIONS.defaultPort);
const server = createGovernanceService();
server.listen(port, '0.0.0.0', () => {
  writeServiceLog(SERVICE_OPTIONS.serviceName, 'service_started', {
    port,
    version: process.env.GIT_SHA?.trim() || process.env.SERVICE_VERSION?.trim() || 'dev',
  });
});
