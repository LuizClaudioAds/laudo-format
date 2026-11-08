import type { SpellSuggestion } from "@/lib/format/types";

import type { SpellStatus } from "./format-workbench";

interface SuggestionsPanelProps {
  status: SpellStatus;
  suggestions: SpellSuggestion[];
  warnings: string[];
  error: string | null;
  disabled: boolean;
  onRequest: () => void;
  onApply: (suggestion: SpellSuggestion) => void;
  onIgnore: (suggestion: SpellSuggestion) => void;
}

function suggestionKey(suggestion: SpellSuggestion): string {
  return [
    suggestion.lineId,
    suggestion.start,
    suggestion.end,
    suggestion.original,
    suggestion.suggestion,
  ].join(":");
}

export function SuggestionsPanel({
  status,
  suggestions,
  warnings,
  error,
  disabled,
  onRequest,
  onApply,
  onIgnore,
}: SuggestionsPanelProps) {
  const isLoading = status === "loading";

  return (
    <section
      aria-labelledby="ortografia-titulo"
      className="mt-2 border-t border-zinc-200 pt-4 dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 id="ortografia-titulo" className="text-sm font-medium">
            Sugestões ortográficas
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Nada é alterado sem clique em “Aplicar”. As sugestões são opcionais.
          </p>
        </div>
        <button
          type="button"
          onClick={onRequest}
          disabled={disabled || isLoading}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100"
        >
          {isLoading ? "Buscando sugestões…" : "Sugerir correções"}
        </button>
      </div>

      <div aria-live="polite" className="mt-3 flex flex-col gap-3">
        {isLoading ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Analisando o texto em busca de correções…
          </p>
        ) : null}

        {warnings.length > 0 ? (
          <ul className="list-disc space-y-1 rounded-lg border border-amber-300 bg-amber-50 px-5 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {warnings.map((warning, index) => (
              <li key={`${index}-${warning}`}>{warning}</li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            {error}
          </p>
        ) : null}

        {status === "success" && suggestions.length === 0 ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Nenhuma sugestão de correção encontrada.
          </p>
        ) : null}

        {suggestions.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {suggestions.map((suggestion) => (
              <li
                key={suggestionKey(suggestion)}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="space-y-1">
                  <p className="break-words">
                    <span className="text-zinc-500 dark:text-zinc-400">Original: </span>
                    <span className="font-mono">{suggestion.original}</span>
                  </p>
                  <p className="break-words">
                    <span className="text-zinc-500 dark:text-zinc-400">Sugestão: </span>
                    <span className="font-mono font-medium">{suggestion.suggestion}</span>
                  </p>
                  {suggestion.reason ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{suggestion.reason}</p>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onApply(suggestion)}
                    disabled={disabled}
                    aria-label={`Aplicar sugestão: ${suggestion.original} para ${suggestion.suggestion}`}
                    className="inline-flex min-h-8 items-center justify-center rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:outline-zinc-100"
                  >
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={() => onIgnore(suggestion)}
                    disabled={disabled}
                    aria-label={`Ignorar sugestão: ${suggestion.original}`}
                    className="inline-flex min-h-8 items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100"
                  >
                    Ignorar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
