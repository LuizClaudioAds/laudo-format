# Progresso — laudo-format

Atualizado em: 2026-11-08
Branch: `main`
Último commit de código: `4e7db2f feat(api): add optional spelling suggestion endpoint`
Commit anterior: `c0c73d1 docs: record stage 17 completion and next task`
Remoto: `origin` configurado; `main` sincronizada com `origin/main` em 2026-11-08
(push concluído). Os commits das etapas 1–18 estão publicados.

## 0. Regra de trabalho para novas sessões

- Execute **uma tarefa por vez**. Não implemente várias etapas do roadmap no mesmo turno.
- O máximo permitido é um conjunto lógico de microtarefas da mesma etapa (por exemplo:
  arquivo principal, teste e ajuste de tipo).
- Ao concluir a tarefa, pare, verifique, atualize este arquivo e marque no `ROADMAP.md`
  apenas o que foi efetivamente concluído.
- Se o pedido abranger várias etapas, divida em entregas sucessivas e confirme o escopo
  da próxima antes de continuar.
- Não antecipe etapas futuras, não faça refatorações amplas e não misture commits de
  etapas diferentes.

## 1. Verificação executada nesta sessão

| Comando                          | Resultado                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `npm.cmd run test:unit -- --run` | 9 arquivos, **79 testes passando**                                                 |
| `npm.cmd run test:coverage`      | passou nos thresholds; 91,71% statements, 87,13% branches, 91,75% lines            |
| `npm.cmd run lint`               | passou                                                                             |
| `npm.cmd run typecheck`          | passou                                                                             |
| `npm.cmd run format:check`       | passou                                                                             |
| `npm.cmd run build`              | passou; `/` e `/_not-found` estáticas; `/api/format` e `/api/spellcheck` dinâmicas |
| `npm.cmd run test:e2e`           | não executado; browsers do Playwright não instalados e ainda não há testes E2E     |

Avisos não bloqueantes do Vitest:

- `vitest.config.ts` usa sintaxe ESM carregada como CJS.
- Plugin `vite-tsconfig-paths` é sugerido substituir por `resolve.tsconfigPaths`.

Smoke test manual com `next start` na porta 3100 (após `npm.cmd run build`):

- corpo de 80.000 bytes → `413 INPUT_TOO_LARGE` (“corpo da requisição … 65.536 bytes”);
- requisição válida → `200` com `X-RateLimit-Remaining`, `x-request-id` e `Cache-Control: no-store`;
- 11ª requisição no minuto → `429 RATE_LIMITED` com `Retry-After: 60`;
- `GET /` → `200` com `lang="pt-BR"`, título “Formatador de laudos”, `#laudo-texto`,
  preset “Citologia”, aviso de privacidade, `#laudo-exemplo` e a opção “Citologia
  cervicovaginal”; `POST /api/format` → `200` com `usedFallback: true`;
- bundle cliente contém as ações “Copiar HTML” e “Baixar .html” (verificado no build).

Smoke test da etapa 18 com `next start` na porta 3113 (`AI_PROVIDER=mock` e
`ALLOW_MOCK_AI=true`):

- `POST /api/spellcheck` válido → `200` com `suggestions: []`, warning de modo mock,
  `meta.usedFallback: true`, `Cache-Control: no-store`, `x-request-id` e
  `X-RateLimit-Limit: 5`;
- corpo inválido → `400 INVALID_JSON` com o mesmo envelope de erro e headers de rate
  limit.

## 2. Etapa atual

A etapa 18 (`feat(api): add optional spelling suggestion endpoint`) está **implementada,
verificada e commitada** em `4e7db2f`. Foram adicionados:

- `src/lib/spell/suggest.ts`: reparo de sugestões contra o texto original, descartando
  `lineId` inválido, offsets fora da linha ou não inteiros, `original` divergente,
  trecho em branco, sugestão igual ao original, sobreposições e excesso de 20 sugestões.
- `src/lib/ai/spellcheck.ts`: orquestração com `generateObject`, `temperature: 0`,
  timeout de 20 s, `maxRetries: 1`, modo mock e fallback para `suggestions: []` com
  aviso em pt-BR; valida a resposta e preenche `meta`.
