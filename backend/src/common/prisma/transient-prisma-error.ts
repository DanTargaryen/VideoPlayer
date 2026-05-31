import { Prisma } from '@prisma/client';

const TRANSIENT_PRISMA_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);
const TRANSIENT_PRISMA_MESSAGE_PARTS = [
  'server has closed the connection',
  'timed out',
  'timeout',
  'connection terminated',
  'connection reset',
  'connection refused',
];

export function getPrismaErrorCode(error: unknown) {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const candidate = error as { code?: unknown; errorCode?: unknown };
  if (typeof candidate.code === 'string') {
    return candidate.code;
  }

  if (typeof candidate.errorCode === 'string') {
    return candidate.errorCode;
  }

  return undefined;
}

export function getPrismaErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '';
}

export function isTransientPrismaError(error: unknown) {
  const code = getPrismaErrorCode(error);

  if (code && TRANSIENT_PRISMA_ERROR_CODES.has(code)) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  const message = getPrismaErrorMessage(error).toLowerCase();
  return TRANSIENT_PRISMA_MESSAGE_PARTS.some((part) => message.includes(part));
}
