import { AppError, isAppError, type AppErrorCode } from "@/lib/errors";

export type ResponseHeaders = Record<string, string>;

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
  headers: ResponseHeaders = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "x-request-id": requestId,
      ...headers,
    },
  });
}

export function errorResponse(
  code: AppErrorCode,
  status: number,
  message: string,
  requestId: string,
  headers: ResponseHeaders = {},
): Response {
  return jsonResponse({ error: { code, message, requestId } }, status, requestId, headers);
}

export function appErrorResponse(
  error: unknown,
  requestId: string,
  options: { headers?: ResponseHeaders; fallbackMessage?: string } = {},
): Response {
  const headers = options.headers ?? {};

  if (isAppError(error)) {
    return errorResponse(error.code, error.status, error.message, requestId, headers);
  }

  return errorResponse(
    "INTERNAL_ERROR",
    500,
    options.fallbackMessage ?? "Não foi possível processar a requisição.",
    requestId,
    headers,
  );
}

function payloadTooLarge(maxBytes: number): AppError {
  return new AppError(
    "INPUT_TOO_LARGE",
    413,
    `O corpo da requisição excede o limite de ${maxBytes.toLocaleString("pt-BR")} bytes.`,
  );
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const contentLength = request.headers.get("content-length");

  if (contentLength !== null) {
    const declaredBytes = Number.parseInt(contentLength, 10);

    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw payloadTooLarge(maxBytes);
    }
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const reader = request.body?.getReader();

  if (reader) {
    try {
      for (;;) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (!value) {
          continue;
        }

        totalBytes += value.byteLength;

        if (totalBytes > maxBytes) {
          await reader.cancel().catch(() => undefined);
          throw payloadTooLarge(maxBytes);
        }

        chunks.push(value);
      }
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }

      throw new AppError("INVALID_JSON", 400, "Corpo JSON inválido ou ausente.");
    }
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(merged)) as unknown;
  } catch {
    throw new AppError("INVALID_JSON", 400, "Corpo JSON inválido ou ausente.");
  }
}
