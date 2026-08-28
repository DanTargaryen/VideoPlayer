const fs = require('node:fs');
const path = require('node:path');

function sanitizeXml(value) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function escapeXml(value) {
  return sanitizeXml(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function seconds(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return '0';
  }
  return (milliseconds / 1000).toFixed(6);
}

class JestJunitReporter {
  constructor() {
    this.reporterError = null;
  }

  onRunComplete(_testContexts, aggregatedResult) {
    const outputFile = process.env.JUNIT_OUTPUT_FILE;
    if (!outputFile) {
      return;
    }

    try {
      const suites = [];
      let totalTests = 0;
      let totalFailures = 0;
      let totalSkipped = 0;
      let totalTimeMs = 0;

      for (const fileResult of aggregatedResult.testResults ?? []) {
        const relativePath = path.relative(process.cwd(), fileResult.testFilePath) || fileResult.testFilePath;
        const assertions = [...(fileResult.testResults ?? [])];

        if (fileResult.testExecError && assertions.length === 0) {
          assertions.push({
            ancestorTitles: [],
            title: 'test file execution',
            status: 'failed',
            duration: 0,
            failureMessages: [fileResult.testExecError.message ?? String(fileResult.testExecError)],
          });
        }

        const failures = assertions.filter((test) => test.status === 'failed').length;
        const skipped = assertions.filter((test) => !['passed', 'failed'].includes(test.status)).length;
        const suiteTimeMs = Math.max(
          0,
          (fileResult.perfStats?.end ?? 0) - (fileResult.perfStats?.start ?? 0),
        );

        totalTests += assertions.length;
        totalFailures += failures;
        totalSkipped += skipped;
        totalTimeMs += suiteTimeMs;

        const cases = assertions.map((test) => {
          const className = test.ancestorTitles?.length
            ? test.ancestorTitles.join(' › ')
            : relativePath;
          const attributes = [
            `classname="${escapeXml(className)}"`,
            `name="${escapeXml(test.title)}"`,
            `time="${seconds(test.duration)}"`,
          ].join(' ');

          if (test.status === 'failed') {
            const failureText = (test.failureMessages ?? []).join('\n') || 'Test failed without a message.';
            return `    <testcase ${attributes}>\n      <failure message="test failure">${escapeXml(failureText)}</failure>\n    </testcase>`;
          }

          if (test.status !== 'passed') {
            return `    <testcase ${attributes}>\n      <skipped message="${escapeXml(test.status)}"/>\n    </testcase>`;
          }

          return `    <testcase ${attributes}/>`;
        });

        suites.push([
          `  <testsuite name="${escapeXml(relativePath)}" tests="${assertions.length}" failures="${failures}" errors="0" skipped="${skipped}" time="${seconds(suiteTimeMs)}">`,
          ...cases,
          '  </testsuite>',
        ].join('\n'));
      }

      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<testsuites name="Jest tests" tests="${totalTests}" failures="${totalFailures}" errors="0" skipped="${totalSkipped}" time="${seconds(totalTimeMs)}">`,
        ...suites,
        '</testsuites>',
        '',
      ].join('\n');

      fs.mkdirSync(path.dirname(outputFile), { recursive: true });
      fs.writeFileSync(outputFile, xml, 'utf8');
    } catch (error) {
      this.reporterError = error instanceof Error ? error : new Error(String(error));
      console.error(`[jest-junit-reporter] ${this.reporterError.message}`);
    }
  }

  getLastError() {
    return this.reporterError;
  }
}

module.exports = JestJunitReporter;
