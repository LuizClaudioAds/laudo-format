import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

import { env } from "@/lib/env";

export interface ProviderInfo {
  provider: string;
  model: string;
}

export function getProviderInfo(): ProviderInfo {
  return {
    provider: env.aiProvider,
    model: env.aiModel,
  };
}

export function createLanguageModel(): LanguageModel {
  switch (env.aiProvider) {
    case "google": {
      if (!env.googleApiKey) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY não configurada.");
      }

      const google = createGoogleGenerativeAI({ apiKey: env.googleApiKey });
      return google(env.aiModel);
    }
    case "mock": {
      throw new Error("O provider mock não utiliza modelo de linguagem.");
    }
    default: {
      throw new Error(`Provider de IA não suportado: ${env.aiProvider}`);
    }
  }
}
