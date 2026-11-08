"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { ReportEditor } from "@/components/report-editor";
import { ReportPreview } from "@/components/report-preview";
import { SuggestionsPanel } from "@/components/suggestions-panel";
import { SAMPLE_REPORTS } from "@/data/samples";
import type {
  FormatResult,
  ReportPreset,
  SpellCheckResult,
  SpellSuggestion,
} from "@/lib/format/types";
import { applySuggestion } from "@/lib/spell/apply";

export type FormatStatus = "idle" | "loading" | "error" | "success";

export type SpellStatus = "idle" | "loading" | "error" | "success";

interface SpellState {
  status: SpellStatus;
  suggestions: SpellSuggestion[];
  warnings: string[];
  error: string | null;
}

const EMPTY_SPELL_STATE: SpellState = {
  status: "idle",
  suggestions: [],
  warnings: [],
  error: null,
};

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

function isSpellSuggestion(value: unknown): value is SpellSuggestion {
  if (!isRecord(value)) return false;

  return (
    typeof value.lineId === "number" &&
    typeof value.start === "number" &&
    typeof value.end === "number" &&
    typeof value.original === "string" &&
    typeof value.suggestion === "string" &&
    (value.reason === undefined || typeof value.reason === "string") &&
    (value.confidence === undefined || typeof value.confidence === "number")
  );
}

function isSpellCheckResult(value: unknown): value is SpellCheckResult {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.suggestions) || !value.suggestions.every(isSpellSuggestion)) {
    return false;
  }
  if (!Array.isArray(value.warnings)) return false;
  if (!value.warnings.every((warning) => typeof warning === "string")) return false;

  const meta = value.meta;
  if (!isRecord(meta)) return false;

  return (
    typeof meta.provider === "string" &&
    typeof meta.model === "string" &&
    typeof meta.usedFallback === "boolean" &&
    typeof meta.durationMs === "number"
  );
}

function sameSuggestion(left: SpellSuggestion, right: SpellSuggestion): boolean {
  return (
    left.lineId === right.lineId &&
    left.start === right.start &&
    left.end === right.end &&
    left.original === right.original &&
    left.suggestion === right.suggestion
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

async function requestSpellcheck(text: string, signal: AbortSignal): Promise<SpellCheckResult> {
  const response = await fetch("/api/spellcheck", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(payload) ??
        "Não foi possível gerar sugestões ortográficas. Tente novamente.",
    );
  }

  if (!isSpellCheckResult(payload)) {
    throw new Error("O servidor retornou uma resposta inesperada.");
  }

  return payload;
}

export function FormatWorkbench() {
  const [text, setText] = useState("");
  const [preset, setPreset] = useState<ReportPreset>("generico");
  const [sampleId, setSampleId] = useState("");
  const [status, setStatus] = useState<FormatStatus>("idle");
  const [result, setResult] = useState<FormatResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [spellState, setSpellState] = useState<SpellState>(EMPTY_SPELL_STATE);
  const controllerRef = useRef<AbortController | null>(null);
  const spellControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      spellControllerRef.current?.abort();
    };
  }, []);

  function resetResult() {
    setResult(null);
    setErrorMessage(null);
    setStatus("idle");
  }

  function resetSpellState() {
    spellControllerRef.current?.abort();
    spellControllerRef.current = null;
    setSpellState(EMPTY_SPELL_STATE);
  }

  function handleTextChange(value: string) {
    setText(value);
    setSampleId("");
    resetSpellState();
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

  function handleSampleChange(value: string) {
    setSampleId(value);

    const sample = SAMPLE_REPORTS.find((entry) => entry.id === value);
    if (!sample) return;

    controllerRef.current?.abort();
    controllerRef.current = null;
    resetSpellState();
    setText(sample.text);
    setPreset(sample.preset);
    resetResult();
  }

  function handleClear() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    resetSpellState();
    setText("");
    setSampleId("");
    resetResult();
  }

  async function runFormat(nextText: string, nextPreset: ReportPreset) {
    if (nextText.trim().length === 0) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setStatus("loading");
    setResult(null);
    setErrorMessage(null);

    try {
      const formatted = await requestFormat(nextText, nextPreset, controller.signal);
      if (controller.signal.aborted) return;
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "loading" || text.trim().length === 0) return;

    await runFormat(text, preset);
  }

  async function handleSpellcheckRequest() {
    if (text.trim().length === 0 || spellState.status === "loading") return;

    spellControllerRef.current?.abort();
    const controller = new AbortController();
    spellControllerRef.current = controller;

    setSpellState({ status: "loading", suggestions: [], warnings: [], error: null });

    try {
      const spellcheck = await requestSpellcheck(text, controller.signal);
      if (controller.signal.aborted) return;

      setSpellState({
        status: "success",
        suggestions: spellcheck.suggestions,
        warnings: spellcheck.warnings,
        error: null,
      });
    } catch (error) {
      if (controller.signal.aborted) return;

      setSpellState({
        status: "error",
        suggestions: [],
        warnings: [],
        error:
          error instanceof Error && error.message
            ? error.message
            : "Não foi possível gerar sugestões ortográficas. Tente novamente.",
      });
    } finally {
      if (spellControllerRef.current === controller) {
        spellControllerRef.current = null;
      }
    }
  }

  function handleIgnoreSuggestion(target: SpellSuggestion) {
    setSpellState((previous) => ({
      ...previous,
      suggestions: previous.suggestions.filter((suggestion) => !sameSuggestion(suggestion, target)),
    }));
  }

  function handleApplySuggestion(target: SpellSuggestion) {
    const nextText = applySuggestion(text, target);

    if (nextText === null) {
      setSpellState((previous) => ({
        ...previous,
        status: "error",
        error:
          "Não foi possível aplicar a sugestão porque o texto mudou. Solicite novas sugestões.",
      }));
      return;
    }

    resetSpellState();
    setText(nextText);
    setSampleId("");
    resetResult();
    void runFormat(nextText, preset);
  }

  const isSpellDisabled =
    text.trim().length === 0 || status === "loading" || spellState.status === "loading";

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
          sampleId={sampleId}
          status={status}
          errorMessage={errorMessage}
          onChange={handleTextChange}
          onPresetChange={handlePresetChange}
          onSampleChange={handleSampleChange}
          onClear={handleClear}
          onSubmit={handleSubmit}
        />
        <SuggestionsPanel
          status={spellState.status}
          suggestions={spellState.suggestions}
          warnings={spellState.warnings}
          error={spellState.error}
          disabled={isSpellDisabled}
          onRequest={handleSpellcheckRequest}
          onApply={handleApplySuggestion}
          onIgnore={handleIgnoreSuggestion}
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
