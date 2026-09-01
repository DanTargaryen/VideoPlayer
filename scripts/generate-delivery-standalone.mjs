#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const deliveryRoot = path.join(repositoryRoot, 'delivery');
const devopsRoot = path.join(deliveryRoot, '03_devops');
const testsRoot = path.join(deliveryRoot, '04_tests');

const generatedDirectories = [
  path.join(devopsRoot, 'containers'),
  path.join(devopsRoot, 'pipelines'),
  path.join(devopsRoot, 'kubernetes'),
  path.join(devopsRoot, 'database'),
  path.join(devopsRoot, 'deployment'),
  path.join(testsRoot, 'automation'),
  path.join(testsRoot, 'load'),
  path.join(testsRoot, 'experiments'),
  path.join(testsRoot, 'tools'),
];

function assertInsideDelivery(target) {
  const relative = path.relative(deliveryRoot, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`refusing to manage path outside delivery: ${target}`);
  }
}

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  return output.split('\0').filter(Boolean).sort();
}

function copyFile(sourceRelative, destinationRoot, destinationRelative, category, manifest, modifiedSources) {
  const source = path.join(repositoryRoot, sourceRelative);
  const destination = path.join(destinationRoot, destinationRelative);
  assertInsideDelivery(destination);

  const sourceStat = fs.lstatSync(source);
  if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
    throw new Error(`delivery source must be a regular file: ${sourceRelative}`);
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  fs.chmodSync(destination, sourceStat.mode & 0o777);

  const sourceHash = sha256(source);
  const destinationHash = sha256(destination);
  if (sourceHash !== destinationHash) {
    throw new Error(`copied file hash mismatch: ${sourceRelative}`);
  }

  manifest.push({
    category,
    source: sourceRelative,
    sourceState: modifiedSources.has(sourceRelative) ? 'WORKTREE' : 'HEAD',
    packaged: path
      .relative(destination.startsWith(`${devopsRoot}${path.sep}`) ? devopsRoot : testsRoot, destination)
      .split(path.sep)
      .join('/'),
    sha256: destinationHash,
  });
}

function writeManifest(packageRoot, sourceCommit, entries) {
  const lines = [
    `# repository_base_commit\t${sourceCommit}`,
    '# source_state\tHEAD means byte-identical to the base commit; WORKTREE means this delivery change updates the source file',
    'category\tsource_path\tsource_state\tpackaged_path\tsha256',
    ...entries
      .sort((left, right) => left.packaged.localeCompare(right.packaged))
      .map(
        (entry) =>
          `${entry.category}\t${entry.source}\t${entry.sourceState}\t${entry.packaged}\t${entry.sha256}`,
      ),
  ];
  fs.writeFileSync(path.join(packageRoot, 'source-manifest.tsv'), `${lines.join('\n')}\n`, 'utf8');
}

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.DS_Store') return [];
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`standalone package must not contain symlinks: ${absolute}`);
    }
    if (entry.isDirectory()) return walkFiles(absolute);
    return entry.isFile() ? [absolute] : [];
  });
}

function writeChecksums(packageRoot) {
  const checksumFile = path.join(packageRoot, 'checksums.sha256');
  const lines = walkFiles(packageRoot)
    .filter((file) => file !== checksumFile)
    .map((file) => ({
      relative: path.relative(packageRoot, file).split(path.sep).join('/'),
      hash: sha256(file),
    }))
    .sort((left, right) => left.relative.localeCompare(right.relative))
    .map((entry) => `${entry.hash}  ${entry.relative}`);
  fs.writeFileSync(checksumFile, `${lines.join('\n')}\n`, 'utf8');
}

for (const directory of generatedDirectories) {
  assertInsideDelivery(directory);
  fs.rmSync(directory, { recursive: true, force: true });
}

