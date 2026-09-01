const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');

function run(scriptName, environment) {
  return spawnSync(process.execPath, [path.join(root, 'scripts', scriptName)], { cwd: root, env: { ...process.env, ...environment }, encoding: 'utf8' });
}

test('live migration requires confirmation and exact target authorization', () => {
  const missing = run('live-cutover-migrate.mjs', { DATABASE_URL: 'mysql://root:x@127.0.0.1:3306/video_player', LIVE_REWARD_DATABASE_URL: 'mysql://live:x@127.0.0.1:3306/live_test', LIVE_CUTOVER_CONFIRM: '' });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /LIVE_CUTOVER_CONFIRM=MIGRATE_LIVE_REWARD/);
  const protectedTarget = run('live-cutover-migrate.mjs', { DATABASE_URL: 'mysql://root:x@127.0.0.1:3306/video_player', LIVE_REWARD_DATABASE_URL: 'mysql://live:x@db.example.com:3306/live_reward', LIVE_CUTOVER_CONFIRM: 'MIGRATE_LIVE_REWARD', LIVE_CUTOVER_ALLOWED_TARGET: '' });
  assert.match(protectedTarget.stderr, /LIVE_CUTOVER_ALLOWED_TARGET=db\.example\.com:3306\/live_reward/);
});

test('live migration rejects the source database despite different credentials', () => {
  const result = run('live-cutover-migrate.mjs', { DATABASE_URL: 'mysql://source:x@127.0.0.1:3306/live_test', LIVE_REWARD_DATABASE_URL: 'mysql://target:y@127.0.0.1:3306/live_test', LIVE_CUTOVER_CONFIRM: 'MIGRATE_LIVE_REWARD' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source and target databases must differ/);
});

test('governance migration requires confirmation and exact target authorization', () => {
  const missing = run('governance-cutover-migrate.mjs', { DATABASE_URL: 'mysql://root:x@127.0.0.1:3306/video_player', GOVERNANCE_DATABASE_URL: 'mysql://governance:x@127.0.0.1:3306/governance_test', GOVERNANCE_CUTOVER_CONFIRM: '' });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /GOVERNANCE_CUTOVER_CONFIRM=MIGRATE_GOVERNANCE/);
  const protectedTarget = run('governance-cutover-migrate.mjs', { DATABASE_URL: 'mysql://root:x@127.0.0.1:3306/video_player', GOVERNANCE_DATABASE_URL: 'mysql://governance:x@db.example.com:3306/governance', GOVERNANCE_CUTOVER_CONFIRM: 'MIGRATE_GOVERNANCE', GOVERNANCE_CUTOVER_ALLOWED_TARGET: '' });
  assert.match(protectedTarget.stderr, /GOVERNANCE_CUTOVER_ALLOWED_TARGET=db\.example\.com:3306\/governance/);
});

test('governance migration rejects the source database despite different credentials', () => {
  const result = run('governance-cutover-migrate.mjs', { DATABASE_URL: 'mysql://source:x@127.0.0.1:3306/governance_test', GOVERNANCE_DATABASE_URL: 'mysql://target:y@127.0.0.1:3306/governance_test', GOVERNANCE_CUTOVER_CONFIRM: 'MIGRATE_GOVERNANCE' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source and target databases must differ/);
});
