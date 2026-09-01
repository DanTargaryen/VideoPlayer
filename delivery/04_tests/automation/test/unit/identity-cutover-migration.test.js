const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const script = path.join(root, 'scripts', 'identity-cutover-migrate.mjs');

function run(environment) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    env: { ...process.env, ...environment },
    encoding: 'utf8',
  });
}

test('identity cutover migration requires explicit confirmation', () => {
  const result = run({
    DATABASE_URL: 'mysql://root:secret@127.0.0.1:3306/video_player',
    IDENTITY_DATABASE_URL: 'mysql://identity:secret@127.0.0.1:3306/video_player_identity_test',
    IDENTITY_CUTOVER_CONFIRM: '',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /IDENTITY_CUTOVER_CONFIRM=MIGRATE_IDENTITY is required/);
});

test('identity cutover migration rejects the source database as its target', () => {
  const url = 'mysql://root:secret@127.0.0.1:3306/video_player_test';
  const result = run({ DATABASE_URL: url, IDENTITY_DATABASE_URL: url, IDENTITY_CUTOVER_CONFIRM: 'MIGRATE_IDENTITY' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source and target databases must differ/);
});

test('identity cutover migration requires an exact grant for non-test targets', () => {
  const result = run({
    DATABASE_URL: 'mysql://root:secret@127.0.0.1:3306/video_player',
    IDENTITY_DATABASE_URL: 'mysql://identity:secret@db.example.com:3306/video_player_identity',
    IDENTITY_CUTOVER_CONFIRM: 'MIGRATE_IDENTITY',
    IDENTITY_CUTOVER_ALLOWED_TARGET: '',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /non-test identity target requires IDENTITY_CUTOVER_ALLOWED_TARGET=db\.example\.com:3306\/video_player_identity/);
});
