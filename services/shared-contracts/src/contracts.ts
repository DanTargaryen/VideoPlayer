export const SERVICE_NAMES = [
  'identity-community',
  'content-media',
  'live-reward',
  'governance-ai',
  'gateway',
] as const;

export type ServiceName = (typeof SERVICE_NAMES)[number];

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  requestId: string;
}

export interface ServiceStatus {
  service: ServiceName;
  status: 'live' | 'ready';
  version: string;
  uptimeSeconds: number;
}

export interface ServiceVersion {
  service: ServiceName;
  version: string;
  node: string;
}

export function ok<T>(data: T, requestId: string): ApiResponse<T> {
  return {
    code: 0,
    message: 'ok',
    data,
    requestId,
  };
}

export function failure(message: string, requestId: string, code = 1): ApiResponse<null> {
  return {
    code,
    message,
    data: null,
    requestId,
  };
}
