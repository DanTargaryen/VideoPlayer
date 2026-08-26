const assert = require('node:assert/strict');
const { afterEach, describe, it } = require('node:test');

const {
  assertTestDatabase,
  isLocalDatabaseHost,
} = require('../../backend/scripts/db-target-safety.js');

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe('db target safety guard', () => {
  it('accepts local databases whose name includes test', () => {
    process.env.DATABASE_URL = 'mysql://root:proot@127.0.0.1:3306/video_player_test';

    assert.doesNotThrow(() => assertTestDatabase('db:test-reset'));
  });

  it('rejects reset targets that do not look like a test database', () => {
    process.env.DATABASE_URL = 'mysql://root:proot@127.0.0.1:3306/video_player';

    assert.throws(
      () => assertTestDatabase('db:test-reset'),
      /database name must include "test" and host must be local/,
    );
  });

  it('recognizes the local hosts used by the workspace scripts', () => {
    assert.equal(isLocalDatabaseHost('localhost'), true);
    assert.equal(isLocalDatabaseHost('mysql'), true);
    assert.equal(isLocalDatabaseHost('127.0.0.1'), true);
    assert.equal(isLocalDatabaseHost('10.0.0.8'), false);
  });
});
