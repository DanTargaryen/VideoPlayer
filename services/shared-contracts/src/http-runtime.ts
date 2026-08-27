import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { failure, ok, type ServiceName, type ServiceStatus, type ServiceVersion } from './contracts.js';

export interface ServiceRuntimeOptions {
  serviceName: ServiceName;
  defaultPort: number;
  ready?: () => boolean | Promise<boolean>;
}

function getRequestId(request: IncomingMessage): string {
  const value = request.headers['x-request-id'];
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 128) : randomUUID();
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown, requestId: string): void {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'x-request-id': requestId,
    'x-service-version': resolveVersion(),
  });
  response.end(body);
}

export function writeServiceLog(service: ServiceName, event: string, details: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), service, event, ...details }));
}

function resolveVersion(): string {
  return process.env.GIT_SHA?.trim() || process.env.SERVICE_VERSION?.trim() || 'dev';
}

export function createHealthServer(options: ServiceRuntimeOptions): Server {
  const startedAt = Date.now();
  return createServer(async (request, response) => {
    const requestId = getRequestId(request);
    const method = request.method ?? 'GET';
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    const version = resolveVersion();
    const uptimeSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));

    if (method === 'GET' && path === '/health/live') {
      const status: ServiceStatus = { service: options.serviceName, status: 'live', version, uptimeSeconds };
      writeJson(response, 200, ok(status, requestId), requestId);
      return;
    }

    if (method === 'GET' && path === '/health/ready') {
      const ready = (await options.ready?.()) ?? true;
      const status: ServiceStatus = { service: options.serviceName, status: 'ready', version, uptimeSeconds };
      writeJson(response, ready ? 200 : 503, ready ? ok(status, requestId) : failure('service not ready', requestId), requestId);
      return;
    }

    if (method === 'GET' && path === '/version') {
      const data: ServiceVersion = { service: options.serviceName, version, node: process.version };
      writeJson(response, 200, ok(data, requestId), requestId);
      return;
    }

    writeJson(response, 404, failure('route not implemented in MS-00 scaffold', requestId, 404), requestId);
  });
}

export function resolvePort(defaultPort: number): number {
  const value = Number(process.env.PORT ?? defaultPort);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, received ${process.env.PORT ?? value}`);
  }
  return value;
}

export function startHealthService(options: ServiceRuntimeOptions): Server {
  const port = resolvePort(options.defaultPort);
  const server = createHealthServer(options);
  server.listen(port, '0.0.0.0', () => {
    writeServiceLog(options.serviceName, 'service_started', { port, version: resolveVersion() });
  });
  return server;
}
