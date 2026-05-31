type ApiErrorLike = {
  code?: string;
  message?: string;
  name?: string;
  response?: {
    status?: number;
    data?: {
      message?: string | string[];
    };
  };
};

function asApiError(error: unknown) {
  return error as ApiErrorLike;
}

function collectErrorText(error: unknown) {
  const candidate = asApiError(error);
  const responseMessage = candidate.response?.data?.message;
  const parts: string[] = [];

  if (Array.isArray(responseMessage)) {
    parts.push(...responseMessage);
  } else if (typeof responseMessage === 'string') {
    parts.push(responseMessage);
  }

  if (candidate.message) {
    parts.push(candidate.message);
  }

  if (candidate.code) {
    parts.push(candidate.code);
  }

  if (candidate.name) {
    parts.push(candidate.name);
  }

  return parts.join(' ').toLowerCase();
}

export function resolveApiErrorMessage(error: unknown, fallback: string) {
  const candidate = asApiError(error);
  const responseMessage = candidate.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    return responseMessage.join(', ');
  }

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function isTimeoutLikeApiError(error: unknown) {
  const candidate = asApiError(error);
  const status = candidate.response?.status;

  if (candidate.code === 'ECONNABORTED' || candidate.code === 'ETIMEDOUT') {
    return true;
  }

  if (status === 408 || status === 504) {
    return true;
  }

  const text = collectErrorText(error);
  return text.includes('timeout') || text.includes('timed out');
}

export function isRecoverableUploadSubmissionError(error: unknown) {
  const status = asApiError(error).response?.status;
  return isTimeoutLikeApiError(error) || status === 502 || status === 503 || status === 504;
}
