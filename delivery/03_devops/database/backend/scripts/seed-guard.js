const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(backendDir, '..');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const values = {};
  const content = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getConfiguredPassword() {
  const configuredHash = process.env.SEED_GUARD_PASSWORD_SHA256?.trim();
  if (configuredHash) {
    const normalizedHash = configuredHash.replace(/^sha256:/i, '').trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(normalizedHash)) {
      throw new Error('SEED_GUARD_PASSWORD_SHA256 must be a 64-character SHA-256 hex digest.');
    }
    return { type: 'sha256', value: normalizedHash };
  }

  const configuredPassword = process.env.SEED_GUARD_PASSWORD;
  if (configuredPassword) {
    return { type: 'plain', value: configuredPassword };
  }

  return null;
}

function passwordMatches(input, configuredPassword) {
  if (configuredPassword.type === 'sha256') {
    return safeEqual(sha256(input), configuredPassword.value);
  }
  return safeEqual(input, configuredPassword.value);
}

function describeDatabaseTarget() {
  const target = getDatabaseTarget();
  if (!target) {
    return 'unknown database target';
  }

  return `${target.hostname}:${target.port}/${target.database || '(no database)'}`;
}

function getDatabaseTarget() {
  try {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    return {
      hostname: databaseUrl.hostname,
      port: databaseUrl.port || '3306',
      database: databaseUrl.pathname.replace(/^\//, ''),
    };
  } catch {
    return null;
  }
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

function ensureDestructiveSeedTargetAllowed() {
  const target = getDatabaseTarget();
  if (!target) {
    return;
  }

  const isLocalDatabase = isLocalDatabaseHost(target.hostname);
  const isRemoteTestExplicitlyAllowed =
    process.env.SEED_GUARD_ALLOW_REMOTE_TEST === '1' &&
    target.database.toLowerCase().includes('test');

  if (isLocalDatabase || isRemoteTestExplicitlyAllowed) {
    return;
  }

  console.error(
    [
      `[seed-guard] Refusing destructive db:seed for ${target.hostname}:${target.port}/${target.database}.`,
      '[seed-guard] Destructive seed is only allowed for local databases, or for explicit remote test databases with SEED_GUARD_ALLOW_REMOTE_TEST=1.',
    ].join('\n'),
  );
  process.exit(1);
}

function readHiddenLine(prompt) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== 'function') {
      reject(new Error('Interactive password prompt is unavailable.'));
      return;
    }

    let input = '';
    const wasRaw = stdin.isRaw;

    function cleanup() {
      stdin.off('data', onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
    }

    function onData(chunk) {
      const text = chunk.toString('utf8');

      for (const char of text) {
        if (char === '\u0003') {
          cleanup();
          stdout.write('\n');
          process.exit(130);
        }

        if (char === '\r' || char === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(input);
          return;
        }

        if (char === '\u007f' || char === '\b') {
          input = input.slice(0, -1);
          continue;
        }

        input += char;
      }
    }

    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function readConfirmationPassword() {
  if (process.env.SEED_GUARD_CONFIRM !== undefined) {
    return process.env.SEED_GUARD_CONFIRM;
  }

  return readHiddenLine('Enter db:seed password: ');
}

async function ensureSeedAllowed() {
  loadLocalEnv();

  const configuredPassword = getConfiguredPassword();
  const target = describeDatabaseTarget();

  ensureDestructiveSeedTargetAllowed();

  if (!configuredPassword) {
    console.error(
      [
        `[seed-guard] Refusing to run destructive db:seed for ${target}.`,
        '[seed-guard] Configure SEED_GUARD_PASSWORD_SHA256 or SEED_GUARD_PASSWORD in backend/.env first.',
      ].join('\n'),
    );
    process.exit(1);
  }

  let confirmation;
  try {
    confirmation = await readConfirmationPassword();
  } catch (error) {
    console.error(
      [
        `[seed-guard] Refusing to run destructive db:seed for ${target}.`,
        '[seed-guard] No interactive terminal is available; set SEED_GUARD_CONFIRM for this one command.',
      ].join('\n'),
    );
    process.exit(1);
  }

  if (!passwordMatches(confirmation, configuredPassword)) {
    console.error(`[seed-guard] Password rejected. db:seed aborted for ${target}.`);
    process.exit(1);
  }

  console.warn(`[seed-guard] Password accepted. Continuing destructive db:seed for ${target}.`);
}

module.exports = {
  ensureDestructiveSeedTargetAllowed,
  ensureSeedAllowed,
  getDatabaseTarget,
  isLocalDatabaseHost,
  parseEnvFile,
};

if (require.main === module) {
  ensureSeedAllowed().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
