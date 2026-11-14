import { connection } from "next/server";

import { env, isGoogleConfigured, isUpstashConfigured } from "@/lib/env";
import { createRequestId, jsonResponse } from "@/lib/http";

export async function GET(): Promise<Response> {
  // Force runtime evaluation so the health check reflects the deployment env.
  await connection();

  return jsonResponse(
    {
      ok: true,
      aiProvider: env.aiProvider,
      aiModel: env.aiModel,
      aiFallbackModels: env.aiFallbackModels,
      googleConfigured: isGoogleConfigured(),
      upstashConfigured: isUpstashConfigured(),
      mockAllowed: env.allowMockAi,
    },
    200,
    createRequestId(),
  );
}
