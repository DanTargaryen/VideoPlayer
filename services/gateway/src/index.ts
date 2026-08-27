import { resolvePort, writeServiceLog } from '@videoplayer/shared-contracts';

import { createGatewayServer, loadGatewayConfig } from './gateway.js';

const config = loadGatewayConfig();
const port = resolvePort(3100);
const server = createGatewayServer(config);
server.listen(port, '0.0.0.0', () => {
  writeServiceLog('gateway', 'gateway_started', { port, routeMode: config.routeMode });
});
