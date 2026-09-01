const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const deliveryRoot = path.join(root, 'delivery');
const rawEvidenceRoot = path.join(deliveryRoot, '04_tests', 'raw');
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

function markdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(absolute);
    return entry.name.endsWith('.md') ? [absolute] : [];
  });
}

function standaloneFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.DS_Store') return [];
    const absolute = path.join(directory, entry.name);
    assert.equal(entry.isSymbolicLink(), false, `${path.relative(root, absolute)} must not be a symlink`);
    if (entry.isDirectory()) return standaloneFiles(absolute);
    return entry.isFile() ? [absolute] : [];
  });
}

function canonicalTextBytes(bytes) {
  return Buffer.from(bytes.toString('utf8').replace(/\r\n?/g, '\n'), 'utf8');
}

function sha256Bytes(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function isBinaryDeliveryFile(file) {
  const absolute = path.resolve(file);
  const rawRelative = path.relative(rawEvidenceRoot, absolute);
  return (
    (!rawRelative.startsWith('..') && !path.isAbsolute(rawRelative)) ||
    binaryExtensions.has(path.extname(absolute).toLowerCase())
  );
}

function sha256(file) {
  const bytes = fs.readFileSync(file);
  return sha256Bytes(isBinaryDeliveryFile(file) ? bytes : canonicalTextBytes(bytes));
}

function verifyStandalonePackage(packageName, expectedManifestEntries) {
  const packageRoot = path.join(deliveryRoot, packageName);
  const manifestLines = fs
    .readFileSync(path.join(packageRoot, 'source-manifest.tsv'), 'utf8')
    .trim()
    .split(/\r?\n/);
  assert.equal(manifestLines[0], '# generated_by\tscripts/generate-delivery-standalone.mjs');
  assert.match(manifestLines[1], /^# hash_policy\ttext uses canonical LF bytes/);
  assert.equal(manifestLines[2], 'category\tsource_path\tpackaged_path\tsha256');

  const manifestEntries = manifestLines.slice(3).map((line) => {
    const [category, sourcePath, packagedPath, expectedHash] = line.split('\t');
    assert.ok(category, `invalid ${packageName} manifest category: ${line}`);
    assert.ok(sourcePath, `invalid ${packageName} source path: ${line}`);
    assert.ok(packagedPath, `invalid ${packageName} packaged path: ${line}`);
    assert.match(expectedHash, /^[a-f0-9]{64}$/);
    assert.equal(
      sourcePath.startsWith('delivery/03_devops/') ||
        (sourcePath.startsWith('delivery/04_tests/') &&
          !sourcePath.startsWith('delivery/04_tests/raw/github-run-33379394312/experiments/')),
      false,
      `${packageName} manifest must not use a generated delivery copy as a source: ${sourcePath}`,
    );

    const source = path.resolve(root, sourcePath);
    const packaged = path.resolve(packageRoot, packagedPath);
    const packagedRelative = path.relative(packageRoot, packaged);
    assert.equal(
      packagedRelative.startsWith('..') || path.isAbsolute(packagedRelative),
      false,
      `${packageName} manifest path escapes its directory: ${packagedPath}`,
    );
    assert.equal(fs.statSync(source).isFile(), true, `source file missing: ${sourcePath}`);
    assert.equal(fs.lstatSync(packaged).isSymbolicLink(), false, `packaged file is a symlink: ${packagedPath}`);
    assert.equal(fs.statSync(packaged).isFile(), true, `packaged file missing: ${packagedPath}`);
    assert.equal(sha256(source), expectedHash, `source hash mismatch: ${sourcePath}`);
    assert.equal(sha256(packaged), expectedHash, `packaged hash mismatch: ${packagedPath}`);
    return { category, sourcePath, packagedPath, expectedHash };
  });
  assert.equal(manifestEntries.length, expectedManifestEntries);

  const checksumFile = path.join(packageRoot, 'checksums.sha256');
  const checksumLines = fs.readFileSync(checksumFile, 'utf8').trim().split(/\r?\n/);
  const checksummedPaths = [];
  for (const line of checksumLines) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match, `invalid ${packageName} checksum line: ${line}`);
    const file = path.resolve(packageRoot, match[2]);
    const relative = path.relative(packageRoot, file);
    assert.equal(
      relative.startsWith('..') || path.isAbsolute(relative),
      false,
      `${packageName} checksum path escapes its directory: ${match[2]}`,
    );
    assert.equal(fs.statSync(file).isFile(), true, `${packageName} checksum file missing: ${match[2]}`);
    assert.equal(sha256(file), match[1], `${packageName} checksum mismatch: ${match[2]}`);
    checksummedPaths.push(relative.split(path.sep).join('/'));
  }

  const expectedChecksummedPaths = standaloneFiles(packageRoot)
    .filter((file) => file !== checksumFile)
    .map((file) => path.relative(packageRoot, file).split(path.sep).join('/'))
    .sort();
  assert.deepEqual(checksummedPaths.sort(), expectedChecksummedPaths);

  for (const markdownFile of markdownFiles(packageRoot)) {
    const content = fs.readFileSync(markdownFile, 'utf8');
    const links = [...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]);
    for (const link of links) {
      if (/^(?:https?:|mailto:|#)/.test(link)) continue;
      const target = path.resolve(path.dirname(markdownFile), decodeURIComponent(link.split('#', 1)[0]));
      const relative = path.relative(packageRoot, target);
      assert.equal(
        relative.startsWith('..') || path.isAbsolute(relative),
        false,
        `${path.relative(root, markdownFile)} links outside ${packageName}: ${link}`,
      );
      assert.equal(fs.existsSync(target), true, `${path.relative(root, markdownFile)} has missing link ${link}`);
    }
  }

  return manifestEntries;
}

test('DEL-03-04 packages contain standalone DevOps, tests, load scripts, reports, and data', () => {
  assert.equal(
    sha256Bytes(canonicalTextBytes(Buffer.from('alpha\r\nbeta\r\n'))),
    sha256Bytes(canonicalTextBytes(Buffer.from('alpha\nbeta\n'))),
    'text hashes must be stable across CRLF and LF checkouts',
  );
  const devopsEntries = verifyStandalonePackage('03_devops', 119);
  const testEntries = verifyStandalonePackage('04_tests', 95);

  const categoryCount = (entries, category) => entries.filter((entry) => entry.category === category).length;
  assert.equal(categoryCount(devopsEntries, 'containers'), 15);
  assert.equal(categoryCount(devopsEntries, 'pipelines'), 22);
  assert.equal(categoryCount(devopsEntries, 'kubernetes'), 35);
  assert.equal(categoryCount(devopsEntries, 'database'), 40);
  assert.equal(categoryCount(devopsEntries, 'deployment'), 7);
  assert.equal(categoryCount(testEntries, 'automated-tests'), 64);
  assert.equal(categoryCount(testEntries, 'test-config'), 22);
  assert.equal(categoryCount(testEntries, 'test-harness'), 1);
  assert.equal(categoryCount(testEntries, 'load-and-resilience'), 3);
  assert.equal(categoryCount(testEntries, 'experiment-data'), 4);
  assert.equal(categoryCount(testEntries, 'evidence-tool'), 1);

  const devopsFiles = standaloneFiles(path.join(deliveryRoot, '03_devops'));
  assert.equal(
    devopsFiles.filter(
      (file) => file.includes(`${path.sep}containers${path.sep}`) && path.basename(file) === 'Dockerfile',
    ).length,
    7,
  );
  assert.equal(
    devopsFiles.filter(
      (file) =>
        file.includes(`${path.sep}kubernetes${path.sep}`) && /\.(?:yaml|yml)$/.test(path.basename(file)),
    ).length,
    26,
  );
  assert.equal(devopsFiles.filter((file) => path.basename(file) === 'migration.sql').length, 16);
  for (const required of [
    'containers/compose/docker-compose.practice.yml',
    'containers/compose/docker-compose.microservices.yml',
    'pipelines/github-actions/monolith-ci.yml',
    'pipelines/Jenkinsfile',
    'kubernetes/kustomization.yaml',
    'kubernetes/microservices/kustomization.yaml',
    'database/backend/prisma/schema.prisma',
    'database/services/content-media/prisma/schema.prisma',
  ]) {
    assert.equal(fs.statSync(path.join(deliveryRoot, '03_devops', required)).isFile(), true);
  }

  const testPackageRoot = path.join(deliveryRoot, '04_tests');
  for (const required of [
    'automation/test/unit/delivery-package.test.js',
    'automation/test/regression/run.mjs',
    'automation/backend/test/integration-api.e2e-spec.ts',
    'automation/tests/e2e/public-smoke.spec.ts',
    'load/performance-compare.mjs',
    'load/hpa-experiment.sh',
    'load/fault-experiment-probe.mjs',
    'experiments/performance-runs.csv',
    'experiments/performance-three-endpoint-runs.csv',
    'experiments/hpa-timeline.csv',
    'experiments/fault-recovery.csv',
    'raw/github-run-33379394312/run.json',
    'raw/github-run-33379394312/artifacts/public-e2e-evidence/playwright-report/index.html',
  ]) {
    assert.equal(fs.statSync(path.join(testPackageRoot, required)).isFile(), true);
  }
});

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
  const repositoryList = fs.readFileSync(
    path.join(deliveryRoot, '01_source', 'repository-list.tsv'),
    'utf8',
  );
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

  assert.match(sourceManifest, /已合并 PR 范围 \| `#40–#65、#67`/);
  assert.match(sourceManifest, /全部 80 个 Git commit/);
  assert.match(sourceManifest, /33467743557/);
  assert.match(sourceManifest, /\[#66\].*\| OPEN \|/);
  assert.match(sourceManifest, /#66 已显式单列，没有冒充 final main 交付/);
  assert.equal(commitManifest.trim().split('\n').length, 81, 'commit TSV must contain one header and 80 commits');
  assert.match(sourceManifest, /70d197d/, 'manifest must retain the monolith baseline reference');
  assert.match(commitManifest, /Merge pull request #67/);
  assert.match(repositoryList, /DanTargaryen\/VideoPlayer/);
  assert.match(repositoryList, /PUBLIC/);
  assert.match(repositoryList, /monolith-start/);
  assert.match(repositoryList, /6d1ad504db90abf93a408a660e4ffabcc6ddd088/);
  for (const line of fs
    .readFileSync(path.join(deliveryRoot, '01_source', 'checksums.sha256'), 'utf8')
    .trim()
    .split(/\r?\n/)) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match, `invalid source checksum line: ${line}`);
    const file = path.join(deliveryRoot, '01_source', match[2]);
    assert.equal(sha256(file), match[1]);
  }

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
  const pdfChecksumLines = fs
    .readFileSync(path.join(pdfDirectory, 'checksums.sha256'), 'utf8')
    .trim()
    .split(/\r?\n/);
  const expectedPdfChecksumFiles = [...pdfFiles, 'README.md', 'qa.json'].sort((left, right) => {
    const normalizedLeft = left.toLowerCase();
    const normalizedRight = right.toLowerCase();
    if (normalizedLeft < normalizedRight) return -1;
    if (normalizedLeft > normalizedRight) return 1;
    return 0;
  });
  assert.deepEqual(
    pdfChecksumLines.map((line) => line.replace(/^[a-f0-9]{64}  /, '')),
    expectedPdfChecksumFiles,
    'PDF checksum entries must use the verifier canonical filename order',
  );
  for (const line of pdfChecksumLines) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match, `invalid PDF checksum line: ${line}`);
    const file = path.join(pdfDirectory, match[2]);
    assert.equal(sha256(file), match[1]);
  }
  const supplementalPdfQa = JSON.parse(
    fs.readFileSync(path.join(deliveryRoot, 'supplemental-pdf-qa.json'), 'utf8'),
  );
  assert.equal(supplementalPdfQa.status, 'PASS');
  assert.equal(supplementalPdfQa.files.length, 2);
  assert.equal(supplementalPdfQa.files.reduce((total, item) => total + item.pages, 0), 17);
  assert.equal(pdfQa.supplemental_pdf_count, supplementalPdfQa.files.length);
  assert.equal(
    pdfQa.supplemental_total_pages,
    supplementalPdfQa.files.reduce((total, item) => total + item.pages, 0),
  );
  for (const expected of supplementalPdfQa.files) {
    const fromFullQa = pdfQa.supplemental_files.find((item) => item.file === expected.file);
    assert.ok(fromFullQa, `full PDF QA must include ${expected.file}`);
    assert.equal(fromFullQa.pages, expected.pages, `${expected.file} page count must agree across QA reports`);
    assert.equal(fromFullQa.rendered_pages, expected.rendered_pages, `${expected.file} rendered page count must agree across QA reports`);
    assert.equal(fromFullQa.bytes, expected.bytes, `${expected.file} byte size must agree across QA reports`);
    const relativePdf = expected.file === 'contribution-weight-confirmation.pdf'
      ? path.join('05_management', expected.file)
      : path.join('06_defense', expected.file);
    assert.equal(fs.statSync(path.join(deliveryRoot, relativePdf)).size, expected.bytes, `${expected.file} QA byte size must match the PDF`);
  }
  for (const line of fs
    .readFileSync(path.join(deliveryRoot, 'supplemental-pdf-checksums.sha256'), 'utf8')
    .trim()
    .split(/\r?\n/)) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match, `invalid supplemental PDF checksum line: ${line}`);
    const file = path.join(deliveryRoot, match[2]);
    const bytes = fs.readFileSync(file);
    assert.ok(bytes.length > 100_000, `${match[2]} must be a non-trivial PDF`);
    assert.equal(bytes.subarray(0, 4).toString(), '%PDF', `${match[2]} must have a PDF header`);
    assert.equal(sha256(file), match[1]);
  }

  const rawDirectory = path.join(deliveryRoot, '04_tests', 'raw', 'github-run-33379394312');
  const checksumLines = fs
    .readFileSync(path.join(rawDirectory, 'checksums.sha256'), 'utf8')
    .trim()
    .split(/\r?\n/);
  assert.ok(checksumLines.length >= 18, 'raw evidence package must checksum every delivered report');
  for (const line of checksumLines) {
    const match = line.match(/^([a-f0-9]{64})  (.+)$/);
    assert.ok(match, `invalid checksum line: ${line}`);
    const file = path.join(rawDirectory, match[2]);
    assert.equal(fs.existsSync(file), true, `raw evidence file missing: ${match[2]}`);
    assert.equal(sha256(file), match[1]);
  }
  assert.match(managementPlatform, /软工小学期进度文档/);
  assert.match(managementPlatform, /ECtAw1oO9ifu2MkC673ctMk4nif/);
  assert.match(managementPlatform, /8\.25.*8\.31/s);
  for (const screenshot of ['20260831-management-platform.png', '2026-8-25-progress.png']) {
    const screenshotPath = path.join(deliveryRoot, '05_management', screenshot);
    const bytes = fs.readFileSync(screenshotPath);
    assert.ok(bytes.length > 10_000, `${screenshot} must be a non-trivial screenshot`);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${screenshot} must be PNG`);
    assert.match(managementPlatform, new RegExp(screenshot.replace('.', '\\.')));
    assert.match(managementPlatform, new RegExp(sha256(screenshotPath)));
  }
});
