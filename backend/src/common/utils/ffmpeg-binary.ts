import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';

const optionalRequire = createRequire(__filename);
const execFileAsync = promisify(execFile);

// These packages are convenient, but we still need to boot cleanly when they are absent.
const ffmpegStatic = loadOptionalModule<string>('ffmpeg-static');
const ffprobeStatic = loadOptionalModule<{ path?: string }>('ffprobe-static');

export type FfmpegBinaryEnvKey = 'FFMPEG_PATH' | 'FFPROBE_PATH';
export type FfmpegBinaryName = 'ffmpeg' | 'ffprobe';

export function getBinaryCandidates(envKey: FfmpegBinaryEnvKey, defaultName: FfmpegBinaryName) {
  const configured = process.env[envKey]?.trim();
  const bundled = getBundledBinaryPath(defaultName);
  const homebrewName = defaultName === 'ffmpeg' ? '/opt/homebrew/bin/ffmpeg' : '/opt/homebrew/bin/ffprobe';
  const usrLocalName = defaultName === 'ffmpeg' ? '/usr/local/bin/ffmpeg' : '/usr/local/bin/ffprobe';

  return Array.from(new Set([configured, bundled, defaultName, homebrewName, usrLocalName].filter(Boolean) as string[]));
}

export async function findWorkingBinary(candidates: string[]) {
  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, ['-version']);
      return candidate;
    } catch {
      // Try the next configured binary candidate.
    }
  }

  return null;
}

function loadOptionalModule<T>(moduleName: string): T | null {
  try {
    return optionalRequire(moduleName) as T;
  } catch (error) {
    if (isModuleNotFoundError(error, moduleName)) {
      return null;
    }

    throw error;
  }
}

function isModuleNotFoundError(error: unknown, moduleName: string) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as NodeJS.ErrnoException;
  return err.code === 'MODULE_NOT_FOUND' && typeof err.message === 'string' && err.message.includes(moduleName);
}

function getBundledBinaryPath(binaryName: FfmpegBinaryName) {
  if (binaryName === 'ffmpeg') {
    return typeof ffmpegStatic === 'string' && ffmpegStatic.trim() ? ffmpegStatic : undefined;
  }

  return ffprobeStatic?.path?.trim() || undefined;
}
