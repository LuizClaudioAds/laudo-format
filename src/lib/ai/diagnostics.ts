export interface ProviderErrorDetails {
  type: string;
  status?: number;
  code?: string;
}

/**
 * Extracts only non-sensitive provider error metadata for logs.
 * Never include the error message, prompt, request body or API key.
 */
export function describeProviderError(error: unknown): ProviderErrorDetails {
  if (!(error instanceof Error)) {
    return { type: typeof error };
  }

  const details: ProviderErrorDetails = { type: error.name || "Error" };
  const candidate = error as Error & { statusCode?: unknown; code?: unknown };

  if (typeof candidate.statusCode === "number") {
    details.status = candidate.statusCode;
  }

  if (typeof candidate.code === "string") {
    details.code = candidate.code;
  }

  return details;
}

const RETRYABLE_STATUS_CODES = new Set([404, 408, 429, 500, 502, 503, 504]);

/**
 * A retryable provider failure (deprecated model, rate limit, outage, timeout)
 * is a reason to try the next configured model instead of giving up.
 */
export function isRetryableProviderError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.name === "TimeoutError") {
    return true;
  }

  const statusCode = (error as Error & { statusCode?: unknown }).statusCode;

  return typeof statusCode === "number" && RETRYABLE_STATUS_CODES.has(statusCode);
}
