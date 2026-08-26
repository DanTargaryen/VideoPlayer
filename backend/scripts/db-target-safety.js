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
  try {
    assertTestDatabase(commandName);
  } catch (error) {
    console.error(
      error instanceof Error ? `[db-target-safety] ${error.message}` : String(error),
    );
    process.exit(1);
  }
}

module.exports = {
  assertTestDatabase,
  isLocalDatabaseHost,
  parseDatabaseUrl,
};