- `src/app/api/spellcheck/route.ts`: `POST` com `maxDuration = 30`, rate limit de 5/min
  por IP hasheado, limite de 64 KiB via `readJsonBody`, headers `X-RateLimit-*`,
  `Retry-After` no `429`, `Cache-Control: no-store` e o mesmo envelope de erro.
- `tests/unit/spell.test.ts`: 11 testes de validação, limite de sugestões, modo mock,
  falha do provider e propagação de entrada vazia.

O `POST /api/format` continua com rate limit de 10/min, limite de 64 KiB e os mesmos
helpers HTTP. A UI ainda não consome a rota de ortografia; o painel com “Aplicar” e
“Ignorar” é a etapa 19.

## 3. Implementado e commitado

Commits existentes:

`7fc06f5`, `1d9e2c2`, `d87217f`, `4b79573`, `ed44ff8`, `aafd77a`, `4e70a5e`,
`ab7f9e7`, `16f94e8`, `ac6f905`, `14e7066`, `79bdc5a`, `a431fa1`, `e749a4a`,
`33b76f3`, `7232103`, `3bc54e2`.

Arquivos implementados:

- `src/lib/format/types.ts`: presets, tipos de bloco, `SourceLine`, `ClassifiedReport`,
  `FormatResult`, `SpellSuggestion` e metadados.
- `src/lib/format/segment.ts`: normalização NFC/CRLF, segmentação em linhas não vazias,
  IDs e offsets, limites `MAX_CHARACTERS=20000`, `MAX_LINES=500`,
  `MAX_REQUEST_BYTES=64*1024`.
- `src/config/report-rules.ts`: presets `generico` e `citologia`, palavras-chave,
  regras de espaçamento e listas.
- `src/lib/text.ts`: reconhecimento de campo, rótulos, marcadores de lista e chaves.
- `src/lib/format/render.ts`: renderizador determinístico; escape de `&<>"'`; apenas
  `<b>`, `<i>` e `<br>`.
- `src/lib/format/heuristics.ts`: classificador heurístico de fallback.
- `src/lib/format/invariants.ts`: utilitários de teste para remover tags, decodificar
  entidades e comparar conteúdo não branco.
- `src/lib/env.ts`: leitura de `AI_PROVIDER`, `AI_MODEL`, chave Google, Upstash,
  `IP_HASH_SALT`, limites e `NEXT_PUBLIC_APP_URL`; `isMockMode()` exige
  `AI_PROVIDER=mock` **e** `ALLOW_MOCK_AI=true`.
- `src/lib/http.ts`: `createRequestId`, `jsonResponse`, `errorResponse`,
  `appErrorResponse` (fallback genérico sem vazar detalhes internos) e `readJsonBody`,
  que verifica `content-length` e cancela a leitura ao ultrapassar o teto de bytes.
- `src/lib/rate-limit.ts`: `checkRateLimit` com Upstash (`Ratelimit.fixedWindow`) e
  fallback em memória por instância; chave `kind:sha256(IP + IP_HASH_SALT)`;
  `getClientIp`, `hashClientIp` e `rateLimitHeaders`.
- `src/lib/ai/provider.ts`: factory de modelo e metadados do provider.
- `src/lib/ai/schema.ts`: schema Zod restrito a blocos, IDs, spans e avisos.
- `src/lib/ai/prompt.ts`: prompt de sistema de classificação em pt-BR, builder do
  prompt do usuário e prompt de ortografia.
- `src/lib/format/validate.ts`: reparo da classificação; linhas ausentes recebem
  heurística; IDs inválidos/duplicados são descartados; parágrafos consecutivos são
  agrupados; spans de itálico são validados, ordenados por linha, sem sobreposição,
  dentro do texto e limitados a 50.
- `src/lib/ai/classify.ts`: `classifyReport()` com `generateObject`, `temperature: 0`,
  timeout de 20 s, `maxRetries: 1`, modo mock e fallback heurístico. Erros de IA são
  convertidos em resultado 200 com `usedFallback: true` e aviso em pt-BR.
- `src/lib/spell/suggest.ts`: `repairSuggestions()` valida sugestões contra as linhas
  originais; descarta `lineId` inválido, offsets fora dos limites ou não inteiros,
  `original` que não coincide, trecho em branco, sugestão igual ao original,
  sobreposições e sugestões além de 20; adiciona aviso quando algo é descartado.
