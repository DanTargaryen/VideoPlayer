import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

const monolithBaseUrl = (process.env.PERF_MONOLITH_BASE_URL ?? 'http://127.0.0.1:3200').replace(/\/$/, '');
const microserviceBaseUrl = (process.env.PERF_MICROSERVICE_BASE_URL ?? 'http://127.0.0.1:3100').replace(/\/$/, '');
const path = process.env.PERF_PATH ?? '/api/v1/feeds/recommend?page=1&pageSize=1';
const rounds = positiveInteger(process.env.PERF_ROUNDS, 3, 'PERF_ROUNDS');
const requestCount = positiveInteger(process.env.PERF_REQUESTS, 240, 'PERF_REQUESTS');
const concurrency = positiveInteger(process.env.PERF_CONCURRENCY, 16, 'PERF_CONCURRENCY');
const maximumP95Ms = positiveInteger(process.env.PERF_MAX_P95_MS, 1_000, 'PERF_MAX_P95_MS');

function positiveInteger(value, fallback, name) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 1) throw new Error(`${name} must be a positive integer`);
  return number;
}

function percentile(sorted, fraction) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))] ?? 0;
}

async function verifyPayload(baseUrl) {
  const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(5_000) });
  assert.equal(response.status, 200, `${baseUrl}${path} returned ${response.status}`);
  const payload = await response.json();
  assert(Array.isArray(payload?.data) && payload.data.length === 1, `${baseUrl}${path} did not return exactly one item`);
}

async function runRound(name, baseUrl, round) {
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
        const response = await fetch(`${baseUrl}${path}`, { headers: { 'x-request-id': `perf-${name}-${round}-${index}` }, signal: AbortSignal.timeout(5_000) });
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
    name,
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

function summarize(results, name) {
  const rows = results.filter((item) => item.name === name);
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

await Promise.all([verifyPayload(monolithBaseUrl), verifyPayload(microserviceBaseUrl)]);
for (let index = 0; index < 20; index += 1) {
  await Promise.all([fetch(`${monolithBaseUrl}${path}`), fetch(`${microserviceBaseUrl}${path}`)]);
}

const results = [];
for (let round = 1; round <= rounds; round += 1) {
  const order = round % 2 === 1
    ? [['monolith', monolithBaseUrl], ['microservice-gateway', microserviceBaseUrl]]
    : [['microservice-gateway', microserviceBaseUrl], ['monolith', monolithBaseUrl]];
  for (const [name, baseUrl] of order) results.push(await runRound(name, baseUrl, round));
}

const summary = {
  monolith: summarize(results, 'monolith'),
  microserviceGateway: summarize(results, 'microservice-gateway'),
};
const report = {
  schemaVersion: 'perf-01/v1',
  generatedAt: new Date().toISOString(),
  environment: { machine: 'same-host', dataCardinality: 'one published item per response', path, rounds, requestCount, concurrency, maximumP95Ms },
  results,
  summary,
  comparison: {
    medianP95Ratio: Number((summary.microserviceGateway.medianP95Ms / Math.max(summary.monolith.medianP95Ms, 0.01)).toFixed(3)),
    medianThroughputRatio: Number((summary.microserviceGateway.medianRequestsPerSecond / Math.max(summary.monolith.medianRequestsPerSecond, 0.01)).toFixed(3)),
  },
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

if (summary.monolith.totalErrors || summary.microserviceGateway.totalErrors || summary.monolith.maximumP95Ms > maximumP95Ms || summary.microserviceGateway.maximumP95Ms > maximumP95Ms) process.exitCode = 1;
