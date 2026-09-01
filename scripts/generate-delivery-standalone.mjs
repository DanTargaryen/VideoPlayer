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
const rawEvidencePrefix = 'delivery/04_tests/raw/';
const rawExperimentPrefix = `${rawEvidencePrefix}github-run-33379394312/experiments/`;
const currentPerformanceEvidence = 'docs/practice-2026/evidence/performance-three-endpoint-runs.csv';
const binaryExtensions = new Set([
  '.gif',
  '.gz',
  '.jpeg',
  '.jpg',
  '.mp3',
  '.mp4',
  '.pdf',
  '.png',
  '.pptx',
  '.tar',
  '.webm',
  '.webp',
  '.zip',
]);

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

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function isGeneratedDeliveryPath(file) {
  return file.startsWith('delivery/03_devops/') ||
    (file.startsWith('delivery/04_tests/') && !file.startsWith(rawEvidencePrefix));
}

function isBinaryRepositoryPath(file) {
  return file.startsWith(rawEvidencePrefix) || binaryExtensions.has(path.extname(file).toLowerCase());
}

function canonicalTextBytes(bytes) {
  return Buffer.from(bytes.toString('utf8').replace(/\r\n?/g, '\n'), 'utf8');
}

function deliveryBytes(file, repositoryRelative = toPosix(path.relative(repositoryRoot, file))) {
  const bytes = fs.readFileSync(file);
  return isBinaryRepositoryPath(repositoryRelative) ? bytes : canonicalTextBytes(bytes);
}

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sha256(file, repositoryRelative) {
  return sha256Bytes(deliveryBytes(file, repositoryRelative));
}

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
  return output.split('\0').filter(Boolean).filter((file) => !isGeneratedDeliveryPath(file)).sort();
}

function copyFile(sourceRelative, destinationRoot, destinationRelative, category, manifest) {
  const source = path.join(repositoryRoot, sourceRelative);
  const destination = path.join(destinationRoot, destinationRelative);
  assertInsideDelivery(destination);

  const sourceStat = fs.lstatSync(source);
  if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
    throw new Error(`delivery source must be a regular file: ${sourceRelative}`);
  }

  const sourceBytes = deliveryBytes(source, sourceRelative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, sourceBytes);
  fs.chmodSync(destination, sourceStat.mode & 0o777);

  const sourceHash = sha256Bytes(sourceBytes);
  const destinationHash = sha256(destination);
  if (sourceHash !== destinationHash) {
    throw new Error(`copied file hash mismatch: ${sourceRelative}`);
  }

  manifest.push({
    category,
    source: sourceRelative,
    packaged: path
      .relative(destination.startsWith(`${devopsRoot}${path.sep}`) ? devopsRoot : testsRoot, destination)
      .split(path.sep)
      .join('/'),
    sha256: destinationHash,
  });
}

function writeManifest(packageRoot, entries) {
  const lines = [
    '# generated_by\tscripts/generate-delivery-standalone.mjs',
    '# hash_policy\ttext uses canonical LF bytes; binary and delivery/04_tests/raw use original bytes',
    'category\tsource_path\tpackaged_path\tsha256',
    ...entries
      .sort((left, right) => left.packaged.localeCompare(right.packaged))
      .map((entry) => `${entry.category}\t${entry.source}\t${entry.packaged}\t${entry.sha256}`),
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
  );
}

copyFile(
  'scripts/compose-microservices-smoke.sh',
  path.join(testsRoot, 'automation'),
  'scripts/compose-microservices-smoke.sh',
  'test-harness',
  testsManifest,
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
  );
}

for (const source of files.filter((file) => file.startsWith(rawExperimentPrefix))) {
  copyFile(
    source,
    path.join(testsRoot, 'experiments'),
    path.basename(source),
    'experiment-data',
    testsManifest,
  );
}

copyFile(
  currentPerformanceEvidence,
  path.join(testsRoot, 'experiments'),
  path.basename(currentPerformanceEvidence),
  'experiment-data',
  testsManifest,
);

copyFile(
  'scripts/collect-delivery-raw-evidence.mjs',
  path.join(testsRoot, 'tools'),
  'collect-delivery-raw-evidence.mjs',
  'evidence-tool',
  testsManifest,
);

writeManifest(devopsRoot, devopsManifest);
writeManifest(testsRoot, testsManifest);
writeChecksums(devopsRoot);
writeChecksums(testsRoot);

console.log(`03_devops copied files: ${devopsManifest.length}`);
console.log(`04_tests copied files: ${testsManifest.length}`);
