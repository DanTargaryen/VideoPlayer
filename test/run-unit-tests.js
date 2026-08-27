const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '..');
const unitTestDir = path.join(workspaceRoot, 'test', 'unit');
const testFiles = fs
  .readdirSync(unitTestDir)
  .filter((fileName) => fileName.endsWith('.test.js'))
  .sort()
  .map((fileName) => path.join(unitTestDir, fileName));

const junitOutputFile = process.env.JUNIT_OUTPUT_FILE;
const nodeArguments = ['--test'];

if (junitOutputFile) {
  fs.mkdirSync(path.dirname(junitOutputFile), { recursive: true });
  nodeArguments.push(
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    '--test-reporter=junit',
    `--test-reporter-destination=${junitOutputFile}`,
  );
}

nodeArguments.push(...testFiles);

const result = spawnSync(process.execPath, nodeArguments, {
  cwd: workspaceRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
