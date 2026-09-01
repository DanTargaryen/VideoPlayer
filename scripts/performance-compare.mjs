import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const monolithBaseUrl = (process.env.PERF_MONOLITH_BASE_URL ?? 'http://127.0.0.1:3200').replace(/\/$/, '');
const microserviceBaseUrl = (process.env.PERF_MICROSERVICE_BASE_URL ?? 'http://127.0.0.1:3100').replace(/\/$/, '');
const rounds = positiveInteger(process.env.PERF_ROUNDS, 3, 'PERF_ROUNDS');
const requestCount = positiveInteger(process.env.PERF_REQUESTS, 240, 'PERF_REQUESTS');
const concurrency = positiveInteger(process.env.PERF_CONCURRENCY, 16, 'PERF_CONCURRENCY');
const warmupRequests = positiveInteger(process.env.PERF_WARMUP_REQUESTS, 20, 'PERF_WARMUP_REQUESTS');
const maximumP95Ms = positiveInteger(process.env.PERF_MAX_P95_MS, 1_000, 'PERF_MAX_P95_MS');
const searchKeyword = process.env.PERF_SEARCH_KEYWORD?.trim() || '观澜视频平台演示视频';
const videoId = process.env.PERF_VIDEO_ID?.trim() || '1';
const jsonOutputPath = process.env.PERF_JSON_PATH?.trim();
const csvOutputPath = process.env.PERF_CSV_PATH?.trim();

const endpointDefinitions = Object.freeze([
  {
    name: 'recommend',
    path: '/api/v1/feeds/recommend?page=1&pageSize=1',
    responseShape: 'array-one',
  },
  {
    name: 'search',
    path: `/api/v1/search/all?keyword=${encodeURIComponent(searchKeyword)}&tab=video&page=1&pageSize=1`,
    responseShape: 'search-one',
  },
  {
    name: 'video-detail',
    path: `/api/v1/videos/${encodeURIComponent(videoId)}`,
    responseShape: 'object-one',
  },
]);

function positiveInteger(value, fallback, name) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 1) throw new Error(`${name} must be a positive integer`);
  return number;
}

function selectedEndpoints(value) {
  const names = (value?.trim() || endpointDefinitions.map((item) => item.name).join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  assert(names.length > 0, 'PERF_ENDPOINTS must select at least one endpoint');
  assert.equal(new Set(names).size, names.length, 'PERF_ENDPOINTS must not contain duplicates');
  return names.map((name) => {
    const endpoint = endpointDefinitions.find((item) => item.name === name);
    assert(endpoint, `unknown PERF_ENDPOINTS value: ${name}`);
    return endpoint;
  });
}

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))] ?? 0;
}

function itemSignature(item) {
  assert(item && item.id !== undefined, 'response item is missing id');
  return `${item.id}:${String(item.title ?? '')}`;
}

function validatePayload(endpoint, payload) {
  assert.equal(payload?.code, 0, `${endpoint.name} response code is not 0`);
  if (endpoint.responseShape === 'array-one') {
    assert(Array.isArray(payload.data) && payload.data.length === 1, `${endpoint.name} did not return exactly one item`);
    return itemSignature(payload.data[0]);
  }
  if (endpoint.responseShape === 'search-one') {
    const items = Array.isArray(payload?.data?.video)
      ? payload.data.video
      : Array.isArray(payload?.data?.videos)
        ? payload.data.videos
        : null;
    assert(items?.length === 1, `${endpoint.name} did not return exactly one video result`);
    return itemSignature(items[0]);
  }
  assert(payload?.data && !Array.isArray(payload.data), `${endpoint.name} did not return one detail object`);
  assert.equal(payload.data.status, 'PUBLISHED', `${endpoint.name} did not return a published video`);
  return itemSignature(payload.data);
}

async function verifyPayload(baseUrl, endpoint) {
  const response = await fetch(`${baseUrl}${endpoint.path}`, { signal: AbortSignal.timeout(5_000) });
  assert.equal(response.status, 200, `${baseUrl}${endpoint.path} returned ${response.status}`);
  return validatePayload(endpoint, await response.json());
}

