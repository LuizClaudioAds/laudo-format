import type { FormEvent } from "react";

import { REPORT_PRESETS, type ReportPreset } from "@/lib/format/types";

import type { FormatStatus } from "./format-workbench";

const PRESET_LABELS: Record<ReportPreset, string> = {
  generico: "Genérico",
  citologia: "Citologia",
};

function countNonEmptyLines(value: string): number {
  return value.split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0).length;
}

interface ReportEditorProps {
  text: string;
  preset: ReportPreset;
  status: FormatStatus;
  errorMessage: string | null;
  onChange: (value: string) => void;
  onPresetChange: (preset: ReportPreset) => void;
  onClear: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function ReportEditor({
  text,
  preset,
  status,
  errorMessage,
  onChange,
  onPresetChange,
  onClear,
  onSubmit,
}: ReportEditorProps) {
  const isBusy = status === "loading";
  const isEmpty = text.trim().length === 0;
  const characters = text.length;
  const lines = countNonEmptyLines(text);

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="laudo-texto" className="text-sm font-medium">
            Texto do laudo
          </label>
          <span
            id="laudo-contagem"
            className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400"
          >
            {characters.toLocaleString("pt-BR")} caracteres · {lines.toLocaleString("pt-BR")} linhas
          </span>
        </div>
        <textarea
          id="laudo-texto"
          value={text}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby="laudo-dica laudo-contagem"
          disabled={isBusy}
          rows={14}
          placeholder="Cole aqui o texto bruto do laudo…"
          className="min-h-64 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm leading-relaxed text-zinc-900 shadow-inner outline-none placeholder:text-zinc-400 focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600"
        />
        <p id="laudo-dica" className="text-xs text-zinc-500 dark:text-zinc-400">
          Limites: 20.000 caracteres e 500 linhas não vazias.
        </p>
      </div>

      <fieldset disabled={isBusy} className="min-w-0">
        <legend className="mb-2 text-sm font-medium">Preset</legend>
        <div className="flex flex-wrap gap-4">
          {REPORT_PRESETS.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200"
            >
              <input
                type="radio"
                name="preset"
                value={option}
                checked={preset === option}
                onChange={() => onPresetChange(option)}
                className="h-4 w-4 accent-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:accent-zinc-100"
              />
              {PRESET_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {errorMessage}
        </p>
      ) : null}

      <p role="status" aria-live="polite" className="sr-only">
        {status === "loading" ? "Formatando laudo." : null}
        {status === "success" ? "Laudo formatado." : null}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isBusy || isEmpty}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:outline-zinc-100"
        >
          {isBusy ? "Formatando…" : "Formatar laudo"}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={isBusy}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100"
        >
          Limpar
        </button>
      </div>
    </form>
  );
}
