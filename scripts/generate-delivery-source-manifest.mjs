import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(root, 'delivery', '01_source');
const startTag = 'monolith-start';
const endRef = process.env.DELIVERY_MANIFEST_END_REF?.trim() || 'main';
const firstPullRequest = 40;
const lastPullRequest = 67;
const finalMainRunId = '33467743557';

function run(command, args) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8' }).trim();
}

function escapeTable(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function escapeTsv(value) {
  return String(value ?? '').replaceAll('\t', ' ').replaceAll('\n', ' ');
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function formatNumberRanges(numbers) {
  const sorted = [...numbers].sort((left, right) => left - right);
  const ranges = [];
  for (const number of sorted) {
    const current = ranges.at(-1);
    if (!current || number !== current[1] + 1) {
      ranges.push([number, number]);
      continue;
    }
    current[1] = number;
  }
  return ranges
    .map(([start, end]) => (start === end ? `#${start}` : `#${start}–#${end}`))
    .join('、');
}

function packageInfo(relativePath) {
  const value = JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
  return { name: value.name, version: value.version, path: relativePath };
}

const startTagObject = run('git', ['rev-parse', startTag]);
const startCommit = run('git', ['rev-parse', `${startTag}^{}`]);
const endCommit = run('git', ['rev-parse', endRef]);
const endTree = run('git', ['rev-parse', `${endRef}^{tree}`]);
const repository = JSON.parse(run('gh', [
  'repo', 'view',
  '--json', 'nameWithOwner,url,visibility,defaultBranchRef',
]));
const finalMainRun = JSON.parse(run('gh', [
  'run', 'view', finalMainRunId,
  '--json', 'status,conclusion,headSha,url,jobs',
]));
if (finalMainRun.status !== 'completed' || finalMainRun.conclusion !== 'success') {
  throw new Error(`final main run ${finalMainRunId} is not completed/success`);
}
if (finalMainRun.headSha !== endCommit) {
  throw new Error(`final main run ${finalMainRunId} targets ${finalMainRun.headSha}, expected ${endCommit}`);
}
if (finalMainRun.jobs.length !== 3 || finalMainRun.jobs.some((job) => job.conclusion !== 'success')) {
  throw new Error(`final main run ${finalMainRunId} does not contain exactly three successful jobs`);
}
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
  [63, '33395434940'], [64, '33463103266'], [65, '33463843587'],
  [67, '33466825816'],
]);

const candidatePullRequests = [];
for (let number = firstPullRequest; number <= lastPullRequest; number += 1) {
  const raw = run('gh', [
    'pr', 'view', String(number),
    '--json', 'number,title,state,mergedAt,headRefName,headRefOid,mergeCommit,url',
  ]);
  candidatePullRequests.push(JSON.parse(raw));
}
const pullRequests = candidatePullRequests.filter((item) => item.state === 'MERGED' && item.mergeCommit?.oid);
const excludedPullRequests = candidatePullRequests.filter((item) => !pullRequests.includes(item));
for (const item of pullRequests) {
  run('git', ['merge-base', '--is-ancestor', item.mergeCommit.oid, endCommit]);
}
const pullRequestScope = formatNumberRanges(pullRequests.map((item) => item.number));
const excludedPullRequestScope = formatNumberRanges(excludedPullRequests.map((item) => item.number));