async function verifyEndpoint(endpoint) {
  const [monolithSignature, microserviceSignature] = await Promise.all([
    verifyPayload(monolithBaseUrl, endpoint),
    verifyPayload(microserviceBaseUrl, endpoint),
  ]);
  assert.equal(
    microserviceSignature,
    monolithSignature,
    `${endpoint.name} targets returned different logical records`,
  );
  return monolithSignature;
}

async function runRound(target, baseUrl, endpoint, round) {
  let next = 0;
  let errors = 0;
  const statuses = {};
  const latencies = [];
  const startedAt = performance.now();
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= requestCount) return;
      const requestStartedAt = performance.now();
      try {
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          headers: { 'x-request-id': `perf-${endpoint.name}-${target}-${round}-${index}` },
          signal: AbortSignal.timeout(5_000),
        });
        statuses[response.status] = (statuses[response.status] ?? 0) + 1;
        await response.arrayBuffer();
        if (response.status !== 200) errors += 1;
      } catch {
        errors += 1;
        statuses.network = (statuses.network ?? 0) + 1;
      }
      latencies.push(performance.now() - requestStartedAt);
    }
  });
  await Promise.all(workers);
  const durationMs = performance.now() - startedAt;
  latencies.sort((left, right) => left - right);
  const totalLatency = latencies.reduce((sum, value) => sum + value, 0);
  return {
    endpoint: endpoint.name,
    path: endpoint.path,
    target,
    round,
    requests: requestCount,
    concurrency,
    durationMs: Number(durationMs.toFixed(2)),
    requestsPerSecond: Number((requestCount / (durationMs / 1_000)).toFixed(2)),
    meanMs: Number((totalLatency / latencies.length).toFixed(2)),
    p50Ms: Number(percentile(latencies, 0.5).toFixed(2)),
    p95Ms: Number(percentile(latencies, 0.95).toFixed(2)),
    p99Ms: Number(percentile(latencies, 0.99).toFixed(2)),
    maxMs: Number((latencies.at(-1) ?? 0).toFixed(2)),
    errors,
    statuses,
  };
}

function summarize(results, endpoint, target) {
  const rows = results.filter((item) => item.endpoint === endpoint && item.target === target);
  const p95Values = rows.map((item) => item.p95Ms).sort((left, right) => left - right);
  const rpsValues = rows.map((item) => item.requestsPerSecond).sort((left, right) => left - right);
  return {
    rounds: rows.length,
    medianP95Ms: percentile(p95Values, 0.5),
    medianRequestsPerSecond: percentile(rpsValues, 0.5),
    maximumP95Ms: Math.max(...p95Values),
    totalErrors: rows.reduce((sum, item) => sum + item.errors, 0),
  };
}

function compare(monolith, microserviceGateway) {
  const medianP95Ratio = microserviceGateway.medianP95Ms / Math.max(monolith.medianP95Ms, 0.01);
  const medianThroughputRatio = microserviceGateway.medianRequestsPerSecond
    / Math.max(monolith.medianRequestsPerSecond, 0.01);
  const verdict = medianP95Ratio < 1 && medianThroughputRatio > 1
    ? 'improved'
    : medianP95Ratio > 1 && medianThroughputRatio < 1
      ? 'regressed'
      : 'mixed';
  return {
    medianP95Ratio: Number(medianP95Ratio.toFixed(3)),
    medianP95ChangePercent: Number(((medianP95Ratio - 1) * 100).toFixed(1)),
    medianThroughputRatio: Number(medianThroughputRatio.toFixed(3)),
    medianThroughputChangePercent: Number(((medianThroughputRatio - 1) * 100).toFixed(1)),
    verdict,
  };
}

