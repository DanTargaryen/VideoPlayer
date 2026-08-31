import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFile, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const [url, destination, sizeText, expectedSha, chunksText = '8'] = process.argv.slice(2);
const size = Number(sizeText);
const chunks = Number(chunksText);
if (!url || !destination || !Number.isSafeInteger(size) || size < 1 || !/^[a-f0-9]{64}$/.test(expectedSha ?? '') || !Number.isInteger(chunks) || chunks < 1 || chunks > 32) {
  throw new Error('Usage: node download-release-asset.mjs <url> <destination> <size> <sha256> [chunks]');
}

const directory = await mkdtemp(join(tmpdir(), 'release-asset-'));
try {
  const chunkSize = Math.ceil(size / chunks);
  const parts = await Promise.all(Array.from({ length: chunks }, async (_, index) => {
    const start = index * chunkSize;
    const end = Math.min(size - 1, start + chunkSize - 1);
    if (start > end) return null;
    const part = join(directory, `part-${String(index).padStart(2, '0')}`);
    await writeFile(part, Buffer.alloc(0));
    let downloaded = 0;
    let lastError;
    for (let attempt = 1; attempt <= 8 && downloaded < end - start + 1; attempt += 1) {
      const partial = `${part}.partial`;
      await rm(partial, { force: true });
      try {
        await run('curl', ['--fail', '--location', '--silent', '--show-error', '--connect-timeout', '30', '--max-time', '120', '--range', `${start + downloaded}-${end}`, '--output', partial, url], { maxBuffer: 1024 * 1024 });
        lastError = undefined;
      } catch (error) {
        lastError = error;
      }
      const bytes = await readFile(partial).catch(() => Buffer.alloc(0));
      const remaining = end - start + 1 - downloaded;
      assert(bytes.length <= remaining, `range ${start + downloaded}-${end} returned ${bytes.length} bytes for ${remaining} remaining`);
      if (bytes.length) {
        await appendFile(part, bytes);
        downloaded += bytes.length;
      }
      await rm(partial, { force: true });
      if (!bytes.length && attempt === 8 && lastError) throw lastError;
    }
    const bytes = await readFile(part);
    assert.equal(bytes.length, end - start + 1, `range ${start}-${end} returned ${bytes.length} bytes`);
    return bytes;
  }));
  const bytes = Buffer.concat(parts.filter(Boolean));
  assert.equal(bytes.length, size, `combined asset has ${bytes.length} bytes instead of ${size}`);
  const actualSha = createHash('sha256').update(bytes).digest('hex');
  assert.equal(actualSha, expectedSha, 'release asset checksum mismatch');
  const temporaryDestination = `${destination}.partial`;
  await writeFile(temporaryDestination, bytes, { mode: 0o755 });
  await rename(temporaryDestination, destination);
  process.stdout.write(`Downloaded ${size} bytes in ${chunks} verified ranges to ${destination}\n`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
