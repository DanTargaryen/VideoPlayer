import { writeFile } from 'node:fs/promises';

import { runRegression } from './lib.mjs';

const report = await runRegression();
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (process.env.REG_REPORT_PATH?.trim()) {
  await writeFile(process.env.REG_REPORT_PATH, serialized, 'utf8');
}
process.stdout.write(serialized);
if (report.targets.some((target) => target.preflight.status === 'FAIL')) process.exitCode = 1;
