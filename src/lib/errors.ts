export type AppErrorCode =
  | "INVALID_JSON"
  | "INVALID_INPUT"
  | "EMPTY_INPUT"
  | "INPUT_TOO_LARGE"
  | "TOO_MANY_LINES"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "AI_UNAVAILABLE"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, status: number, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Erro inesperado.";
}
