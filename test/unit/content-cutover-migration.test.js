const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..', '..');
const script = path.join(root, 'scripts', 'content-cutover-migrate.mjs');

function run(environment) {
  return spawnSync(process.execPath, [script], { cwd: root, env: { ...process.env, ...environment }, encoding: 'utf8' });
}

test('content cutover migration requires confirmation', () => {
  const result = run({ DATABASE_URL: 'mysql://root:x@127.0.0.1:3306/video_player', CONTENT_DATABASE_URL: 'mysql://content:x@127.0.0.1:3306/content_media_test', CONTENT_CUTOVER_CONFIRM: '' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CONTENT_CUTOVER_CONFIRM=MIGRATE_CONTENT is required/);
});

test('content cutover migration rejects the source database as its target even with different credentials', () => {
  const result = run({
    DATABASE_URL: 'mysql://source:x@127.0.0.1:3306/content_test',
    CONTENT_DATABASE_URL: 'mysql://target:y@127.0.0.1:3306/content_test',
    CONTENT_CUTOVER_CONFIRM: 'MIGRATE_CONTENT',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source and target databases must differ/);
});

test('content cutover migration requires exact non-test target authorization', () => {
  const result = run({ DATABASE_URL: 'mysql://root:x@127.0.0.1:3306/video_player', CONTENT_DATABASE_URL: 'mysql://content:x@db.example.com:3306/content_media', CONTENT_CUTOVER_CONFIRM: 'MIGRATE_CONTENT', CONTENT_CUTOVER_ALLOWED_TARGET: '' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CONTENT_CUTOVER_ALLOWED_TARGET=db\.example\.com:3306\/content_media/);
});
