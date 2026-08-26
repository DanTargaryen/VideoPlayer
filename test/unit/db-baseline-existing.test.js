const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  buildMigrationDeployArgs,
  buildMigrationDiffArgs,
  buildMigrationResolveArgs,
  buildPrismaExecArgs,
  confirmationToken,
  isConfirmationAccepted,
  migrationName,
  normalizeConfirmation,
} = require('../../backend/scripts/db-baseline-existing.js');

describe('db baseline existing helpers', () => {
  it('normalizes and accepts the manual confirmation token', () => {
    assert.equal(normalizeConfirmation('  baseline  '), 'BASELINE');
    assert.equal(isConfirmationAccepted('baseline'), true);
    assert.equal(isConfirmationAccepted(' BASELINE '), true);
    assert.equal(isConfirmationAccepted('nope'), false);
    assert.equal(confirmationToken, 'BASELINE');
  });

  it('builds the expected prisma command arguments', () => {
    const diffArgs = buildMigrationDiffArgs('prisma/schema.prisma');
    const resolveArgs = buildMigrationResolveArgs();
    const deployArgs = buildMigrationDeployArgs();
    const execArgs = buildPrismaExecArgs(['migrate', 'deploy']);

    assert.deepEqual(diffArgs, [
      'migrate',
      'diff',
      '--from-url',
      process.env.DATABASE_URL || '',
      '--to-schema-datamodel',
      'prisma/schema.prisma',
      '--exit-code',
    ]);
    assert.deepEqual(resolveArgs, ['migrate', 'resolve', '--applied', migrationName]);
    assert.deepEqual(deployArgs, ['migrate', 'deploy']);
    assert.deepEqual(execArgs, ['exec', '--', 'prisma', 'migrate', 'deploy']);
  });
});
