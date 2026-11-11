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