mkdirSync(outputDirectory, { recursive: true });
const commitTsv = `commit\tauthor_date\tauthor\tsubject\n${commitRows.join('\n')}\n`;
const repositoryTsv = [
  'repository\turl\tvisibility\tdefault_branch\toriginal_ref\toriginal_commit\tfinal_ref\tfinal_commit',
  [
    repository.nameWithOwner,
    repository.url,
    repository.visibility,
    repository.defaultBranchRef?.name ?? endRef,
    startTag,
    startCommit,
    endRef,
    endCommit,
  ].map(escapeTsv).join('\t'),
  '',
].join('\n');

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
const excludedPullRequestTable = excludedPullRequests.length > 0
  ? excludedPullRequests.map((item) => (
    `| [#${item.number}](${item.url}) | ${escapeTable(item.title)} | ${item.state} | \`${item.headRefOid}\` | 未合并，不属于 \`${endRef}@${endCommit}\` |`
  )).join('\n')
  : '| 无 | 无 | N/A | N/A | 所有候选 PR 均已合并 |';

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
| 已合并 PR 范围 | \`${pullRequestScope}\` |
| 候选 PR 审计范围 | \`#${firstPullRequest}–#${lastPullRequest}\`；未合并 PR 单列，不冒充 final main 变更 |
| 镜像版本规则 | Git SHA；验收不得只使用 \`latest\` |
| 最终主干 CI | [${finalMainRunId}](${finalMainRun.url})（3/3 jobs success，head \`${finalMainRun.headSha}\`） |

### 微服务与公共 workspace 版本

| Workspace | package version | 来源 |
| --- | --- | --- |
${packageTable}

## 3. 仓库清单

机器可读仓库定位信息位于 [repository-list.tsv](repository-list.tsv)，包含公开仓库 URL、默认分支、改造前 tag/commit 与最终 ref/commit。

## 4. 完整 merged PR / merge / workflow 清单

| PR | 标题 | 最终 head SHA | merge SHA | mergedAt (UTC) | 最终远端 run |
| --- | --- | --- | --- | --- | --- |
${pullRequestTable}

### 未纳入 final main 的候选 PR

| PR | 标题 | 状态 | head SHA | 排除原因 |
| --- | --- | --- | --- | --- |
${excludedPullRequestTable}

## 5. 全部 ${commitRows.length} 个 Git commit

逐 commit 的完整、机器可读记录位于 [all-commits.tsv](all-commits.tsv)，字段为：

\`\`\`text
commit  author_date  author  subject
\`\`\`

复核：

\`\`\`bash
git log --reverse --format='%H%x09%ad%x09%an%x09%s' --date=iso-strict ${startTag}^{}..${endRef}
wc -l delivery/01_source/all-commits.tsv
\`\`\`

## 6. 完整性判定

- [x] 改造前 annotated tag、tag object 和 peeled commit 均记录。
- [x] 六个改造后 workspace 版本均来自实际 package 文件。
- [x] 仓库 URL、可见性、默认分支、改造前与改造后 ref/commit 已写入 TSV。
- [x] 候选 PR #${firstPullRequest}–#${lastPullRequest} 已全量查询；已合并 ${pullRequestScope} 的 head/merge SHA、合并时间和远端 run（适用时）均记录。
- [x] 未合并候选 ${excludedPullRequestScope || '无'} 已显式单列，没有冒充 final main 交付。
- [x] 从 \`${startTag}\` 到 \`${endRef}@${endCommit}\` 的全部 ${commitRows.length} 个 commit 均进入 TSV。
- [x] 最终主干 SHA 已由 GitHub Actions run ${finalMainRunId} 完成 3/3 jobs 验证，且 run head 与 final commit 一致。
- [x] Manifest 可由仓库脚本重新生成，不依赖手工复制 GitHub 页面。
`;

const generatedFiles = new Map([
  ['repository-list.tsv', repositoryTsv],
  ['all-commits.tsv', commitTsv],
  ['complete-change-manifest.md', markdown],
]);
for (const [filename, content] of generatedFiles) {
  writeFileSync(join(outputDirectory, filename), content, 'utf8');
}
const checksums = [...generatedFiles]
  .map(([filename, content]) => `${sha256(content)}  ${filename}`)
  .join('\n');
writeFileSync(join(outputDirectory, 'checksums.sha256'), `${checksums}\n`, 'utf8');

console.log(JSON.stringify({
  repository: repository.nameWithOwner,
  startTagObject,
  startCommit,
  endCommit,
  endTree,
  commits: commitRows.length,
  candidatePullRequests: candidatePullRequests.length,
  pullRequests: pullRequests.length,
  excludedPullRequests: excludedPullRequests.length,
  pullRequestScope,
  packages: packages.length,
  finalMainRun: finalMainRunId,
}));
