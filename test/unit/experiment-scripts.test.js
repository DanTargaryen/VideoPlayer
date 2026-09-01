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

test('performance comparison runs a three-endpoint matrix per target and gates errors', async (t) => {
  const item = { id: 1, title: '观澜视频平台演示视频', status: 'PUBLISHED' };
  const handler = (request, response) => {
    response.setHeader('content-type', 'application/json');
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/api/v1/feeds/recommend') {
      response.end(JSON.stringify({ code: 0, message: 'ok', data: [item] }));
      return;
    }
    if (url.pathname === '/api/v1/search/all') {
      response.end(JSON.stringify({
        code: 0,
        message: 'ok',
        data: { keyword: url.searchParams.get('keyword'), counts: { video: 1 }, video: [item] },
      }));
      return;
    }
    if (url.pathname === '/api/v1/videos/1') {
      response.end(JSON.stringify({ code: 0, message: 'ok', data: item }));
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 404, message: 'not found', data: null }));
  };
  const monolith = createServer(handler);
  const gateway = createServer(handler);
  t.after(() => Promise.all([new Promise((resolve) => monolith.close(resolve)), new Promise((resolve) => gateway.close(resolve))]));
  const monolithUrl = await listen(monolith);
  const gatewayUrl = await listen(gateway);
  const reportDirectory = mkdtempSync(path.join(tmpdir(), 'performance-matrix-test-'));
  t.after(() => rmSync(reportDirectory, { recursive: true, force: true }));
  const jsonPath = path.join(reportDirectory, 'report.json');
  const csvPath = path.join(reportDirectory, 'report.csv');
  const result = await run('performance-compare.mjs', [], {
    PERF_MONOLITH_BASE_URL: monolithUrl,
    PERF_MICROSERVICE_BASE_URL: gatewayUrl,
    PERF_ROUNDS: '3',
    PERF_REQUESTS: '12',
    PERF_CONCURRENCY: '3',
    PERF_WARMUP_REQUESTS: '2',
    PERF_MAX_P95_MS: '1000',
    PERF_JSON_PATH: jsonPath,
    PERF_CSV_PATH: csvPath,
  });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.schemaVersion, 'perf-01/v2');
  assert.equal(report.results.length, 18);
  assert.equal(report.totalMeasuredRequests, 216);
  assert.equal(report.totalErrors, 0);
  assert.deepEqual(Object.keys(report.summaryByEndpoint), ['recommend', 'search', 'video-detail']);
  for (const endpoint of Object.values(report.summaryByEndpoint)) {
    assert.equal(endpoint.monolith.rounds, 3);
    assert.equal(endpoint.microserviceGateway.rounds, 3);
    assert.equal(endpoint.monolith.totalErrors + endpoint.microserviceGateway.totalErrors, 0);
    assert.match(endpoint.signature, /^1:/);
  }
  assert.deepEqual(
    Object.fromEntries(['recommend', 'search', 'video-detail'].map((endpoint) => [
      endpoint,
      [1, 2, 3].map((round) => report.results
        .filter((row) => row.endpoint === endpoint && row.round === round)
        .map((row) => row.target)),
    ])),
    {
      recommend: [
        ['monolith', 'microservice-gateway'],
        ['microservice-gateway', 'monolith'],
        ['monolith', 'microservice-gateway'],
      ],
      search: [
        ['microservice-gateway', 'monolith'],
        ['monolith', 'microservice-gateway'],
        ['microservice-gateway', 'monolith'],
      ],
      'video-detail': [
        ['monolith', 'microservice-gateway'],
        ['microservice-gateway', 'monolith'],
        ['monolith', 'microservice-gateway'],
      ],
    },
  );
  assert.deepEqual(JSON.parse(readFileSync(jsonPath, 'utf8')), report);
  const csv = readFileSync(csvPath, 'utf8');
  assert.match(csv, /^endpoint,path,target,round,requests,concurrency,/);
  assert.equal(csv.trim().split('\n').length, 19);
});

test('performance Compose runner supports isolated MinIO host ports and the matrix defaults', () => {
  const compose = readFileSync(path.join(root, 'deploy', 'docker-compose.microservices.yml'), 'utf8');
  const smoke = readFileSync(path.join(root, 'scripts', 'compose-microservices-smoke.sh'), 'utf8');
  const monolithMock = readFileSync(path.join(root, 'scripts', 'read-cutover-monolith.mjs'), 'utf8');
  const evidence = readFileSync(path.join(root, 'delivery', '04_tests', 'experiments', 'performance-three-endpoint-runs.csv'), 'utf8');
  const sourceEvidence = readFileSync(path.join(root, 'docs', 'practice-2026', 'evidence', 'performance-three-endpoint-runs.csv'), 'utf8');
  assert.match(compose, /CONTENT_MINIO_HOST_PORT:-9000/);
  assert.match(compose, /CONTENT_MINIO_CONSOLE_HOST_PORT:-9001/);
  assert.match(smoke, /MINIO_PORT="\$CONTENT_MINIO_HOST_PORT"/);
  assert.match(smoke, /PERF_ENDPOINTS='recommend,search,video-detail'/);
  assert.match(smoke, /PERF_ROUNDS='3'/);
  assert.match(smoke, /PERF_REQUESTS='240'/);
  assert.match(smoke, /PERF_CONCURRENCY='16'/);
  assert.match(smoke, /PERF01 shared published fixture/);
  assert.match(smoke, /SELECT COUNT\(\*\) FROM Video WHERE status = 'PUBLISHED'/);
  assert.match(compose, /MONOLITH_UPSTREAM_HOST_PORT:-3000/);
  assert.match(smoke, /PORT="\$MONOLITH_UPSTREAM_HOST_PORT" node/);
  assert.match(monolithMock, /process\.env\.PORT \?\? 3000/);
  assert.equal(evidence, sourceEvidence);
  const evidenceRows = evidence.trim().split('\n');
  assert.match(evidenceRows[0], /^endpoint,path,target,round,requests,concurrency,/);
  assert.equal(evidenceRows.length, 19);
  for (const endpoint of ['recommend', 'search', 'video-detail']) {
    for (const target of ['monolith', 'microservice-gateway']) {
      assert.equal(evidenceRows.filter((row) => row.startsWith(`${endpoint},`) && row.includes(`,${target},`)).length, 3);
    }
  }
  assert.ok(evidenceRows.slice(1).every((row) => /,0,"\{""200"":240\}"$/.test(row)));
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
  assert.match(script, /archive_and_release_migration/);
  assert.match(script, /crictl rmi "\$image"/);
  assert.match(script, /KIND_RELEASE_LOCAL_IMAGES_AFTER_IMPORT/);
  assert.match(script, /docker image rm "\$image"/);
  assert.match(script, /mysql_root_exec/);
  assert.match(script, /mysql -h 127\.0\.0\.1 -uroot/);
  assert.equal([...script.matchAll(/mysql -h 127\.0\.0\.1/g)].length, 5);
  assert.match(script, /for attempt in \$\(seq 1 30\)/);
  assert.ok(
    script.indexOf('archive_and_release_migration identity-migrate')
      < script.indexOf('load_kind_image "$content_migration_image"'),
    'migration images must be released before the next image is imported',
  );
  assert.ok(
    script.indexOf('archive_and_release_migration governance-migrate')
      < script.indexOf('for image in "${runtime_images[@]}"'),
    'runtime images must be imported only after migration images are released',
  );
  assert.match(script, /set image statefulset\/content-minio/);
  assert.match(script, /rollout restart "deployment\/\$service"/);
});
