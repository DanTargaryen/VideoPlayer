import { resolvePort, writeServiceLog } from '@videoplayer/shared-contracts';

import { createLiveService, SERVICE_OPTIONS } from './service.js';

const port = resolvePort(SERVICE_OPTIONS.defaultPort);
const server = createLiveService();
server.listen(port, '0.0.0.0', () => writeServiceLog(SERVICE_OPTIONS.serviceName, 'service_started', { port }));
