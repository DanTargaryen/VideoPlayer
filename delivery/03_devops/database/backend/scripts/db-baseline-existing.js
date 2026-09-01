#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const readline = require('node:readline/promises');

const { stdin, stdout } = require('node:process');
const { assertBaselineTargetAllowed, parseDatabaseUrl } = require('./db-target-safety');

const backendDir = path.resolve(__dirname, '..');
const migrationName = '20260826000000_init';
const confirmationToken = 'BASELINE';
const npmCliPath = process.env.npm_execpath;

function normalizeConfirmation(value) {
  return String(value ?? '').trim().toUpperCase();
}

function isConfirmationAccepted(value) {
  return normalizeConfirmation(value) === confirmationToken;
}

function buildPrismaExecArgs(args) {
  return ['exec', '--', 'prisma', ...args];
}

function buildMigrationDiffArgs(schemaPath) {
  return [
    'migrate',
    'diff',
    '--from-url',
    process.env.DATABASE_URL || '',
    '--to-schema-datamodel',
    schemaPath,
    '--exit-code',
  ];
}

function buildMigrationResolveArgs() {
  return ['migrate', 'resolve', '--applied', migrationName];
}

function buildMigrationDeployArgs() {
  return ['migrate', 'deploy'];
}

function runPrisma(args, options = {}) {
  if (!npmCliPath) {
    throw new Error('npm_execpath is unavailable. Run db:baseline-existing through npm.');
  }

  const result = spawnSync(process.execPath, [npmCliPath, ...buildPrismaExecArgs(args)], {
    cwd: backendDir,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function runMysqlQuery(query) {
  const rawUrl = new URL(process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/video_player_test');
  const target = parseDatabaseUrl();
  const result = spawnSync(
    'mysql',
    [
      '--connect-timeout=5',
      '-h',
      target.hostname,
      '-P',
      target.port,
      '-D',
      target.database,
      '-u',
      decodeURIComponent(rawUrl.username || 'root'),
      '-Nse',
      query,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        MYSQL_PWD: decodeURIComponent(rawUrl.password || ''),
      },
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const errorOutput = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(errorOutput || 'mysql query failed');
  }

  return result.stdout.trim();
}

function hasAppliedBaselineMigration() {
  const tableExists = runMysqlQuery(
    "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '_prisma_migrations');",
  );

  if (tableExists !== '1') {
    return false;
  }

  const applied = runMysqlQuery(
    `SELECT EXISTS(SELECT 1 FROM _prisma_migrations WHERE migration_name = '${migrationName}');`,
  );

  return applied === '1';
}

async function readConfirmation() {
  if (process.env.BASELINE_EXISTING_CONFIRM !== undefined) {
    return process.env.BASELINE_EXISTING_CONFIRM;
  }

  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error(
      'Interactive confirmation is unavailable; set BASELINE_EXISTING_CONFIRM=BASELINE for this command.',
    );
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    return await rl.question('Type BASELINE to confirm existing-database baselining: ');
  } finally {
    rl.close();
  }
}

function printCommandFailure(label, result) {
  const stdoutText = (result.stdout || '').trim();
  const stderrText = (result.stderr || '').trim();
  const combined = [stdoutText, stderrText].filter(Boolean).join('\n');

  console.error(`[db-baseline-existing] ${label} failed.`);
  if (combined) {
    console.error(combined);
  }
}

async function main() {
  assertBaselineTargetAllowed('db:baseline-existing');

  const target = parseDatabaseUrl();
  const schemaPath = path.join(backendDir, 'prisma', 'schema.prisma');

  console.log(
    `[db-baseline-existing] Target database ${target.hostname}:${target.port}/${target.database}.`,
  );
  console.log('[db-baseline-existing] Running schema diff against prisma/schema.prisma...');

  const diffResult = runPrisma(buildMigrationDiffArgs(schemaPath), { capture: true });
  if (diffResult.status !== 0) {
    printCommandFailure('prisma migrate diff', diffResult);
    console.error(
      '[db-baseline-existing] Schema diff detected drift. Baseline aborted before resolve/deploy.',
    );
    process.exit(diffResult.status || 1);
  }

  console.log('[db-baseline-existing] Schema diff PASS: existing schema matches prisma/schema.prisma.');

  const confirmation = await readConfirmation();
  if (!isConfirmationAccepted(confirmation)) {
    console.error(
      `[db-baseline-existing] Confirmation rejected. Type ${confirmationToken} to continue.`,
    );
    process.exit(1);
  }

  console.log('[db-baseline-existing] Manual confirmation accepted.');

  if (hasAppliedBaselineMigration()) {
    console.log(
      `[db-baseline-existing] Migration ${migrationName} already recorded; skipping migrate resolve.`,
    );
  } else {
    console.log(
      `[db-baseline-existing] Marking ${migrationName} as applied with prisma migrate resolve...`,
    );
    const resolveResult = runPrisma(buildMigrationResolveArgs());
    if (resolveResult.status !== 0) {
      process.exit(resolveResult.status || 1);
    }
  }

  console.log('[db-baseline-existing] Applying pending migrations with prisma migrate deploy...');
  const deployResult = runPrisma(buildMigrationDeployArgs());
  if (deployResult.status !== 0) {
    process.exit(deployResult.status || 1);
  }

  console.log(
    `[db-baseline-existing] Baseline completed for ${target.hostname}:${target.port}/${target.database}.`,
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? `[db-baseline-existing] ${error.message}` : String(error),
    );
    process.exit(1);
  });
}

module.exports = {
  buildMigrationDeployArgs,
  buildMigrationDiffArgs,
  buildMigrationResolveArgs,
  buildPrismaExecArgs,
  confirmationToken,
  isConfirmationAccepted,
  migrationName,
  normalizeConfirmation,
};
