const assert = require('node:assert/strict');
const { afterEach, describe, it } = require('node:test');

const {
  assertBaselineTargetAllowed,
  assertMigrationTargetAllowed,
  assertTestDatabase,
  isDefaultAcceptanceDatabase,
  isLocalDatabaseHost,
} = require('../../backend/scripts/db-target-safety.js');

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalMigrationAllowedTarget = process.env.MIGRATION_DEPLOY_ALLOWED_TARGET;
const originalMigrationConfirm = process.env.MIGRATION_DEPLOY_CONFIRM;
const originalBaselineAllowedTarget = process.env.BASELINE_EXISTING_ALLOWED_TARGET;
const originalBaselineConfirm = process.env.BASELINE_EXISTING_CONFIRM;

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }

  if (originalMigrationAllowedTarget === undefined) {
    delete process.env.MIGRATION_DEPLOY_ALLOWED_TARGET;
  } else {
    process.env.MIGRATION_DEPLOY_ALLOWED_TARGET = originalMigrationAllowedTarget;
  }

  if (originalMigrationConfirm === undefined) {
    delete process.env.MIGRATION_DEPLOY_CONFIRM;
  } else {
    process.env.MIGRATION_DEPLOY_CONFIRM = originalMigrationConfirm;
  }

  if (originalBaselineAllowedTarget === undefined) {
    delete process.env.BASELINE_EXISTING_ALLOWED_TARGET;
  } else {
    process.env.BASELINE_EXISTING_ALLOWED_TARGET = originalBaselineAllowedTarget;
  }

  if (originalBaselineConfirm === undefined) {
    delete process.env.BASELINE_EXISTING_CONFIRM;
  } else {
    process.env.BASELINE_EXISTING_CONFIRM = originalBaselineConfirm;
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

  it('allows migration deploy for local acceptance databases', () => {
    process.env.DATABASE_URL = 'mysql://root:proot@mysql:3306/video_player';

    assert.equal(isDefaultAcceptanceDatabase('video_player'), true);
    assert.doesNotThrow(() => assertMigrationTargetAllowed('db:migrate'));
  });

  it('rejects migration deploy for non-local targets without exact approval', () => {
    process.env.DATABASE_URL = 'mysql://root:proot@db.example.com:3306/video_player';

    assert.throws(
      () => assertMigrationTargetAllowed('db:migrate'),
      /Set MIGRATION_DEPLOY_ALLOWED_TARGET=db.example.com:3306\/video_player/,
    );
  });

  it('allows migration deploy for an exactly approved target', () => {
    process.env.DATABASE_URL = 'mysql://root:proot@db.example.com:3306/video_player';
    process.env.MIGRATION_DEPLOY_ALLOWED_TARGET = 'db.example.com:3306/video_player';
    process.env.MIGRATION_DEPLOY_CONFIRM = 'DEPLOY_MIGRATIONS';

    assert.doesNotThrow(() => assertMigrationTargetAllowed('db:migrate'));
  });

  it('requires exact target approval for existing-database baseline', () => {
    process.env.DATABASE_URL = 'mysql://root:proot@db.example.com:3306/video_player';

    assert.throws(
      () => assertBaselineTargetAllowed('db:baseline-existing'),
      /Set BASELINE_EXISTING_ALLOWED_TARGET=db.example.com:3306\/video_player/,
    );

    process.env.BASELINE_EXISTING_ALLOWED_TARGET = 'db.example.com:3306/video_player';
    process.env.BASELINE_EXISTING_CONFIRM = 'BASELINE';

    assert.doesNotThrow(() => assertBaselineTargetAllowed('db:baseline-existing'));
  });
});
