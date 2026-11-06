"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { ReportEditor } from "@/components/report-editor";
import { ReportPreview } from "@/components/report-preview";
import type { FormatResult, ReportPreset } from "@/lib/format/types";

export type FormatStatus = "idle" | "loading" | "error" | "success";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFormatResult(value: unknown): value is FormatResult {
  if (!isRecord(value)) return false;
  if (typeof value.html !== "string") return false;
  if (!Array.isArray(value.warnings)) return false;
  if (!value.warnings.every((warning) => typeof warning === "string")) return false;

  const meta = value.meta;
  if (!isRecord(meta)) return false;

  return (
    typeof meta.provider === "string" &&
    typeof meta.model === "string" &&
    typeof meta.usedFallback === "boolean" &&
    typeof meta.durationMs === "number" &&
    typeof meta.characters === "number" &&
    typeof meta.lines === "number" &&
    typeof meta.blocks === "number"
  );
}

function getApiErrorMessage(value: unknown): string | null {
  if (!isRecord(value)) return null;
  const error = value.error;
  if (!isRecord(error)) return null;
  if (typeof error.message !== "string") return null;
  const message = error.message.trim();
  return message.length > 0 ? message : null;
}

async function requestFormat(
  text: string,
  preset: ReportPreset,
  signal: AbortSignal,
): Promise<FormatResult> {
  const response = await fetch("/api/format", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, preset }),
    signal,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(payload) ?? "Não foi possível formatar o laudo. Tente novamente.",
    );
  }

  if (!isFormatResult(payload)) {
    throw new Error("O servidor retornou uma resposta inesperada.");
  }

  return payload;
}

export function FormatWorkbench() {
  const [text, setText] = useState("");
  const [preset, setPreset] = useState<ReportPreset>("generico");
  const [status, setStatus] = useState<FormatStatus>("idle");
  const [result, setResult] = useState<FormatResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  function resetResult() {
    setResult(null);
    setErrorMessage(null);
    setStatus("idle");
  }

  function handleTextChange(value: string) {
    setText(value);
    if (status === "success") {
      resetResult();
    }
  }

  function handlePresetChange(value: ReportPreset) {
    setPreset(value);
    if (status === "success") {
      resetResult();
    }
  }

  function handleClear() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setText("");
    resetResult();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "loading" || text.trim().length === 0) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setStatus("loading");
    setResult(null);
    setErrorMessage(null);

    try {
      const formatted = await requestFormat(text, preset, controller.signal);
      setResult(formatted);
      setStatus("success");
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível formatar o laudo. Tente novamente.",
      );
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    }
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
      <section
        aria-labelledby="entrada-titulo"
        className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 id="entrada-titulo" className="mb-4 text-lg font-semibold">
          Entrada
        </h2>
        <ReportEditor
          text={text}
          preset={preset}
          status={status}
          errorMessage={errorMessage}
          onChange={handleTextChange}
          onPresetChange={handlePresetChange}
          onClear={handleClear}
          onSubmit={handleSubmit}
        />
      </section>

      <section
        aria-labelledby="resultado-titulo"
        aria-busy={status === "loading"}
        className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2 id="resultado-titulo" className="mb-4 text-lg font-semibold">
          Resultado
        </h2>
        <ReportPreview status={status} result={result} />
      </section>
    </div>
  );
}
