"use client";

import { useState } from "react";

export function PrivacyNotice() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <aside
      aria-labelledby="aviso-privacidade-titulo"
      className="mb-4 rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm text-sky-950 sm:p-5 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 id="aviso-privacidade-titulo" className="font-semibold">
            Privacidade e uso do demo
          </h2>
          <p>
            Este demo é apenas para laudos fictícios. Não use dados reais de pacientes. O texto é
            processado em memória para gerar a formatação e não é salvo pela aplicação, em logs ou
            no navegador.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-sky-400 px-3 py-1.5 text-xs font-medium text-sky-950 transition-colors hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-900 dark:border-sky-700 dark:text-sky-100 dark:hover:bg-sky-900 dark:focus-visible:outline-sky-100"
        >
          Entendi
        </button>
      </div>
    </aside>
  );
}
