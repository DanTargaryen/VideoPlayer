import { writeFile } from 'node:fs/promises';

import { runRegression } from './lib.mjs';

const report = await runRegression();
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (process.env.REG_REPORT_PATH?.trim()) {
  await writeFile(process.env.REG_REPORT_PATH, serialized, 'utf8');
}
process.stdout.write(serialized);
const hasFailure = report.targets.some((target) => target.preflight.status === 'FAIL' || target.useCases.some((item) => item.status === 'FAIL'));
const requireAllPass = process.env.REG_REQUIRE_ALL_PASS === 'true';
const hasIncompleteConfiguredTarget = requireAllPass && report.targets.some((target) => target.baseUrl && (target.preflight.status !== 'PASS' || target.useCases.some((item) => item.status !== 'PASS')));
if (hasFailure || hasIncompleteConfiguredTarget) process.exitCode = 1;
