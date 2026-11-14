import { env } from "@/lib/env";

import { describeProviderError, isRetryableProviderError } from "./diagnostics";

const TOTAL_BUDGET_MS = 20_000;

export function modelCandidates(): string[] {
  const candidates = [env.aiModel, ...env.aiFallbackModels]
    .map((modelId) => modelId.trim())
    .filter(Boolean);

  return [...new Set(candidates)];
}

export interface ModelAttemptResult<T> {
  value: T;
  modelId: string;
}

/**
 * Runs the attempt against the primary model and falls back through
 * `AI_FALLBACK_MODELS` when the provider reports a retryable failure
 * (deprecated model, rate limit, outage or timeout).
 *
 * The whole chain shares a 20 s budget. Returns null when every model fails,
 * so callers can use the deterministic heuristic fallback.
 */
export async function runWithModelFallback<T>(
  attempt: (modelId: string, signal: AbortSignal) => Promise<T>,
): Promise<ModelAttemptResult<T> | null> {
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  for (const modelId of modelCandidates()) {
    const remainingMs = deadline - Date.now();

    if (remainingMs <= 1_000) {
      break;
    }

    try {
      const value = await attempt(modelId, AbortSignal.timeout(remainingMs));

      return { value, modelId };
    } catch (error) {
      console.error("[ai] model attempt failed", {
        model: modelId,
        ...describeProviderError(error),
      });

      if (!isRetryableProviderError(error)) {
        return null;
      }
    }
  }

  return null;
}
