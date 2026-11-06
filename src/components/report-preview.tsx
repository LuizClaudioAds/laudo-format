import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { FormatResult } from "@/lib/format/types";

import type { FormatStatus } from "./format-workbench";
import { HtmlOutput } from "./html-output";

type ResultTab = "preview" | "html";

const RESULT_TABS: Array<{ id: ResultTab; label: string }> = [
  { id: "preview", label: "Pré-visualização" },
  { id: "html", label: "HTML" },
];

const FEEDBACK_TIMEOUT_MS = 3000;
const DOWNLOAD_FILENAME = "laudo-formatado.html";

interface ReportPreviewProps {
  status: FormatStatus;
  result: FormatResult | null;
}

function tabButtonClassName(isActive: boolean): string {
  const base =
    "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100";

  if (isActive) {
    return `${base} border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100`;
  }

  return `${base} border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200`;
}

export function ReportPreview({ status, result }: ReportPreviewProps) {
  const [activeTab, setActiveTab] = useState<ResultTab>("preview");
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  function showFeedback(message: string) {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    setFeedback(message);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimeoutRef.current = null;
    }, FEEDBACK_TIMEOUT_MS);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = RESULT_TABS.findIndex((tab) => tab.id === activeTab);
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % RESULT_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + RESULT_TABS.length) % RESULT_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = RESULT_TABS.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    setActiveTab(RESULT_TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  async function handleCopy() {
    if (!result) return;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(result.html);
      showFeedback("HTML copiado para a área de transferência.");
    } catch {
      showFeedback("Não foi possível copiar. Selecione o HTML na aba HTML e copie manualmente.");
    }
  }

  function handleDownload() {
    if (!result) return;

    const blob = new Blob([result.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = DOWNLOAD_FILENAME;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showFeedback("Download do fragmento HTML iniciado.");
  }

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

      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <div role="tablist" aria-label="Modo de visualização" className="flex gap-1">
          {RESULT_TABS.map((tab, index) => {
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`resultado-aba-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`resultado-painel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={handleTabKeyDown}
                className={tabButtonClassName(isActive)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 pb-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100"
          >
            Copiar HTML
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100"
          >
            Baixar .html
          </button>
        </div>
      </div>

      <div
        role="tabpanel"
        id="resultado-painel-preview"
        aria-labelledby="resultado-aba-preview"
        tabIndex={0}
        hidden={activeTab !== "preview"}
        className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
      >
        <div
          className="min-h-64 max-w-full overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed break-words whitespace-pre-wrap text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          dangerouslySetInnerHTML={{ __html: result.html }}
        />
      </div>

      <div
        role="tabpanel"
        id="resultado-painel-html"
        aria-labelledby="resultado-aba-html"
        tabIndex={0}
        hidden={activeTab !== "html"}
        className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
      >
        <HtmlOutput html={result.html} />
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {result.meta.usedFallback
          ? "Classificação heurística (sem IA)"
          : `Classificação via ${result.meta.provider}`}
        {" · "}
        {result.meta.lines.toLocaleString("pt-BR")} linhas
        {" · "}
        {result.meta.durationMs.toLocaleString("pt-BR")} ms
      </p>

      <p
        role="status"
        aria-live="polite"
        className={feedback ? "text-xs text-zinc-700 dark:text-zinc-300" : "sr-only"}
      >
        {feedback ?? ""}
      </p>
    </div>
  );
}
