const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { createServer } = require('node:http');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

function run(script, args = [], environment = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, 'scripts', script), ...args], { cwd: root, env: { ...process.env, ...environment }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

test('performance comparison runs three equivalent rounds per target and gates errors', async (t) => {
  const handler = (_request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ code: 0, message: 'ok', data: [{ id: 1 }] }));
  };
  const monolith = createServer(handler);
  const gateway = createServer(handler);
  t.after(() => Promise.all([new Promise((resolve) => monolith.close(resolve)), new Promise((resolve) => gateway.close(resolve))]));
  const monolithUrl = await listen(monolith);
  const gatewayUrl = await listen(gateway);
  const result = await run('performance-compare.mjs', [], {
    PERF_MONOLITH_BASE_URL: monolithUrl,
    PERF_MICROSERVICE_BASE_URL: gatewayUrl,
    PERF_ROUNDS: '3',
    PERF_REQUESTS: '12',
    PERF_CONCURRENCY: '3',
    PERF_MAX_P95_MS: '1000',
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.results.length, 6);
  assert.equal(report.summary.monolith.rounds, 3);
  assert.equal(report.summary.microserviceGateway.rounds, 3);
  assert.equal(report.summary.monolith.totalErrors + report.summary.microserviceGateway.totalErrors, 0);
});

test('parallel release downloader reconstructs and verifies byte ranges', async (t) => {
  const bytes = Buffer.from('verified-range-download-'.repeat(512));
  const server = createServer((request, response) => {
    const match = /^bytes=(\d+)-(\d+)$/.exec(request.headers.range ?? '');
    if (!match) { response.statusCode = 416; response.end(); return; }
    const start = Number(match[1]);
    const end = Number(match[2]);
    const slice = bytes.subarray(start, end + 1);
    response.writeHead(206, { 'content-length': slice.length, 'content-range': `bytes ${start}-${end}/${bytes.length}`, 'accept-ranges': 'bytes' });
    response.end(slice);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = await listen(server);
  const directory = mkdtempSync(path.join(tmpdir(), 'release-downloader-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const destination = path.join(directory, 'asset.bin');
  const digest = createHash('sha256').update(bytes).digest('hex');
  const result = await run('download-release-asset.mjs', [url, destination, String(bytes.length), digest, '4']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readFileSync(destination), bytes);
});

test('HPA manifest and experiment encode bounded scale-up, scale-down, checksum and cleanup', () => {
  const manifest = readFileSync(path.join(root, 'deploy/k8s/microservices/hpa.yaml'), 'utf8');
  const script = readFileSync(path.join(root, 'scripts/hpa-experiment.sh'), 'utf8');
  assert.match(manifest, /minReplicas: 1/);
  assert.match(manifest, /maxReplicas: 3/);
  assert.match(manifest, /averageUtilization: 25/);
  assert.match(manifest, /stabilizationWindowSeconds: 30/);
  assert.match(script, /METRICS_SERVER_SHA256/);
  assert.match(script, /delete hpa gateway/);
  assert.match(script, /delete -f "\$metrics_manifest"/);
});

test('unified K8s deploy imports local-platform images and restarts workloads after secrets', () => {
  const script = readFileSync(path.join(root, 'scripts/k8s-deploy-microservices.sh'), 'utf8');
  assert.match(script, /docker save -o "\$image_archive"/);
  assert.match(script, /ctr --namespace=k8s\.io images import/);
  assert.match(script, /set image statefulset\/content-minio/);
  assert.match(script, /rollout restart "deployment\/\$service"/);
});
