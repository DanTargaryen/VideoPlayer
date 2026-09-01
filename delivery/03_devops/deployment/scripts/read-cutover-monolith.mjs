import { createServer } from 'node:http';

const server = createServer((request, response) => {
  const chunks = [];
  request.on('data', (chunk) => chunks.push(chunk));
  request.on('end', () => {
    const body = JSON.stringify({
      owner: 'monolith',
      method: request.method,
      path: request.url,
      requestId: request.headers['x-request-id'],
      receivedBytes: chunks.reduce((total, chunk) => total + chunk.length, 0),
    });
    response.writeHead(200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
    response.end(body);
  });
});

server.listen(3000, '0.0.0.0');
