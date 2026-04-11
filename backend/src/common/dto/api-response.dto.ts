export interface ApiResponseDto<T> {
  code: number;
  message: string;
  data: T;
}

export function ok<T>(data: T, message = 'ok'): ApiResponseDto<T> {
  return {
    code: 0,
    message,
    data,
  };
}
