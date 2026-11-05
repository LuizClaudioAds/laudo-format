import { isAppError, type AppErrorCode } from "@/lib/errors";
import { formatReport } from "@/lib/format/pipeline";
import { REPORT_PRESETS, type ReportPreset } from "@/lib/format/types";

export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" } as const;

function jsonResponse(body: unknown, status: number, requestId: string): Response {
  return Response.json(body, {
    status,
    headers: { ...NO_STORE, "x-request-id": requestId },
  });
}

function errorResponse(
  code: AppErrorCode,
  status: number,
  message: string,
  requestId: string,
): Response {
  return jsonResponse({ error: { code, message, requestId } }, status, requestId);
}

function parsePreset(value: unknown): ReportPreset | null {
  if (value === undefined) {
    return "generico";
  }

  if (typeof value === "string" && (REPORT_PRESETS as readonly string[]).includes(value)) {
    return value as ReportPreset;
  }

  return null;
}

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return errorResponse(
      "UNSUPPORTED_MEDIA_TYPE",
      415,
      "Envie o corpo da requisição como application/json.",
      requestId,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", 400, "Corpo JSON inválido ou ausente.", requestId);
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return errorResponse("INVALID_INPUT", 400, "O corpo deve ser um objeto JSON.", requestId);
  }

  const { text, preset } = body as { text?: unknown; preset?: unknown };
  const resolvedPreset = parsePreset(preset);

  if (typeof text !== "string" || resolvedPreset === null) {
    return errorResponse(
      "INVALID_INPUT",
      400,
      "Informe text como string e preset válido.",
      requestId,
    );
  }

  try {
    const result = await formatReport(text, resolvedPreset);
    return jsonResponse(result, 200, requestId);
  } catch (error) {
    if (isAppError(error)) {
      return errorResponse(error.code, error.status, error.message, requestId);
    }

    return errorResponse("INTERNAL_ERROR", 500, "Não foi possível formatar o laudo.", requestId);
  }
}
