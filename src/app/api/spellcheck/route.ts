import { spellcheckReport } from "@/lib/ai/spellcheck";
import { MAX_REQUEST_BYTES } from "@/lib/format/segment";
import {
  appErrorResponse,
  createRequestId,
  errorResponse,
  jsonResponse,
  readJsonBody,
  type ResponseHeaders,
} from "@/lib/http";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const requestId = createRequestId();
  const rate = await checkRateLimit("spell", request);
  const rateHeaders: ResponseHeaders = rateLimitHeaders(rate);

  if (!rate.ok) {
    return errorResponse(
      "RATE_LIMITED",
      429,
      "Limite de requisições excedido. Tente novamente em instantes.",
      requestId,
      { ...rateHeaders, "Retry-After": String(rate.retryAfter) },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return errorResponse(
      "UNSUPPORTED_MEDIA_TYPE",
      415,
      "Envie o corpo da requisição como application/json.",
      requestId,
      rateHeaders,
    );
  }

  let body: unknown;

  try {
    body = await readJsonBody(request, MAX_REQUEST_BYTES);
  } catch (error) {
    return appErrorResponse(error, requestId, { headers: rateHeaders });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return errorResponse(
      "INVALID_INPUT",
      400,
      "O corpo deve ser um objeto JSON.",
      requestId,
      rateHeaders,
    );
  }

  const { text } = body as { text?: unknown };

  if (typeof text !== "string") {
    return errorResponse("INVALID_INPUT", 400, "Informe text como string.", requestId, rateHeaders);
  }

  try {
    const result = await spellcheckReport(text);
    return jsonResponse(result, 200, requestId, rateHeaders);
  } catch (error) {
    return appErrorResponse(error, requestId, {
      headers: rateHeaders,
      fallbackMessage: "Não foi possível gerar sugestões ortográficas.",
    });
  }
}
