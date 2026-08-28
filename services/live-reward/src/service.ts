import { createLiveHttpServer, LiveApplication, type LiveAppOptions } from './live-app.js';

export const SERVICE_OPTIONS = {
  serviceName: 'live-reward',
  defaultPort: 3103,
} as const;

export function createLiveService(options?: LiveAppOptions) {
  return createLiveHttpServer(new LiveApplication(options));
}