- `src/lib/ai/spellcheck.ts`: `spellcheckReport()` segmenta o texto, aplica
  `generateObject` com `temperature: 0`, timeout de 20 s e `maxRetries: 1`, repara as
  sugestões e devolve `{ suggestions, warnings, meta }`; em modo mock ou falha do
  provider retorna `suggestions: []` com `usedFallback: true` e aviso em pt-BR.
- `src/app/api/spellcheck/route.ts`: `POST` com `maxDuration = 30`, rate limit de
  5/min por IP hasheado, `Content-Type` JSON, corpo limitado a 64 KiB, validação de
  `{ text }`, headers `X-RateLimit-*`, `Retry-After` no `429`, `Cache-Control: no-store`,
  `x-request-id` e mapeamento de `AppError` para o mesmo envelope de erro.
- `tests/unit/spell.test.ts`: 11 testes de sugestões válidas, IDs e offsets inválidos,
  original divergente, sugestão idêntica, trecho em branco, sobreposição, limite de 20,
  modo mock, falha do provider e entrada vazia.
- `src/lib/format/pipeline.ts`: `formatReport()` une `segmentInput` → `classifyReport` →
  `renderReport`, mede `durationMs` e preenche `meta` com provider, modelo,
  `usedFallback`, caracteres, linhas e blocos.
- `src/app/api/format/route.ts`: `POST` com `maxDuration = 30`, rate limit de 10/min
  antes do corpo, `Content-Type` JSON, corpo limitado a 64 KiB via `readJsonBody`,
  validação de `{ text, preset }`, headers `X-RateLimit-*` em todas as respostas,
  `Retry-After` no `429`, `Cache-Control: no-store`, header `x-request-id`, fallback 200
  e mapeamento de `AppError` para `{ error: { code, message, requestId } }`.
  O export `runtime` foi omitido porque `cacheComponents` está ativo; o runtime Node.js
  é o padrão e não aceita esse segment config.
- `tests/fixtures/reports.ts`: laudos fictícios.
- `tests/unit/segment.test.ts`, `heuristics.test.ts`, `render.test.ts`: 32 testes
  iniciais commitados.
- `tests/unit/validate.test.ts`: 5 testes de reparo, IDs inválidos/duplicados,
  agrupamento, spans e limite de 50 itálicos.
- `tests/unit/pipeline.test.ts`: 3 testes com `AI_PROVIDER=mock` e
  `ALLOW_MOCK_AI=true` cobrindo preservação de conteúdo, tags permitidas, espaçamento,
  metadados e propagação de erro de entrada.
- `tests/unit/http.test.ts`: 13 testes de envelopes JSON, headers, conversão de
  `AppError`, fallback 500 sem vazar detalhes e limites de corpo (`content-length`,
  leitura em stream, JSON inválido e corpo ausente).
- `tests/unit/rate-limit.test.ts`: 11 testes de IP, hash opaco, headers, janela em
  memória (limite, isolamento por IP e por tipo), mapeamento do Upstash (liberada,
  negada) e fallback em memória quando o Upstash falha; os mocks de `@upstash/*` ficam
  no próprio arquivo de teste.
- `src/components/format-workbench.tsx`: client component com o fluxo da UI, fetch de
  `POST /api/format`, `AbortController` para descartar respostas antigas, type guard do
  payload e invalidação do resultado quando texto ou preset mudam.
- `src/components/report-editor.tsx`: formulário com textarea, contagem de caracteres e
  linhas não vazias, presets `generico`/`citologia`, erro com `role="alert"`, status
  `aria-live` e botões formatar/limpar.
- `src/components/report-preview.tsx`: skeleton de carregamento, avisos, abas de
  pré-visualização/HTML com teclado, ações de copiar e baixar, feedback `aria-live` e
  metadados do resultado.
- `src/components/html-output.tsx`: aba somente leitura com o fragmento HTML exato,
  escapado pelo React e quebrado em várias linhas apenas visualmente.
- `src/data/samples.ts`: três laudos fictícios rotulados como exemplo, com preset
  associado e sem identificadores reais.
- `src/components/privacy-notice.tsx`: aviso de privacidade não bloqueante com
  “Entendi”; a dispensa vale só para a sessão atual e não usa storage.
- `tests/unit/samples.test.ts`: 4 testes de quantidade, ids/rótulos únicos, cobertura
  dos presets e segmentação válida dos samples.
