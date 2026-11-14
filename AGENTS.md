<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Instruções permanentes — laudo-format

Leia, nesta ordem, antes de alterar código:

1. `AGENTS.md` (este arquivo)
2. `PROGRESS.md` (estado real e próxima tarefa)
3. `ROADMAP.md` (etapas e checkboxes)
4. `SPEC.md` (requisitos funcionais e não funcionais)
5. `docs/RULES.md` (regras de formatação)
6. `docs/ARCHITECTURE.md` e `docs/API.md` (contratos e fluxo)
7. `docs/COMMITS.md` (política de commits)

## 0. Ritmo de trabalho

- Execute **uma tarefa por vez**. Não implemente várias etapas do roadmap no mesmo turno.
- O máximo permitido é um conjunto lógico de microtarefas da mesma etapa (por exemplo: arquivo principal, teste e ajuste de tipo).
- Ao concluir a tarefa, pare, verifique, atualize `PROGRESS.md` e marque no `ROADMAP.md` apenas o que foi efetivamente concluído.
- Se o pedido abranger várias etapas, divida em entregas sucessivas e confirme o escopo da próxima antes de continuar.
- Não antecipe etapas futuras, não faça refatorações amplas e não misture commits de etapas diferentes.

## 1. Invariantes inegociáveis

Estas regras valem para qualquer alteração, incluindo refatorações e testes:

1. **Nunca alterar conteúdo clínico.** Palavras, números, pontuação, acentuação e ordem das linhas devem ser preservados. O renderizador usa sempre o texto original segmentado.
2. **A IA não devolve o laudo formatado.** A IA devolve apenas `lineIds`, tipos de bloco, spans de itálico e avisos. Ela nunca devolve HTML final nem texto reescrito.
3. **Toda sugestão da IA é validada contra o texto original.** Linhas ausentes, duplicadas, fora de ordem, IDs inválidos, spans sobrepostos ou fora dos limites devem ser corrigidos ou descartados em `src/lib/format/validate.ts`.
4. **A serialização aceita somente `<b>`, `</b>`, `<i>`, `</i>` e `<br>`.** Não introduzir `<p>`, `<h1>`, `<ul>`, atributos, classes ou estilos.
5. **Escapar antes de inserir tags.** `<`, `>`, `&`, `"` e `'` devem ser escapados por `escapeHtml`.
6. **Não gerar diagnóstico, interpretação, resumo, tradução ou recomendação clínica.** A IA só pode sugerir estrutura, destaque e correções ortográficas.
7. **Correção ortográfica é opt-in.** Nenhuma sugestão é aplicada automaticamente; o usuário precisa clicar em “Aplicar”.
8. **Não persistir nem logar o texto do laudo.** Sem banco, `localStorage`, analytics com conteúdo, logs de payload ou cache de relatório.
9. **Não usar dados reais de pacientes** no demo, fixtures, prints, testes ou documentação. Todos os exemplos são fictícios.
10. **Preservação de conteúdo é testável.** Remover tags e decodificar entidades deve reproduzir a sequência de caracteres não brancos do texto normalizado.

Se uma tarefa parecer exigir violar qualquer invariante, pare e registre a dúvida em `PROGRESS.md`; não improvise.

## 2. Stack e comandos

