const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const deliveryRoot = path.join(root, 'delivery');

function markdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(absolute);
    return entry.name.endsWith('.md') ? [absolute] : [];
  });
}

test('DEL-01 package is complete, linked, renderable, and honest about human evidence', () => {
  const expectedDirectories = [
    '01_source',
    '02_docs',
    '03_devops',
    '04_tests',
    '05_management',
    '06_defense',
  ];

  for (const directory of expectedDirectories) {
    const absolute = path.join(deliveryRoot, directory);
    assert.equal(fs.statSync(absolute).isDirectory(), true, `${directory} must exist`);
    assert.equal(fs.statSync(path.join(absolute, 'README.md')).isFile(), true, `${directory}/README.md must exist`);
  }

  for (const markdownFile of markdownFiles(deliveryRoot)) {
    const content = fs.readFileSync(markdownFile, 'utf8');
    const links = [...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]);
    for (const link of links) {
      if (/^(?:https?:|mailto:|#)/.test(link)) continue;
      const target = decodeURIComponent(link.split('#', 1)[0]);
      assert.equal(
        fs.existsSync(path.resolve(path.dirname(markdownFile), target)),
        true,
        `${path.relative(root, markdownFile)} has missing link ${link}`,
      );
    }
  }

  const pptxPath = path.join(deliveryRoot, '06_defense', 'VideoPlayer-最终答辩.pptx');
  const pptx = fs.readFileSync(pptxPath);
  assert.ok(pptx.length > 10_000, 'final PPTX must be a non-trivial file');
  assert.equal(pptx.subarray(0, 4).toString('hex'), '504b0304', 'final PPTX must start with a ZIP header');
  assert.ok(pptx.includes(Buffer.from('ppt/presentation.xml')), 'final PPTX must contain presentation.xml');
  assert.ok(pptx.includes(Buffer.from('ppt/slides/slide10.xml')), 'final PPTX must contain ten slides');

  const packageReadme = fs.readFileSync(path.join(deliveryRoot, 'README.md'), 'utf8');
  const contribution = fs.readFileSync(
    path.join(deliveryRoot, '05_management', 'contribution-weight-confirmation.md'),
    'utf8',
  );
  const recording = fs.readFileSync(
    path.join(deliveryRoot, '06_defense', 'backup-recording-shot-list.md'),
    'utf8',
  );
  const progress = fs.readFileSync(path.join(root, 'docs/practice-2026/00-progress.md'), 'utf8');

  assert.match(packageReadme, /HUMAN EVIDENCE PENDING/);
  assert.match(contribution, /PENDING HUMAN CONFIRMATION/);
  assert.match(contribution, /未签/);
  assert.match(recording, /RECORDING NOT PROVIDED/);
  assert.match(progress, /- \[ \] `DEL-01`/);
});
