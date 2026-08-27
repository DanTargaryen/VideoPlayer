import { writeServiceLog } from '@videoplayer/shared-contracts';

import { createContentService, SERVICE_OPTIONS } from './service.js';

const port = Number(process.env.PORT ?? SERVICE_OPTIONS.defaultPort);
const server = createContentService();

server.listen(port, '0.0.0.0', () => {
  writeServiceLog('content-media', 'service_started', { port, version: process.env.GIT_SHA?.trim() || process.env.SERVICE_VERSION?.trim() || 'dev' });
});
