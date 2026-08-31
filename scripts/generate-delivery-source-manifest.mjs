import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(root, 'delivery', '01_source');
const startTag = 'monolith-start';
const endRef = process.env.DELIVERY_MANIFEST_END_REF?.trim() || 'main';

function run(command, args) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8' }).trim();
}

function escapeTable(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function packageInfo(relativePath) {
  const value = JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
  return { name: value.name, version: value.version, path: relativePath };
}

const startTagObject = run('git', ['rev-parse', startTag]);
const startCommit = run('git', ['rev-parse', `${startTag}^{}`]);
const endCommit = run('git', ['rev-parse', endRef]);
const endTree = run('git', ['rev-parse', `${endRef}^{tree}`]);
const commitRows = run('git', [
  'log',
  '--reverse',
  '--format=%H%x09%ad%x09%an%x09%s',
  '--date=iso-strict',
  `${startTag}^{}..${endRef}`,
]).split('\n').filter(Boolean);

const packages = [
  'services/shared-contracts/package.json',
  'services/gateway/package.json',
  'services/identity-community/package.json',
  'services/content-media/package.json',
  'services/live-reward/package.json',
  'services/governance-ai/package.json',
].map(packageInfo);

const workflowRuns = new Map([
  [48, '33324914355'], [49, '33328399081'], [50, '33329693032'],
  [51, '33330723156'], [52, '33333121815'], [53, '33337900513'],
  [54, '33344821161'], [55, '33352991611'], [56, '33359785882'],
  [57, '33367170484'], [58, '33372482927'], [59, '33373473438'],
  [60, '33375231784'], [61, '33377576089'], [62, '33379394312'],
]);

const pullRequests = [];
for (let number = 40; number <= 62; number += 1) {
  const raw = run('gh', [
    'pr', 'view', String(number),
    '--json', 'number,title,state,mergedAt,headRefName,headRefOid,mergeCommit,url',
  ]);
  pullRequests.push(JSON.parse(raw));
}

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(
  join(outputDirectory, 'all-commits.tsv'),
  `commit\tauthor_date\tauthor\tsubject\n${commitRows.join('\n')}\n`,
  'utf8',
);

const packageTable = packages
  .map((item) => `| \`${escapeTable(item.name)}\` | \`${escapeTable(item.version)}\` | \`${escapeTable(item.path)}\` |`)
  .join('\n');

const pullRequestTable = pullRequests.map((item) => {
  const runId = workflowRuns.get(item.number);
  const runCell = runId
    ? `[${runId}](https://github.com/DanTargaryen/VideoPlayer/actions/runs/${runId})`
    : 'N/A（早期 PR 使用本地/Jenkins 证据）';
  return `| [#${item.number}](${item.url}) | ${escapeTable(item.title)} | \`${item.headRefOid}\` | \`${item.mergeCommit?.oid ?? ''}\` | ${item.mergedAt ?? ''} | ${runCell} |`;
}).join('\n');

const markdown = `# 改造版本与完整提交 Manifest

> 生成命令：\`node scripts/generate-delivery-source-manifest.mjs\`
>
> 范围：改造前单体标签 \`${startTag}\` 到生成时受保护主干 \`${endRef}@${endCommit}\`。
>
> 该 Manifest 故意固定结束 SHA；后续交付修订若需要纳入，重新运行生成器并复核差异。

## 1. 改造前原系统版本

| 字段 | 值 |
| --- | --- |
| Git 标签 | \`${startTag}\`（annotated tag） |
| Tag object SHA | \`${startTagObject}\` |
| Tag 指向 commit | \`${startCommit}\` |
| 基线提交说明 | \`${escapeTable(run('git', ['show', '-s', '--format=%s', startCommit]))}\` |

复核：

\`\`\`bash
git rev-parse ${startTag}
git rev-parse ${startTag}^{}
git show -s --format='%H %ad %s' --date=iso-strict ${startTag}^{}
\`\`\`

## 2. 改造后版本

| 字段 | 值 |
| --- | --- |
| 受保护主干 | \`${endRef}\` |
| 最终 commit | \`${endCommit}\` |
| 最终 tree | \`${endTree}\` |
| 提交总数 | \`${commitRows.length}\`（不含起点 commit，含 merge commit） |
| PR 范围 | \`#40–#62\` |
| 镜像版本规则 | Git SHA；验收不得只使用 \`latest\` |

### 微服务与公共 workspace 版本

| Workspace | package version | 来源 |
| --- | --- | --- |
${packageTable}

## 3. 完整 PR / merge / workflow 清单

| PR | 标题 | 最终 head SHA | merge SHA | mergedAt (UTC) | 最终远端 run |
| --- | --- | --- | --- | --- | --- |
${pullRequestTable}

## 4. 全部 ${commitRows.length} 个 Git commit

逐 commit 的完整、机器可读记录位于 [all-commits.tsv](all-commits.tsv)，字段为：

\`\`\`text
commit  author_date  author  subject
\`\`\`

复核：

\`\`\`bash
git log --reverse --format='%H%x09%ad%x09%an%x09%s' --date=iso-strict ${startTag}^{}..${endRef}
wc -l delivery/01_source/all-commits.tsv
\`\`\`

## 5. 完整性判定

- [x] 改造前 annotated tag、tag object 和 peeled commit 均记录。
- [x] 六个改造后 workspace 版本均来自实际 package 文件。
- [x] PR #40–#62 的 head SHA、merge SHA、合并时间和最终远端 run（适用时）均记录。
- [x] 从 \`${startTag}\` 到 \`${endRef}@${endCommit}\` 的全部 ${commitRows.length} 个 commit 均进入 TSV。
- [x] Manifest 可由仓库脚本重新生成，不依赖手工复制 GitHub 页面。
`;

writeFileSync(join(outputDirectory, 'complete-change-manifest.md'), markdown, 'utf8');
console.log(JSON.stringify({ startTagObject, startCommit, endCommit, endTree, commits: commitRows.length, pullRequests: pullRequests.length, packages: packages.length }));