- `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`: UI real em pt-BR,
  `lang="pt-BR"`, metadados do produto, grid de dois painéis e fontes do scaffold.
- `.env.example`, `vitest.config.ts`, `playwright.config.ts`, configs de lint,
  Prettier, commitlint, Husky e lint-staged.
- `SPEC.md` (movido de `docs/SPEC.md` nesta sessão), `docs/RULES.md`,
  `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/COMMITS.md`, `docs/DEPLOY.md`,
  `docs/adr/0001` a `0004`.

## 4. Nenhum código pendente de commit

A etapa 18 foi commitada em `4e7db2f` com `src/lib/spell/suggest.ts`,
`src/lib/ai/spellcheck.ts`, `src/app/api/spellcheck/route.ts` e
`tests/unit/spell.test.ts`. As atualizações de continuidade (`ROADMAP.md`,
`PROGRESS.md`, `AGENTS.md`, `docs/API.md` e `docs/ARCHITECTURE.md`) são commitadas
separadamente.

Os commits das etapas 12–18 (`79bdc5a`, `a431fa1`, `e749a4a`, `33b76f3`, `7232103`,
`3bc54e2`, `4e7db2f`) estão íntegros.

## 5. Ainda não implementado

- Painel de sugestões ortográficas na UI, com “Aplicar” e “Ignorar” (etapa 19).
- Testes de integração das rotas (etapa 20).
- Testes E2E e validação de acessibilidade/mobile em navegador real (etapa 21).
- `.github/workflows/ci.yml`.
- URL de demo pública no README; o README em pt-BR já cobre setup, arquitetura e
  privacidade.
- Configuração da Vercel e headers de segurança no `next.config.ts`.

## 6. Decisões técnicas tomadas

1. **Renderização determinística.** A IA só classifica; o HTML é produzido por código
   a partir das linhas originais. Isso impede reescrita clínica e torna a preservação
   auditável. Ver `docs/adr/0001-deterministic-renderer.md`.
2. **Provider agnóstico.** O SDK do provedor fica isolado em `src/lib/ai`; o resto do
   app consome tipos do domínio. Ver `docs/adr/0002-provider-agnostic.md`.
3. **Apenas três tags.** `<b>`, `<i>` e `<br>` são o contrato de saída; qualquer outra
   tag é proibida. Ver `docs/adr/0003-three-tags-output.md`.
4. **Validação com reparo, não rejeição total.** Respostas parciais da IA são
   corrigidas para preservar todas as linhas; o fallback heurístico cobre linhas
   ausentes. Spans inválidos são descartados.
5. **Fallback é caminho normal.** Sem chave, mock, timeout ou erro do provedor, a API
   deve responder 200 com `usedFallback: true`, nunca 5xx por indisponibilidade da IA.
6. **Privacidade por padrão.** Nenhum texto de laudo em log, banco, cache ou
   `localStorage`; rate limit por IP hasheado e limites de entrada. Ver
   `docs/adr/0004-rate-limit-and-privacy.md`.
7. **Presets centralizados.** `generico` e `citologia` vivem em
   `src/config/report-rules.ts`; a heurística e a renderização consultam o preset.
8. **Itálico conservador.** Somente spans validados, sem sobreposição, máximo 50.
9. **Mock explícito.** `ALLOW_MOCK_AI=true` só vale com `AI_PROVIDER=mock`; nunca em
   produção pública.
10. **Domínio puro.** `src/lib/format` não importa React/Next; a rota apenas valida a
    requisição e orquestra.
11. **Windows.** `npm.ps1` é bloqueado; todos os comandos usam `npm.cmd`.
12. **Documentação canônica na raiz.** `SPEC.md`, `ROADMAP.md`, `PROGRESS.md` e
    `AGENTS.md` ficam na raiz para continuidade; detalhes técnicos permanecem em
    `docs/`.
13. **Pipeline sem HTTP.** `formatReport` recebe texto e preset, mede duração e devolve
    `FormatResult`; a rota apenas valida a requisição, chama o pipeline e serializa a
    resposta. Nenhum `Request`/`Response` entra em `src/lib/format`.
14. **Sem `runtime` exportado.** Como `cacheComponents` está ativo no Next.js 16.4.5, a
    rota não exporta `runtime = "nodejs"`; o runtime Node.js é o padrão e o segment
    config não é suportado nesse modo.
