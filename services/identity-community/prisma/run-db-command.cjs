const path = require('node:path');
const { spawnSync } = require('node:child_process');

const serviceDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(serviceDir, '..', '..');
const guardScript = path.join(rootDir, 'backend', 'scripts', 'db-target-safety.js');
const prismaPackagePath = require.resolve('prisma/package.json', { paths: [serviceDir] });
const prismaPackage = require(prismaPackagePath);
const prismaEntrypoint = path.resolve(path.dirname(prismaPackagePath), prismaPackage.bin.prisma);
const schemaPath = path.join(__dirname, 'schema.prisma');
const identityDatabaseUrl = process.env.IDENTITY_DATABASE_URL?.trim();

if (!identityDatabaseUrl) {
  console.error('[identity-db] IDENTITY_DATABASE_URL is required.');
  process.exit(1);
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const command = process.argv[2];
const guardEnv = {
  ...process.env,
  DATABASE_URL: identityDatabaseUrl,
};

if (command === 'migrate') {
  run(process.execPath, [guardScript, 'identity db:migrate', 'migrate-deploy'], guardEnv);
  run(process.execPath, [prismaEntrypoint, 'migrate', 'deploy', '--schema', schemaPath], process.env);
} else if (command === 'seed') {
  run(process.execPath, [path.join(__dirname, 'seed.cjs')], guardEnv);
} else if (command === 'test-reset') {
  run(process.execPath, [guardScript, 'identity db:test-reset', 'test-reset'], guardEnv);
  run(process.execPath, [prismaEntrypoint, 'migrate', 'reset', '--force', '--skip-seed', '--schema', schemaPath], process.env);
} else {
  console.error('[identity-db] Expected migrate, seed, or test-reset.');
  process.exit(1);
}