- Next.js `16.4.5` (App Router, Turbopack), React `19.3`, TypeScript strict, Tailwind 4.
- AI SDK `7` com `@ai-sdk/google` (`gemini-3.8-flash` por padrão), Zod `4`.
- Upstash rate limit (opcional), Vitest 5, Playwright 1.65.
- Windows/PowerShell: `npm.ps1` é bloqueado. Use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:unit -- --run
npm.cmd run test:coverage
npm.cmd run build
npm.cmd run test:e2e
```

- Antes de cada commit: `lint`, `typecheck` e testes aplicáveis verdes.
- Antes de push: `lint`, `typecheck`, `test`, `build`; árvore limpa; CI local verde.
- Não usar `--no-verify`, não reescrever commits já enviados e não commitar segredos.

## 3. Organização do código

- `src/lib/format/`: domínio puro, sem imports de React/Next. Tipos, segmentação, heurísticas, validação, renderização e invariantes.
- `src/lib/ai/`: único lugar que importa SDK do provedor. Prompt, schema, provider e orquestração.
- `src/config/report-rules.ts`: presets e regras centralizadas (`generico`, `citologia`).
- `src/lib/env.ts`: leitura e normalização de variáveis de ambiente. Segredos nunca em `NEXT_PUBLIC_*`.
- `src/app/api/*/route.ts`: validação da requisição, erros HTTP, rate limit e chamada ao domínio/IA. Não colocar regra de formatação na rota.
- `src/components/` e `src/app/page.tsx`: UI em pt-BR, acessível e responsiva.
- `src/data/samples.ts`: laudos fictícios usados pela UI, docs e testes.
- Aliases: `@/*` aponta para `src/*`.

### Regras para a camada de IA

- A IA recebe ids e texto das linhas segmentadas e o preset.
- O schema Zod deve continuar restrito a IDs, tipos, spans e avisos.
- `temperature: 0`, orçamento de 20 s compartilhado entre `AI_MODEL` e
  `AI_FALLBACK_MODELS`, `maxRetries: 0` por tentativa e fallback heurístico.
- Falha da IA, ausência de chave, mock e timeout retornam HTTP 200 com `usedFallback: true` e aviso em pt-BR.
- Não expor mensagens internas do provedor, chaves, stack traces ou payloads nos erros.
- `ALLOW_MOCK_AI=true` só em desenvolvimento/teste; nunca em produção pública.

### Regras para a camada de API

- Limites: 20.000 caracteres, 500 linhas não vazias, 64 KiB por requisição.
- Rate limit por IP hasheado com `IP_HASH_SALT`: 10 formatações/min e 5 ortografias/min.
- Respostas de erro em JSON consistente, com `code`, `message` e status adequado.
- `429` deve incluir `Retry-After`; o texto do laudo nunca aparece em logs.
- `maxDuration = 30` na função de formatação.

## 4. Convenções de produto e UI

- Interface, mensagens, avisos e documentação de usuário em **pt-BR**.
- Código, nomes de arquivos, commits, comentários técnicos e mensagens de erro internas em **inglês**.
- Título e seções em negrito; campos como `<b>Rótulo:</b> valor`; parágrafos unidos por espaço; no máximo uma linha em branco consecutiva; sem `<br>` no início/fim.
- Itálico só para termos validados (ex.: microrganismos), no máximo 50 spans.
- Aviso de privacidade visível na primeira visita, sem bloquear o uso do demo.
- Acessibilidade: labels, foco visível, `aria-live` para status e contraste adequado.
- Mobile: painéis empilham, sem overflow horizontal.

## 5. Commits e documentação

- Conventional Commits, assunto em inglês, imperativo, até 72 caracteres, uma mudança lógica por commit.
- Testes da mudança entram no mesmo commit; suítes transversais podem ficar em commit próprio.
- Atualizar `PROGRESS.md` e `ROADMAP.md` ao concluir uma etapa relevante.
- Não marcar checkbox como concluído sem verificar código, testes e build aplicáveis.
- Não remover o bloco `BEGIN:nextjs-agent-rules`; ele é regenerado pelo `next dev`.
- Não criar README ou documentação extra sem necessidade; a documentação canônica está listada no topo.

## 6. Estado atual e continuidade

O estado detalhado, arquivos implementados e a próxima tarefa exata estão em `PROGRESS.md`. Resumo:

- Etapas 1–20 commitadas.
- Etapa 17 (samples fictícios, seletor de exemplo e aviso de privacidade) foi concluída em `3bc54e2`.
- A etapa 18 adicionou `/api/spellcheck`; a etapa 19 adicionou o painel de ortografia com “Aplicar” e “Ignorar”; a etapa 20 adicionou testes de integração das rotas. Testes E2E, CI, README final com URL de demo e configuração de deploy ainda não existem.

Ao retomar, siga a “Próxima tarefa exata” de `PROGRESS.md`. A próxima tarefa é a etapa 21; não comece a etapa 22 antes de concluí-la.

## 7. Quirks conhecidos

- `next dev` regenera o bloco Next.js deste arquivo; mantenha-o no diff.
- Vitest emite avisos sobre config ESM carregada como CJS e sobre `vite-tsconfig-paths`; não são falhas. A limpeza é opcional.
- `core.autocrlf=true` no Windows, mas `.gitattributes` força LF; commits devem manter LF.
- O `npm.ps1` é bloqueado pela política do PowerShell; use `npm.cmd`.
- Sem `GOOGLE_GENERATIVE_AI_API_KEY`, o modo esperado é fallback heurístico (HTTP 200).
- O build atual passa; `POST /api/format` e `POST /api/spellcheck` existem com rate limit e limite de 64 KiB e a UI consome as duas rotas, com abas de preview/HTML, copiar/baixar, samples, aviso de privacidade e painel de ortografia com “Aplicar” e “Ignorar”. Os handlers das duas rotas têm testes de integração; testes E2E ainda não existem.
- Sem Upstash, o rate limit usa memória por instância (comportamento esperado em dev).
- Com `cacheComponents` ativo, não exportar `runtime` em Route Handlers; o runtime Node.js é o padrão.
- `docs/API.md` e `docs/ARCHITECTURE.md` descrevem o alvo; confirme o que já existe em `PROGRESS.md`.