const files = trackedFiles();
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: repositoryRoot,
  encoding: 'utf8',
}).trim();
const modifiedSources = new Set(
  execFileSync('git', ['diff', '--name-only', '-z', 'HEAD'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean),
);
const devopsManifest = [];
const testsManifest = [];

const serviceDockerfilePattern = /^services\/[^/]+\/Dockerfile$/;
for (const source of files.filter(
  (file) =>
    file === '.dockerignore' ||
    file === 'backend/Dockerfile' ||
    file === 'frontend/Dockerfile' ||
    serviceDockerfilePattern.test(file) ||
    /^deploy\/docker-compose\..+\.ya?ml$/.test(file) ||
    ['deploy/mysql/init.sql', 'deploy/nginx/default.conf', 'deploy/practice.env.example'].includes(file),
)) {
  let destination;
  if (source === '.dockerignore') destination = '.dockerignore';
  else if (source.startsWith('deploy/docker-compose.')) destination = `compose/${path.basename(source)}`;
  else if (source.startsWith('deploy/mysql/')) destination = `mysql/${path.basename(source)}`;
  else if (source.startsWith('deploy/nginx/')) destination = `nginx/${path.basename(source)}`;
  else if (source === 'deploy/practice.env.example') destination = 'practice.env.example';
  else destination = source;
  copyFile(
    source,
    path.join(devopsRoot, 'containers'),
    destination,
    'containers',
    devopsManifest,
    modifiedSources,
  );
}

for (const source of files.filter(
  (file) =>
    file === '.github/workflows/monolith-ci.yml' ||
    file === 'Jenkinsfile' ||
    /^scripts\/ci-.+\.sh$/.test(file) ||
    file === 'scripts/jest-junit-reporter.cjs',
)) {
  let destination;
  if (source === '.github/workflows/monolith-ci.yml') destination = 'github-actions/monolith-ci.yml';
  else if (source === 'Jenkinsfile') destination = 'Jenkinsfile';
  else destination = `scripts/${path.basename(source)}`;
  copyFile(
    source,
    path.join(devopsRoot, 'pipelines'),
    destination,
    'pipelines',
    devopsManifest,
    modifiedSources,
  );
}

for (const source of files.filter(
  (file) => file.startsWith('deploy/k8s/') || /^scripts\/k8s-.+\.sh$/.test(file),
)) {
  const destination = source.startsWith('deploy/k8s/')
    ? source.slice('deploy/k8s/'.length)
    : `scripts/${path.basename(source)}`;
  copyFile(
    source,
    path.join(devopsRoot, 'kubernetes'),
    destination,
    'kubernetes',
    devopsManifest,
    modifiedSources,
  );
}

const databaseScriptNames = new Set([
  'db-migrate.sh',
  'db-reset-test.sh',
  'db-seed.sh',
  'init-db.sh',
  'infra-common.sh',
  'mysql-common.sh',
  'identity-cutover-migrate.mjs',
  'content-cutover-migrate.mjs',
  'live-cutover-migrate.mjs',
  'governance-cutover-migrate.mjs',
]);
for (const source of files.filter(
  (file) =>
    /(^|\/)prisma\/(schema\.prisma|seed\.(?:js|ts)|migrations\/.+)$/.test(file) ||
    /^backend\/scripts\/(?:db-target-safety|db-baseline-existing|seed-guard)\.js$/.test(file) ||
    (file.startsWith('scripts/') && databaseScriptNames.has(path.basename(file))),
)) {
  const destination = source.startsWith('scripts/') ? `scripts/${path.basename(source)}` : source;
  copyFile(
    source,
    path.join(devopsRoot, 'database'),
    destination,
    'database',
    devopsManifest,
    modifiedSources,
  );
}

const deploymentScriptNames = new Set([
  'compose-microservices-smoke.sh',
  'content-interaction-smoke.mjs',
  'content-publishing-smoke.mjs',
  'live-cutover-smoke.mjs',
  'live-reward-content-smoke.mjs',
  'read-cutover-monolith.mjs',
  'read-cutover-probe.mjs',
]);
for (const source of files.filter(
  (file) => file.startsWith('scripts/') && deploymentScriptNames.has(path.basename(file)),
)) {
  copyFile(
    source,
    path.join(devopsRoot, 'deployment'),
    `scripts/${path.basename(source)}`,
    'deployment',
    devopsManifest,
    modifiedSources,
  );
}

const automatedTestPattern = /^(?:test\/(?:unit|regression)\/|backend\/test\/|services\/[^/]+\/test\/|tests\/e2e\/)/;
const frontendTestPattern = /^frontend\/.+\.(?:spec|test)\.[cm]?[jt]sx?$/;
for (const source of files.filter(
  (file) => automatedTestPattern.test(file) || frontendTestPattern.test(file),
)) {
  copyFile(
    source,
    path.join(testsRoot, 'automation'),
    source,
    'automated-tests',
    testsManifest,
    modifiedSources,
  );
}

const testConfigurationPattern = /^(?:backend\/(?:jest\.config\.cjs|package\.json)|frontend\/(?:package\.json|vitest\.config\.ts)|services\/[^/]+\/(?:package\.json|vitest(?:\.integration)?\.config\.ts)|services\/tsconfig\.base\.json)$/;
for (const source of files.filter(
  (file) =>
    ['package.json', 'playwright.config.ts', 'scripts/jest-junit-reporter.cjs'].includes(file) ||
    testConfigurationPattern.test(file),
)) {
  const destination = source.startsWith('scripts/') ? `scripts/${path.basename(source)}` : source;
  copyFile(
    source,
    path.join(testsRoot, 'automation'),
    destination,
    'test-config',
    testsManifest,
    modifiedSources,
  );
}

copyFile(
  'scripts/compose-microservices-smoke.sh',
  path.join(testsRoot, 'automation'),
  'scripts/compose-microservices-smoke.sh',
  'test-harness',
  testsManifest,
  modifiedSources,
);

for (const source of [
  'scripts/performance-compare.mjs',
  'scripts/hpa-experiment.sh',
  'scripts/fault-experiment-probe.mjs',
]) {
  copyFile(
    source,
    path.join(testsRoot, 'load'),
    path.basename(source),
    'load-and-resilience',
    testsManifest,
    modifiedSources,
  );
}

const rawExperimentRoot = 'delivery/04_tests/raw/github-run-33379394312/experiments/';
for (const source of files.filter((file) => file.startsWith(rawExperimentRoot))) {
  copyFile(
    source,
    path.join(testsRoot, 'experiments'),
    path.basename(source),
    'experiment-data',
    testsManifest,
    modifiedSources,
  );
}

copyFile(
  'scripts/collect-delivery-raw-evidence.mjs',
  path.join(testsRoot, 'tools'),
  'collect-delivery-raw-evidence.mjs',
  'evidence-tool',
  testsManifest,
  modifiedSources,
);

writeManifest(devopsRoot, sourceCommit, devopsManifest);
writeManifest(testsRoot, sourceCommit, testsManifest);
writeChecksums(devopsRoot);
writeChecksums(testsRoot);

console.log(`03_devops copied files: ${devopsManifest.length}`);
console.log(`04_tests copied files: ${testsManifest.length}`);
console.log(`source commit: ${sourceCommit}`);
