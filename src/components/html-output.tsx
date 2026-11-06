interface HtmlOutputProps {
  html: string;
}

export function HtmlOutput({ html }: HtmlOutputProps) {
  return (
    <pre className="min-h-64 max-w-full overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      <code>{html}</code>
    </pre>
  );
}
