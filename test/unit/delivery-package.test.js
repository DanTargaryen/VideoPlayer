const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
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
  const requirementsAudit = fs.readFileSync(path.join(deliveryRoot, 'requirements-audit.md'), 'utf8');
  const contribution = fs.readFileSync(
    path.join(deliveryRoot, '05_management', 'contribution-weight-confirmation.md'),
    'utf8',
  );
  const memberMapping = fs.readFileSync(
    path.join(deliveryRoot, '05_management', 'member-role-mapping.md'),
    'utf8',
  );
  const recording = fs.readFileSync(
    path.join(deliveryRoot, '06_defense', 'backup-recording-shot-list.md'),
    'utf8',
  );
  const demoScript = fs.readFileSync(path.join(deliveryRoot, '06_defense', 'demo-script.md'), 'utf8');
  const progress = fs.readFileSync(path.join(root, 'docs/practice-2026/00-progress.md'), 'utf8');
  const projectReadme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const sourceManifest = fs.readFileSync(
    path.join(deliveryRoot, '01_source', 'complete-change-manifest.md'),
    'utf8',
  );
  const commitManifest = fs.readFileSync(path.join(deliveryRoot, '01_source', 'all-commits.tsv'), 'utf8');
  const managementPlatform = fs.readFileSync(
    path.join(deliveryRoot, '05_management', 'project-management-platform.md'),
    'utf8',
  );

  assert.match(packageReadme, /HUMAN EVIDENCE PENDING/);
  assert.match(requirementsAudit, /7 项完整、2 项部分完成、0 项完全缺失/);
  assert.match(requirementsAudit, /`05_management` \| \*\*部分\*\*/);
  assert.match(requirementsAudit, /`06_defense` \| \*\*部分\*\*/);
  assert.match(memberMapping, /DEFAULT MAPPING AUTHORIZED BY USER/);
  for (const [role, name, studentId] of [
    ['A', '林明', '23375181'],
    ['B', '刘钟屹', '23375291'],
    ['C', '李晓萌', '24371422'],
    ['D', '张壮志', '24371350'],
    ['E', '王一涵', '24371063'],
  ]) {
    assert.match(memberMapping, new RegExp(`\\| ${role} \\| ${name} \\| ${studentId} \\|`));
    assert.match(contribution, new RegExp(`\\| ${name} \\| ${studentId} \\| ${role}：`));
    assert.match(demoScript, new RegExp(`${role} \/ ${name}`));
    assert.match(recording, new RegExp(`${role} \/ ${name}`));
  }
  assert.match(contribution, /PENDING HUMAN CONFIRMATION/);
  assert.match(contribution, /未签/);
  assert.match(recording, /RECORDING NOT PROVIDED/);
  assert.match(progress, /- \[ \] `DEL-01`/);

  assert.match(sourceManifest, /PR #40–#62/);
  assert.match(sourceManifest, /全部 72 个 Git commit/);
  assert.equal(commitManifest.trim().split('\n').length, 73, 'commit TSV must contain one header and 72 commits');
  assert.match(sourceManifest, /70d197d/, 'manifest must retain the monolith baseline reference');
  assert.match(commitManifest, /Merge pull request #62/);

  for (const port of ['3100', '3101', '3102', '3103', '3104', '9000', '9001', '8080', '1985']) {
    assert.match(projectReadme, new RegExp(port));
  }
  assert.match(projectReadme, /demo_user/);
  assert.match(projectReadme, /demo_admin/);
  assert.match(projectReadme, /已发布视频 \| 11/);

  const pdfDirectory = path.join(deliveryRoot, '02_docs', 'pdf');
  const pdfFiles = fs.readdirSync(pdfDirectory).filter((file) => file.endsWith('.pdf')).sort();
  assert.equal(pdfFiles.length, 7, '02_docs must contain seven final PDFs');
  for (const pdf of pdfFiles) {
    const bytes = fs.readFileSync(path.join(pdfDirectory, pdf));
    assert.ok(bytes.length > 100_000, `${pdf} must be a non-trivial PDF`);
    assert.equal(bytes.subarray(0, 4).toString(), '%PDF', `${pdf} must have a PDF header`);
  }
  const pdfQa = JSON.parse(fs.readFileSync(path.join(pdfDirectory, 'qa.json'), 'utf8'));
  assert.equal(pdfQa.status, 'PASS');
  assert.equal(pdfQa.total_pages, 99);
  for (const line of fs.readFileSync(path.join(pdfDirectory, 'checksums.sha256'), 'utf8').trim().split('\n')) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match, `invalid PDF checksum line: ${line}`);
    const file = path.join(pdfDirectory, match[2]);
    assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), match[1]);
  }
  const supplementalPdfQa = JSON.parse(
    fs.readFileSync(path.join(deliveryRoot, 'supplemental-pdf-qa.json'), 'utf8'),
  );
  assert.equal(supplementalPdfQa.status, 'PASS');
  assert.equal(supplementalPdfQa.files.length, 2);
  assert.equal(supplementalPdfQa.files.reduce((total, item) => total + item.pages, 0), 6);
  for (const line of fs
    .readFileSync(path.join(deliveryRoot, 'supplemental-pdf-checksums.sha256'), 'utf8')
    .trim()
    .split('\n')) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match, `invalid supplemental PDF checksum line: ${line}`);
    const file = path.join(deliveryRoot, match[2]);
    const bytes = fs.readFileSync(file);
    assert.ok(bytes.length > 100_000, `${match[2]} must be a non-trivial PDF`);
    assert.equal(bytes.subarray(0, 4).toString(), '%PDF', `${match[2]} must have a PDF header`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), match[1]);
  }

  const rawDirectory = path.join(deliveryRoot, '04_tests', 'raw', 'github-run-33379394312');
  const checksumLines = fs.readFileSync(path.join(rawDirectory, 'checksums.sha256'), 'utf8').trim().split('\n');
  assert.ok(checksumLines.length >= 18, 'raw evidence package must checksum every delivered report');
  for (const line of checksumLines) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match, `invalid checksum line: ${line}`);
    const file = path.join(rawDirectory, match[2]);
    assert.equal(fs.existsSync(file), true, `raw evidence file missing: ${match[2]}`);
    assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), match[1]);
  }
  assert.match(managementPlatform, /软工小学期进度文档/);
  assert.match(managementPlatform, /ECtAw1oO9ifu2MkC673ctMk4nif/);
  assert.match(managementPlatform, /8\.25.*8\.31/s);
  for (const screenshot of ['20260831-management-platform.png', '2026-8-25-progress.png']) {
    const bytes = fs.readFileSync(path.join(deliveryRoot, '05_management', screenshot));
    assert.ok(bytes.length > 10_000, `${screenshot} must be a non-trivial screenshot`);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${screenshot} must be PNG`);
    assert.match(managementPlatform, new RegExp(screenshot.replace('.', '\\.')));
    assert.match(managementPlatform, new RegExp(createHash('sha256').update(bytes).digest('hex')));
  }
});