function csvCell(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(results) {
  const columns = [
    ['endpoint', (item) => item.endpoint],
    ['path', (item) => item.path],
    ['target', (item) => item.target],
    ['round', (item) => item.round],
    ['requests', (item) => item.requests],
    ['concurrency', (item) => item.concurrency],
    ['duration_ms', (item) => item.durationMs],
    ['rps', (item) => item.requestsPerSecond],
    ['mean_ms', (item) => item.meanMs],
    ['p50_ms', (item) => item.p50Ms],
    ['p95_ms', (item) => item.p95Ms],
    ['p99_ms', (item) => item.p99Ms],
    ['max_ms', (item) => item.maxMs],
    ['errors', (item) => item.errors],
    ['statuses', (item) => item.statuses],
  ];
  return `${columns.map(([name]) => name).join(',')}\n${results
    .map((item) => columns.map(([, value]) => csvCell(value(item))).join(','))
    .join('\n')}\n`;
}

const endpoints = selectedEndpoints(process.env.PERF_ENDPOINTS);
const signatures = Object.fromEntries(await Promise.all(endpoints.map(async (endpoint) => [
  endpoint.name,
  await verifyEndpoint(endpoint),
])));
for (const endpoint of endpoints) {
  for (let index = 0; index < warmupRequests; index += 1) {
    await Promise.all([
      verifyPayload(monolithBaseUrl, endpoint),
      verifyPayload(microserviceBaseUrl, endpoint),
    ]);
  }
}

const results = [];
for (let round = 1; round <= rounds; round += 1) {
  const offset = (round - 1) % endpoints.length;
  const endpointOrder = [...endpoints.slice(offset), ...endpoints.slice(0, offset)];
  for (const endpoint of endpointOrder) {
    const endpointIndex = endpoints.indexOf(endpoint);
    const monolithFirst = (round + endpointIndex) % 2 === 1;
    const targetOrder = monolithFirst
      ? [['monolith', monolithBaseUrl], ['microservice-gateway', microserviceBaseUrl]]
      : [['microservice-gateway', microserviceBaseUrl], ['monolith', monolithBaseUrl]];
    for (const [target, baseUrl] of targetOrder) {
      process.stderr.write(`[perf] endpoint=${endpoint.name} target=${target} round=${round}/${rounds} requests=${requestCount} concurrency=${concurrency}\n`);
      results.push(await runRound(target, baseUrl, endpoint, round));
    }
  }
}

const summaryByEndpoint = Object.fromEntries(endpoints.map((endpoint) => {
  const monolith = summarize(results, endpoint.name, 'monolith');
  const microserviceGateway = summarize(results, endpoint.name, 'microservice-gateway');
  return [endpoint.name, {
    path: endpoint.path,
    signature: signatures[endpoint.name],
    monolith,
    microserviceGateway,
    comparison: compare(monolith, microserviceGateway),
  }];
}));
const totalMeasuredRequests = results.reduce((sum, item) => sum + item.requests, 0);
const totalErrors = results.reduce((sum, item) => sum + item.errors, 0);
const report = {
  schemaVersion: 'perf-01/v2',
  generatedAt: new Date().toISOString(),
  environment: {
    machine: 'same-host',
    gitSha: process.env.GIT_SHA?.trim() || 'unknown',
    targets: { monolith: monolithBaseUrl, microserviceGateway: microserviceBaseUrl },
    dataCardinality: 'one equivalent published item per endpoint response',
    endpoints: endpoints.map((item) => ({ name: item.name, path: item.path })),
    rounds,
    requestCount,
    concurrency,
    warmupRequests,
    maximumP95Ms,
  },
  totalMeasuredRequests,
  totalErrors,
  results,
  summaryByEndpoint,
};
const serializedReport = `${JSON.stringify(report, null, 2)}\n`;
if (jsonOutputPath) writeFileSync(jsonOutputPath, serializedReport, 'utf8');
if (csvOutputPath) writeFileSync(csvOutputPath, toCsv(results), 'utf8');
process.stdout.write(serializedReport);

const failedGate = Object.values(summaryByEndpoint).some((item) => (
  item.monolith.rounds !== rounds
  || item.microserviceGateway.rounds !== rounds
  || item.monolith.totalErrors > 0
  || item.microserviceGateway.totalErrors > 0
  || item.monolith.maximumP95Ms > maximumP95Ms
  || item.microserviceGateway.maximumP95Ms > maximumP95Ms
));
if (failedGate) process.exitCode = 1;
