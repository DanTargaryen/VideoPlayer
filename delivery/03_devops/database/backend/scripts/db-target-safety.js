const path = require('node:path');
const { parseEnvFile } = require('./seed-guard');

const backendDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(backendDir, '..');

function loadLocalEnv() {
  const fileValues = {
    ...parseEnvFile(path.join(rootDir, '.env')),
    ...parseEnvFile(path.join(backendDir, '.env')),
  };

  for (const [key, value] of Object.entries(fileValues)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseDatabaseUrl() {
  loadLocalEnv();

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  const parsed = new URL(rawUrl);
  const database = parsed.pathname.replace(/^\//, '');
  if (!database) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  return {
    hostname: parsed.hostname,
    port: parsed.port || '3306',
    database,
  };
}

function isLocalDatabaseHost(hostname) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === 'mysql' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.startsWith('127.')
  );
}

function formatDatabaseTarget(target) {
  return `${target.hostname}:${target.port}/${target.database}`;
}

function isDefaultAcceptanceDatabase(database) {
  const normalized = database.toLowerCase();
  return normalized === 'video_player' || normalized.includes('test');
}

function assertExactAllowedTarget(commandName, envName, confirmName, confirmToken) {
  const target = parseDatabaseUrl();
  const actualTarget = formatDatabaseTarget(target);
  const allowedTarget = process.env[envName]?.trim();
  const confirmation = process.env[confirmName]?.trim();

  if (allowedTarget !== actualTarget || confirmation !== confirmToken) {
    throw new Error(
      [
        `${commandName} refused for ${actualTarget}.`,
        `Set ${envName}=${actualTarget} and ${confirmName}=${confirmToken} for this exact database target.`,
      ].join(' '),
    );
  }

  console.log(`[db-target-safety] ${commandName} explicitly allowed for ${actualTarget}.`);
}

function assertMigrationTargetAllowed(commandName) {
  const target = parseDatabaseUrl();
  const isLocalDatabase = isLocalDatabaseHost(target.hostname);
  const isAcceptanceDatabase = isDefaultAcceptanceDatabase(target.database);

  if (isLocalDatabase && isAcceptanceDatabase) {
    console.log(
      `[db-target-safety] ${commandName} allowed for ${formatDatabaseTarget(target)}.`,
    );
    return;
  }

  assertExactAllowedTarget(
    commandName,
    'MIGRATION_DEPLOY_ALLOWED_TARGET',
    'MIGRATION_DEPLOY_CONFIRM',
    'DEPLOY_MIGRATIONS',
  );
}

function assertBaselineTargetAllowed(commandName) {
  assertExactAllowedTarget(
    commandName,
    'BASELINE_EXISTING_ALLOWED_TARGET',
    'BASELINE_EXISTING_CONFIRM',
    'BASELINE',
  );
}

function assertTestDatabase(commandName) {
  const target = parseDatabaseUrl();
  const isTestDatabase = target.database.toLowerCase().includes('test');
  const isLocalDatabase = isLocalDatabaseHost(target.hostname);

  if (!isTestDatabase || !isLocalDatabase) {
    throw new Error(
      `${commandName} refused for ${target.hostname}:${target.port}/${target.database}; database name must include "test" and host must be local.`,
    );
  }

  console.log(
    `[db-target-safety] ${commandName} allowed for ${target.hostname}:${target.port}/${target.database}.`,
  );
}

if (require.main === module) {
  const commandName = process.argv[2] || 'database command';
  const mode = process.argv[3] || 'test-reset';
  try {
    if (mode === 'migrate-deploy') {
      assertMigrationTargetAllowed(commandName);
    } else if (mode === 'baseline-existing') {
      assertBaselineTargetAllowed(commandName);
    } else {
      assertTestDatabase(commandName);
    }
  } catch (error) {
    console.error(
      error instanceof Error ? `[db-target-safety] ${error.message}` : String(error),
    );
    process.exit(1);
  }
}

module.exports = {
  assertBaselineTargetAllowed,
  assertExactAllowedTarget,
  assertMigrationTargetAllowed,
  assertTestDatabase,
  formatDatabaseTarget,
  isDefaultAcceptanceDatabase,
  isLocalDatabaseHost,
  parseDatabaseUrl,
};