15. **Rate limit fail-open.** Sem Upstash ou quando o Upstash falha, a requisição cai
    para o contador em memória por instância; indisponibilidade do rate limiter nunca
    gera 5xx.
16. **Corpo lido em stream com teto.** `readJsonBody` rejeita `content-length` acima do
    teto e cancela a leitura assim que ultrapassa 64 KiB, sem reter payload maior em
    memória e sem logar conteúdo algum.
17. **UI com um único client boundary.** `FormatWorkbench` é o único componente
    `"use client"`; editor e resultado são apresentacionais. O fetch usa
    `AbortController` para descartar respostas antigas e valida o payload com type
    guard antes de renderizar. O fragmento só é injetado com `dangerouslySetInnerHTML`
    porque o servidor já escapou o texto e restringiu as tags a `<b>`, `<i>` e `<br>`.
18. **Contagens na UI, limites na API.** A interface mostra caracteres e linhas não
    vazias e impede envio de texto vazio, mas os limites de 20.000 caracteres, 500
    linhas e 64 KiB continuam sendo impostos pelo servidor, que é a fonte de verdade.
    Editar texto ou preset depois de um resultado bem-sucedido limpa o resultado para
    evitar exibição desatualizada.
19. **Abas acessíveis e ações sem persistência.** O painel de resultado usa o padrão
    ARIA de abas com `aria-selected`, roving tabindex e setas/Home/End. “Copiar HTML”
    usa a Clipboard API e, se indisponível, orienta a cópia manual; “Baixar .html” cria
    um Blob em memória com exatamente `result.html` e revoga a object URL em seguida.
    Nenhum conteúdo é gravado em storage ou log.
20. **Samples explícitos e aviso sem storage.** Os três laudos de exemplo usam o nome
    “Exemplo Fictício” e registro zerado, e ajustam o preset ao serem carregados.
    Editar o texto ou limpar desfaz a seleção do exemplo. O aviso de privacidade pode
    ser dispensado apenas em memória; não se grava nem o texto nem a dispensa em
    `localStorage`/`sessionStorage`.

## 7. Problemas conhecidos e pontos de atenção

- **Push concluído.** `git push -u origin main` publicou a branch em 2026-11-08
  (`4e7db2f` e o commit de documentação). O remoto é
  `https://github.com/LuizClaudioAds/laudo-format.git`. Se a credencial expirar, repita
  o push em um terminal interativo e não deixe o comando pendurado em scripts.
- **Documentação à frente do código.** `docs/ARCHITECTURE.md` ainda lista
  `src/components/suggestions-panel.tsx`, que só existirá na etapa 19. O endpoint
  `/api/spellcheck` já corresponde ao código. Use este arquivo como fonte de verdade do
  estado real.
- **UI sem testes automatizados.** Os componentes foram verificados por lint,
  typecheck, build e smoke test (`GET /`, `POST /api/format`, aviso e samples no HTML),
  mas ainda não há testes de componente nem E2E; copiar/baixar, dispensa do aviso e
  carregamento de exemplo em navegador real ficam para a etapa 21.
- **Dispensa do aviso não persiste.** Recarregar a página mostra o aviso novamente;
  isso é intencional para não usar storage.
- **README em pt-BR, sem URL de demo publicada.**
- **API completa, UI de ortografia pendente.** `POST /api/format` e
  `POST /api/spellcheck` existem; o painel da etapa 19 é que ainda não consome as
  sugestões.
- **Rota sem teste de integração.** As etapas 13 e 14 cobrem pipeline, helpers HTTP e
  rate limit com testes unitários; a suíte de rotas em nível de HTTP (limites, erros,
  rate limit e fallback) fica para a etapa 20.
- **Rate limit em memória sem Upstash.** Em produção com várias instâncias o limite só
  é consistente com Upstash configurado (ADR 0004).
- **Cobertura da camada de IA.** `src/lib/ai` ainda tem cobertura individual baixa; os
  thresholds globais passam por causa do domínio. Testes de integração/mock são
  necessários na etapa 20.
- **Metadados de mock.** Em modo mock, `provider` vira `mock`, mas `model` continua
  vindo de `AI_MODEL` (por exemplo, `gemini-2.5-flash`). Normalizar para `heuristic`
  é uma melhoria opcional.
