import { execFileSync } from 'node:child_process';

const image = 'video-player/content-media:verify';
const container = `content-media-verify-${process.pid}`;
const mysqlContainer = `content-media-mysql-${process.pid}`;
const network = `content-media-net-${process.pid}`;
const mysqlPassword = `content-media-${process.pid}-password`;
const database = 'content_media_verify';

function docker(args, options = {}) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();
}

function runDocker(args, options = {}) {
  execFileSync('docker', args, { stdio: 'inherit', ...options });
}

function npm(args, options = {}) {
  const stdio = options.stdio ?? ['ignore', 'pipe', 'pipe'];
  const childOptions = { encoding: 'utf8', ...options, stdio };
  if (process.env.npm_execpath) {
    return (execFileSync(process.execPath, [process.env.npm_execpath, ...args], childOptions) ?? '').toString().trim();
  }
  const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return (execFileSync(executable, args, childOptions) ?? '').toString().trim();
}

async function waitFor(url) {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

try {
  runDocker(['build', '--progress=plain', '-f', 'services/content-media/Dockerfile', '-t', image, '.'], { cwd: '../..' });
  docker(['network', 'create', network]);
  docker([
    'run',
    '--detach',
    '--rm',
    '--name',
    mysqlContainer,
    '--network',
    network,
    '--publish',
    '127.0.0.1::3306',
    '-e',
    `MYSQL_ROOT_PASSWORD=${mysqlPassword}`,
    '-e',
    `MYSQL_DATABASE=${database}`,
    'mysql:8.0',
  ]);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      docker(['exec', mysqlContainer, 'mysqladmin', 'ping', '-h', '127.0.0.1', '-uroot', `-p${mysqlPassword}`, '--silent']);
      break;
    } catch (error) {
      if (attempt === 59) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const mysqlPort = docker(['inspect', '--format', '{{(index (index .NetworkSettings.Ports "3306/tcp") 0).HostPort}}', mysqlContainer]);
  const hostDatabaseUrl = `mysql://root:${mysqlPassword}@127.0.0.1:${mysqlPort}/${database}`;
  npm(['--workspace', '@videoplayer/content-media', 'run', 'db:migrate'], { cwd: '../..', env: { ...process.env, CONTENT_DATABASE_URL: hostDatabaseUrl }, stdio: 'inherit' });
  npm(['--workspace', '@videoplayer/content-media', 'run', 'db:fixture'], { cwd: '../..', env: { ...process.env, CONTENT_DATABASE_URL: hostDatabaseUrl }, stdio: 'inherit' });

  const containerDatabaseUrl = `mysql://root:${mysqlPassword}@${mysqlContainer}:3306/${database}`;
  docker([
    'run',
    '--detach',
    '--rm',
    '--name',
    container,
    '--network',
    network,
    '--publish',
    '127.0.0.1::3000',
    '-e',
    'GIT_SHA=container-smoke',
    '-e',
    `CONTENT_DATABASE_URL=${containerDatabaseUrl}`,
    image,
  ]);

  const port = docker(['inspect', '--format', '{{(index (index .NetworkSettings.Ports "3000/tcp") 0).HostPort}}', container]);
  const baseUrl = `http://127.0.0.1:${port}`;
  const live = await waitFor(`${baseUrl}/health/live`);
  const ready = await waitFor(`${baseUrl}/health/ready`);
  const version = await waitFor(`${baseUrl}/version`);
  const versionBody = await version.json();
  if (versionBody?.data?.version !== 'container-smoke') throw new Error('version endpoint did not expose GIT_SHA');
  if (!live.ok || !ready.ok) throw new Error('health endpoint check failed');

  docker(['exec', container, 'ffprobe', '-version']);
  docker(['exec', container, 'ffmpeg', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=16x16:d=0.1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '/tmp/valid.mp4']);
  docker([
    'exec',
    container,
    'node',
    '--input-type=module',
    '-e',
    "import { readFile } from 'node:fs/promises'; import { probeVideoStream } from './dist/service.js'; const bytes = await readFile('/tmp/valid.mp4'); const result = await probeVideoStream({ filename: 'valid.mp4', mimeType: 'video/mp4', bytes }); if (!result.ok) throw new Error(result.reason);",
  ]);
  process.stdout.write(`content-media container verification passed at ${baseUrl}\n`);
} finally {
  try {
    docker(['rm', '--force', container]);
  } catch {
    // The container may not have started; there is nothing to clean up.
  }
  try {
    docker(['rm', '--force', mysqlContainer]);
  } catch {
    // The database container may not have started; there is nothing to clean up.
  }
  try {
    docker(['network', 'rm', network]);
  } catch {
    // Docker may already have removed the transient network.
  }
}
