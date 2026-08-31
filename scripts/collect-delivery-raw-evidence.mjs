import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runId = process.env.DELIVERY_EVIDENCE_RUN_ID?.trim() || '33379394312';
if (!/^\d+$/.test(runId)) {
  throw new Error('DELIVERY_EVIDENCE_RUN_ID must contain digits only');
}
const output = join(root, 'delivery', '04_tests', 'raw', `github-run-${runId}`);
const temporary = mkdtempSync(join(tmpdir(), `videoplayer-run-${runId}-`));

function run(command, args) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function slug(value) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replaceAll(/^-|-$/g, '');
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
  });
}

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function assertNoHighRiskSecrets(files) {
  const patterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /github_pat_[A-Za-z0-9_]+/,
    /ghp_[A-Za-z0-9]+/,
    /AKIA[0-9A-Z]{16}/,
    /Authorization:\s*Bearer\s+[A-Za-z0-9._-]+/i,
  ];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (patterns.some((pattern) => pattern.test(content))) {
      throw new Error(`high-risk secret pattern detected in ${relative(root, file)}`);
    }
  }
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const runJson = JSON.parse(run('gh', [
  'run', 'view', runId,
  '--json', 'databaseId,status,conclusion,headSha,url,event,createdAt,updatedAt,jobs',
]));
const artifactsJson = JSON.parse(run('gh', [
  'api', `repos/DanTargaryen/VideoPlayer/actions/runs/${runId}/artifacts`,
]));

writeFileSync(join(output, 'run.json'), `${JSON.stringify(runJson, null, 2)}\n`);
writeFileSync(join(output, 'artifacts.json'), `${JSON.stringify(artifactsJson, null, 2)}\n`);

const logsDirectory = join(output, 'job-logs');
mkdirSync(logsDirectory, { recursive: true });
for (const job of runJson.jobs) {
  const log = run('gh', ['run', 'view', runId, '--job', String(job.databaseId), '--log']);
  writeFileSync(join(logsDirectory, `${job.databaseId}-${slug(job.name)}.log`), log);
}

run('gh', ['run', 'download', runId, '--dir', temporary]);
cpSync(temporary, join(output, 'artifacts'), { recursive: true });

const experimentsDirectory = join(output, 'experiments');
mkdirSync(experimentsDirectory, { recursive: true });
writeFileSync(join(experimentsDirectory, 'hpa-timeline.csv'), `utc_time,stage,ready,desired,cpu_percent,conclusion
06:54:15,baseline,1,1,2,baseline stable
06:54:31,load,1,3,104,HPA requested max replicas
06:54:36,load,3,3,104,scale-up complete
06:55:45,recovery,3,3,125,kubelet window still includes load
06:55:46,recovery,3,3,2,CPU recovered
06:56:01,recovery,2,2,2,first scale-down
06:56:16,recovery,1,1,2,scale-down complete
`);
writeFileSync(join(experimentsDirectory, 'fault-recovery.csv'), `dependency,failure_action,affected_result,unaffected_result,recovery_result
live MySQL,compose stop live-mysql,live ready 503,identity/content/governance/gateway 200,live ready 200
SRS,set SRS_API_BASE to 127.0.0.1:1,room start 503,identity/governance/gateway 200,same room start 200 then ENDED
MinIO,compose stop content-minio,valid upload 500,identity/live/governance/gateway 200,valid upload 200
`);
writeFileSync(join(experimentsDirectory, 'performance-runs.csv'), `target,round,rps,mean_ms,p50_ms,p95_ms,p99_ms,max_ms,errors
monolith,1,1805.41,8.71,7.37,14.85,56.00,56.14,0
microservice-gateway,1,1108.22,14.21,13.23,22.32,31.40,43.50,0
microservice-gateway,2,1435.25,11.01,10.84,15.57,17.39,17.94,0
monolith,2,2334.84,6.75,6.57,9.44,9.83,10.02,0
monolith,3,2455.14,6.37,6.55,7.44,7.91,8.41,0
microservice-gateway,3,1496.81,10.48,9.77,15.24,18.31,19.24,0
`);

const artifactRows = artifactsJson.artifacts.map((item) =>
  `| ${item.name} | ${item.id} | ${item.size_in_bytes} | ${item.expired ? 'yes' : 'no'} |`,
).join('\n');
const jobRows = runJson.jobs.map((job) =>
  `| ${job.databaseId} | ${job.name} | ${job.conclusion} | ${job.startedAt} | ${job.completedAt} |`,
).join('\n');
const readme = `# GitHub Actions 原始证据包：run ${runId}

> 来源：${runJson.url}
>
> Head SHA：\`${runJson.headSha}\`
>
> 状态：\`${runJson.status} / ${runJson.conclusion}\`
>
> 收集命令：\`DELIVERY_EVIDENCE_RUN_ID=${runId} node scripts/collect-delivery-raw-evidence.mjs\`

本目录是课程“测试报告和流水线原始报告”的显式交付例外。通常生成报告保存在 CI Artifact、不进入 Git；本次按任务书要求固定一份可离线复核的最终成功 run，并保存完整 job log、原 Artifact 内容、实验 CSV 和 SHA-256。

## Jobs

| Job ID | 名称 | 结果 | startedAt | completedAt |
| --- | --- | --- | --- | --- |
${jobRows}

## GitHub Artifacts

| 名称 | Artifact ID | 压缩大小（byte） | 已过期 |
| --- | ---: | ---: | --- |
${artifactRows}

## 目录

- \`run.json\`：GitHub run 与每个 step 的原始结构化元数据。
- \`artifacts.json\`：GitHub Artifact API 原始元数据。
- \`job-logs/\`：三个 job 的完整 GitHub Actions 文本日志。
- \`artifacts/public-e2e-evidence/\`：Playwright HTML report 及前后端日志。
- \`artifacts/kind-deployment-evidence/\`：节点、workload、镜像、migration、事件与状态原始文件。
- \`experiments/\`：HPA 时间线、故障恢复和三轮性能逐行 CSV。
- \`checksums.sha256\`：除自身外全部文件的 SHA-256。

## 复核

\`\`\`bash
cd delivery/04_tests/raw/github-run-${runId}
shasum -a 256 -c checksums.sha256
rg 'All migrations have been successfully applied' artifacts/kind-deployment-evidence/migration.log
rg '1/1 +Running +0' artifacts/kind-deployment-evidence/workloads.txt
\`\`\`
`;
writeFileSync(join(output, 'README.md'), readme);

const checksumFiles = listFiles(output)
  .filter((file) => basename(file) !== 'checksums.sha256')
  .sort();
assertNoHighRiskSecrets(checksumFiles);
writeFileSync(
  join(output, 'checksums.sha256'),
  checksumFiles.map((file) => `${sha256(file)}  ${relative(output, file)}`).join('\n') + '\n',
);

rmSync(temporary, { recursive: true, force: true });
console.log(JSON.stringify({ runId, headSha: runJson.headSha, jobs: runJson.jobs.length, artifacts: artifactsJson.artifacts.length, files: listFiles(output).length, bytes: listFiles(output).reduce((total, file) => total + statSync(file).size, 0) }));