- **`classifyReport` engole o erro original.** Isso é intencional para não vazar
  detalhes do provedor, mas dificulta diagnóstico. Logs futuros devem ser sanitizados
  e nunca incluir o texto do laudo.
- **Sem `runtime` exportado na rota.** Com `cacheComponents` ativo, o Next.js 16.4.5
  não aceita o segment config `runtime`; o padrão já é Node.js.
- **Vitest warnings.** Config ESM/CJS e `vite-tsconfig-paths`; não falham. Limpeza
  opcional.
- **Playwright.** Browsers não instalados; E2E ainda não existe.
- **Sem chave Google/Upstash local.** O comportamento esperado é fallback heurístico.
- **`next.config.ts`** mantém `cacheComponents` e `partialPrefetching` do scaffold e
  ainda não tem headers de segurança.
- **`docs/SPEC.md` foi movido para `SPEC.md`** em sessão anterior; os links internos
  foram ajustados para `docs/RULES.md` e `docs/API.md`.

## 8. Próxima tarefa exata

### 8.1 Iniciar a etapa 19

Etapa 19 — `feat(ui): add spelling suggestions panel with explicit apply`:

- Criar `src/components/suggestions-panel.tsx` e integrá-lo ao `FormatWorkbench` com
  ação sob demanda “Sugerir correções” que chama `POST /api/spellcheck` com o texto
  atual do editor.
- Exibir cada sugestão com trecho original, sugestão e motivo; “Ignorar” remove apenas
  da lista, sem tocar no texto; “Aplicar” substitui o span exato no editor e solicita
  nova formatação.
- Mapear os offsets das linhas normalizadas de volta para o texto do editor antes de
  aplicar, preservando espaços, acentos e quebras originais; descartar a sugestão se o
  trecho já não coincidir.
- Estados de carregamento, erro e lista vazia; `aria-live`, foco visível, labels em
  pt-BR e layout empilhado no mobile. Nenhum texto ou sugestão em storage/log.

Entregar apenas essa etapa neste ciclo. Não iniciar os testes de rota/E2E (etapas 20 e 21) antes de concluir e registrar a etapa 19.

## 9. Comandos de verificação

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:unit -- --run
npm.cmd run test:coverage
npm.cmd run build
```

Antes de push:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
git status
git log --oneline
```

## 10. Mapa de arquivos atual

```text
AGENTS.md                  instruções permanentes + bloco Next.js
SPEC.md                    requisitos funcionais e não funcionais
ROADMAP.md                 etapas e checkboxes
PROGRESS.md                este arquivo
docs/API.md                contrato-alvo da API
docs/ARCHITECTURE.md       arquitetura-alvo e fluxo
docs/COMMITS.md            política e sequência de commits
docs/DEPLOY.md             guia de deploy
docs/RULES.md              regras de formatação
docs/adr/                  decisões arquiteturais
src/app/                   App Router; workbench pt-BR
src/app/api/format/        POST /api/format
src/app/api/spellcheck/    POST /api/spellcheck
src/components/            workbench, editor, preview, aviso e aba HTML
src/config/report-rules.ts presets e regras
src/data/samples.ts        laudos fictícios do seletor de exemplo
src/lib/env.ts             ambiente
src/lib/errors.ts          AppError
src/lib/http.ts            helpers JSON, erro e limite de corpo
src/lib/rate-limit.ts      rate limit Upstash + memória
src/lib/text.ts            helpers de texto
src/lib/ai/                provider, schema, prompt, classify, spellcheck
src/lib/spell/             validação de sugestões ortográficas
src/lib/format/            domínio, pipeline, heurística, render, validação, invariantes
tests/unit/                testes unitários (pipeline, spell, http e rate limit com mocks)
tests/fixtures/            laudos fictícios
```

## 11. Regras que não podem ser quebradas

- O texto clínico não é reescrito; o renderizador usa as linhas originais.
- A IA não devolve HTML nem texto formatado.
- Só `<b>`, `</b>`, `<i>`, `</i>` e `<br>` podem aparecer na saída.
- Todo texto é escapado antes das tags.
- Nenhum diagnóstico, interpretação, resumo ou recomendação clínica.
- Ortografia é opt-in e aplicada apenas por clique.
- Nenhum texto de laudo em logs, banco, cache ou `localStorage`.
- Nenhum dado real de paciente em demo, testes, prints ou documentação.
