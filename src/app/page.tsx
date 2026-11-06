import { FormatWorkbench } from "@/components/format-workbench";
import { PrivacyNotice } from "@/components/privacy-notice";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
          Formatador de laudos
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Cole o texto bruto de um laudo fictício, escolha o preset e gere um fragmento estruturado
          com apenas{" "}
          <code className="rounded bg-zinc-200/60 px-1 py-0.5 font-mono text-[0.85em] dark:bg-zinc-800">
            &lt;b&gt;
          </code>
          ,{" "}
          <code className="rounded bg-zinc-200/60 px-1 py-0.5 font-mono text-[0.85em] dark:bg-zinc-800">
            &lt;i&gt;
          </code>{" "}
          e{" "}
          <code className="rounded bg-zinc-200/60 px-1 py-0.5 font-mono text-[0.85em] dark:bg-zinc-800">
            &lt;br&gt;
          </code>
          . O conteúdo clínico não é reescrito.
        </p>
      </header>
      <PrivacyNotice />
      <FormatWorkbench />
    </main>
  );
}
