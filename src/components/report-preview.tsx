import type { FormatResult } from "@/lib/format/types";

import type { FormatStatus } from "./format-workbench";

interface ReportPreviewProps {
  status: FormatStatus;
  result: FormatResult | null;
}

export function ReportPreview({ status, result }: ReportPreviewProps) {
  if (status === "loading") {
    return (
      <div aria-hidden="true" className="flex flex-col gap-3">
        <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Corrija o problema indicado ao lado e tente novamente.
      </p>
    );
  }

  if (!result) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">O laudo formatado aparecerá aqui.</p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {result.warnings.length > 0 ? (
        <ul className="list-disc space-y-1 rounded-lg border border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {result.warnings.map((warning, index) => (
            <li key={`${index}-${warning}`}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <div
        className="min-h-64 max-w-full overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed break-words whitespace-pre-wrap text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        dangerouslySetInnerHTML={{ __html: result.html }}
      />

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {result.meta.usedFallback
          ? "Classificação heurística (sem IA)"
          : `Classificação via ${result.meta.provider}`}
        {" · "}
        {result.meta.lines.toLocaleString("pt-BR")} linhas
        {" · "}
        {result.meta.durationMs.toLocaleString("pt-BR")} ms
      </p>
    </div>
  );
}
