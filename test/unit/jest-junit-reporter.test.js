const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, describe, test } = require('node:test');

const JestJunitReporter = require('../../scripts/jest-junit-reporter.cjs');

const temporaryDirectories = [];
const originalOutputFile = process.env.JUNIT_OUTPUT_FILE;

describe('JestJunitReporter XML output', () => {
  afterEach(() => {
    if (originalOutputFile === undefined) {
      delete process.env.JUNIT_OUTPUT_FILE;
    } else {
      process.env.JUNIT_OUTPUT_FILE = originalOutputFile;
    }

    while (temporaryDirectories.length > 0) {
      fs.rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
    }
  });

  test('writes valid escaped pass, failure, and skipped cases', () => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'videoplayer-junit-'));
    temporaryDirectories.push(temporaryDirectory);
    const outputFile = path.join(temporaryDirectory, 'backend.xml');
    process.env.JUNIT_OUTPUT_FILE = outputFile;

    const reporter = new JestJunitReporter();
    reporter.onRunComplete([], {
      testResults: [
        {
          testFilePath: path.join(process.cwd(), 'backend', 'test', 'example.spec.ts'),
          perfStats: { start: 1000, end: 3500 },
          testResults: [
            {
              ancestorTitles: ['Example & suite'],
              title: 'passes <normally>',
              status: 'passed',
              duration: 12,
              failureMessages: [],
            },
            {
              ancestorTitles: ['Example & suite'],
              title: 'reports "failure"',
              status: 'failed',
              duration: 25,
              failureMessages: ['expected <value> & received "other"'],
            },
            {
              ancestorTitles: ['Example & suite'],
              title: 'is pending',
              status: 'pending',
              duration: 0,
              failureMessages: [],
            },
          ],
        },
      ],
    });

    const xml = fs.readFileSync(outputFile, 'utf8');
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(xml, /tests="3" failures="1" errors="0" skipped="1"/);
    assert.match(xml, /Example &amp; suite/);
    assert.match(xml, /passes &lt;normally&gt;/);
    assert.match(xml, /reports &quot;failure&quot;/);
    assert.match(xml, /expected &lt;value&gt; &amp; received &quot;other&quot;/);
    assert.match(xml, /<skipped message="pending"\/>/);
    assert.equal(reporter.getLastError(), null);
  });

  test('stays inactive when no output file is requested', () => {
    delete process.env.JUNIT_OUTPUT_FILE;
    const reporter = new JestJunitReporter();
    reporter.onRunComplete([], { testResults: [] });
    assert.equal(reporter.getLastError(), null);
  });
});
