import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { RESULT_STATUSES, UC_IDS, UC_PUBLIC_ENDPOINTS, runRegression, targetConfigurations } from './lib.mjs';

test('supports monolith and microservice Gateway targets from the same suite', () => {
  assert.deepEqual(targetConfigurations({
    MONOLITH_BASE_URL: 'http://monolith.test',
    MICROSERVICE_GATEWAY_BASE_URL: 'http://gateway.test/',
  }), [
    { name: 'monolith', baseUrl: 'http://monolith.test' },
    { name: 'microservice-gateway', baseUrl: 'http://gateway.test/' },
  ]);
});

test('reports environment, Git SHA, service version and only approved statuses', async () => {
  const report = await runRegression({
    env: {
      MONOLITH_BASE_URL: 'http://monolith.test',
      MICROSERVICE_GATEWAY_BASE_URL: 'http://gateway.test',
      GIT_SHA: 'abc123',
    },
    now: new Date('2026-08-29T00:00:00.000Z'),
    fetchImpl: async (url) => new Response(JSON.stringify({
      code: 0,
      message: 'ok',
      requestId: 'reg-test',
      data: { service: String(url).includes('gateway') ? 'gateway' : 'backend', version: 'abc123' },
    }), { status: 200 }),
  });
  assert.equal(report.generatedAt, '2026-08-29T00:00:00.000Z');
  assert.equal(report.schemaVersion, 'reg-01/v2');
  assert.deepEqual(Object.keys(report.endpointCoverage), UC_IDS);
  assert.ok(Object.values(UC_PUBLIC_ENDPOINTS).every((items) => items.length >= 5));
  assert.equal(report.targets[0].gitSha, 'abc123');
  assert.equal(report.targets[1].serviceVersions.service, 'gateway');
  assert.ok(report.targets.every((target) => RESULT_STATUSES.includes(target.preflight.status)));
  assert.ok(report.targets.flatMap((target) => target.useCases).every((item) => item.status === 'NOT RUN'));
});

test('CLI exits non-zero when a configured target or business use case fails', () => {
  const result = spawnSync(process.execPath, ['test/regression/run.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, MONOLITH_BASE_URL: 'http://127.0.0.1:1', MICROSERVICE_GATEWAY_BASE_URL: '', REG_REQUIRE_ALL_PASS: 'true' },
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.targets[0].preflight.status, 'FAIL');
});

test('marks missing targets BLOCKED and unreachable targets FAIL without claiming UC completion', async () => {
  const report = await runRegression({
    env: { MONOLITH_BASE_URL: 'http://unreachable.test' },
    fetchImpl: async () => { throw new Error('connection refused'); },
  });
  assert.equal(report.targets[0].preflight.status, 'FAIL');
  assert.equal(report.targets[1].preflight.status, 'BLOCKED');
  assert.ok(report.targets.flatMap((target) => target.useCases).every((item) => item.status === 'NOT RUN'));
});
