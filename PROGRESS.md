# Progresso — laudo-format

Atualizado em: 2026-11-10
Branch: `main`
Último commit de código: `829accc fix(ci): generate next types before typecheck`
Commit anterior: `b7bb50f docs: align e2e docs with production server`
Remoto: `origin` configurado; etapas 21–23, a skill local e o fix do CI publicados em
2026-11-10.

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
| `npm.cmd run test:unit -- --run` | 11 arquivos, **96 testes passando**                                                |
| `npm.cmd run test:coverage`      | não executado nesta sessão; última medição: 92,74% statements, 88,01% branches     |
| `npm.cmd run lint`               | passou                                                                             |
| `npm.cmd run typecheck`          | passou                                                                             |
| `npm.cmd run format:check`       | passou                                                                             |
| `npm.cmd run build`              | passou; `/` e `/_not-found` estáticas; `/api/format` e `/api/spellcheck` dinâmicas |
| `npm.cmd run test:e2e`           | **12 testes passando** (6 specs × chromium/mobile) em ~26 s                        |

Avisos não bloqueantes do Vitest:

- `vitest.config.ts` usa sintaxe ESM carregada como CJS.
- Plugin `vite-tsconfig-paths` é sugerido substituir por `resolve.tsconfigPaths`.

O ambiente estava sem `node_modules`; `npm.cmd install` foi executado nesta sessão (529
pacotes, com avisos `EBADENGINE` do Node 22.14.0) e o Chromium foi instalado com
`npx.cmd playwright install chromium`. O `package-lock.json` foi revertido para não
incluir o churn de `libc` do npm 11.

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

Smoke test da etapa 19 com `next start` na porta 3114: `GET /` contém a seção
“Sugestões ortográficas”, o botão “Sugerir correções” (desabilitado com o editor
vazio) e a orientação de que nada é alterado sem clique em “Aplicar”. O aplicar e o
ignorar foram cobertos por testes unitários do mapeamento de offsets; falta teste em
navegador real (etapa 21).

## 2. Etapa atual

A etapa 23 (`docs: add readme with demo, architecture and setup`) está
**implementada e commitada** em `7f3667d`. O `README.md` passou a cobrir:

- seção **Demo** explícita, sem inventar link: a URL pública entra na etapa 24;
- requisitos com Node 22 lido do `.nvmrc`;
- tabela de comandos incluindo `npx.cmd playwright install chromium`;
- seção **Testes e CI** com os 96 testes unitários/integração, 6 cenários E2E em
  `chromium`/`mobile`, instruções de instalação do browser, uso de `localhost`,
  `AI_PROVIDER=mock`, rate limit e o que o workflow publica em falha;
- seção **Qualidade** com `format:check` e a recomendação de rodar o E2E antes do push.

A etapa 22 permanece em `3dcf817`. A URL de demo e a configuração da Vercel ficam para a
etapa 24.

Depois do commit da etapa 23, o E2E passou a rodar contra o build de produção
(`27b4c1b`): o `webServer` executa `npm run build && npm run start` e o timeout de
`expect` subiu para 15 s. Motivo: duas execuções locais falharam de forma diferente com
o dev server do Turbopack (processo do Chromium encerrado e `page.goto` estourando 90 s
por compilação sob carga). Com o servidor de produção, 12/12 passaram em duas execuções
seguidas (~22 s cada).

O primeiro run do CI (`b7bb50f`, run #1) falhou no passo de typecheck porque
`.next/types` não existe em checkout limpo e `src/app/layout.tsx` usa o tipo global
`LayoutProps`. O commit `829accc` mudou o script `typecheck` para
`next typegen && tsc --noEmit`; o próximo push dispara um novo run.

## 3. Implementado e commitado

Commits existentes:

`7fc06f5`, `1d9e2c2`, `d87217f`, `4b79573`, `ed44ff8`, `aafd77a`, `4e70a5e`,
`ab7f9e7`, `16f94e8`, `ac6f905`, `14e7066`, `79bdc5a`, `a431fa1`, `e749a4a`,
`33b76f3`, `7232103`, `3bc54e2`, `4e7db2f`, `f023240`, `1151218`, `a41a02c`,
`6eba8a2`, `d02266e`, `a59907b`, `3dcf817`.

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
- `src/lib/spell/apply.ts`: `applySuggestion()` localiza a linha pelo `lineId`, valida
  o trecho original, remapeia offsets para a linha crua e preserva CRLF, `\r`, espaços
  das extremidades e acentos; retorna `null` se o texto mudou.
- `tests/unit/apply.test.ts`: 7 testes de aplicação, CRLF, `\r`, linhas vazias,
  original divergente, offsets inválidos e sugestão idêntica.
- `src/components/suggestions-panel.tsx`: painel de sugestões com “Sugerir correções”,
  “Aplicar”, “Ignorar”, avisos, erro, estado vazio, `aria-live` e labels acessíveis.
- `src/components/format-workbench.tsx`: passou a consumir `POST /api/spellcheck`,
  validar o payload com type guard, limpar sugestões ao editar o texto e reformatar
  após aplicar uma correção.
- `tests/integration/routes.test.ts`: 10 testes dos dois handlers com provider mock,
  cobrindo sucesso, erros de corpo, limites, rate limit, `Retry-After`, headers e
  fallback sem chave.
- `tests/e2e/workbench.spec.ts`: 6 testes Playwright nos projetos `chromium` e `mobile`
  (12 execuções) cobrindo formatação de sample, abas e cópia, download, privacidade,
  ortografia em mock, aplicar/ignorar com `page.route`, acessibilidade básica e overflow
  mobile.
- `playwright.config.ts`: `baseURL` e `webServer.url` em `localhost` para evitar o
  bloqueio de recursos de dev cross-origin do Next.js 16; o `webServer` roda
  `npm run build && npm run start` e `expect.timeout` é 15 s.
- `.github/workflows/ci.yml`: CI em push para `main` e pull requests, com Node do
  `.nvmrc`, `npm ci` com cache, lint, typecheck, testes unitários/integração, build,
  Chromium do Playwright com dependências, E2E e artefatos em caso de falha.
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
- `README.md`: demo (URL pendente da etapa 24), funcionalidades, stack, requisitos,
  configuração, execução, comandos, uso, arquitetura, API, privacidade, testes/CI,
  qualidade e links da documentação.
- `package.json`: o script `typecheck` executa `next typegen` antes de `tsc --noEmit`
  para gerar os tipos de rota/layout em checkout limpo.
- `.env.example`, `vitest.config.ts`, `playwright.config.ts`, configs de lint,
  Prettier, commitlint, Husky e lint-staged.
- `SPEC.md` (movido de `docs/SPEC.md` nesta sessão), `docs/RULES.md`,
  `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/COMMITS.md`, `docs/DEPLOY.md`,
  `docs/adr/0001` a `0004`.

## 4. Nenhum código pendente de commit

A etapa 23 foi commitada em `7f3667d` com o `README.md` e atualizada em `27b4c1b`
(E2E contra build de produção); a etapa 22 está em `3dcf817`, a etapa 21 em `6eba8a2` e
a skill local em `a41a02c`/`a59907b`. As atualizações de continuidade
(`ROADMAP.md`/`PROGRESS.md` desta sessão) são commitadas separadamente.

Os commits das etapas 12–23 (`79bdc5a`, `a431fa1`, `e749a4a`, `33b76f3`, `7232103`,
`3bc54e2`, `4e7db2f`, `f023240`, `1151218`, `a41a02c`, `6eba8a2`, `d02266e`,
`a59907b`, `3dcf817`, `50e1819`, `7f3667d`, `e991a53`, `27b4c1b`, `b7bb50f`,
`829accc`) estão íntegros. `npm.cmd install` foi executado porque `node_modules` estava
ausente; o `package-lock.json` foi revertido para não incluir o churn de `libc`
introduzido pelo npm 11.

## 5. Ainda não implementado

- URL de demo pública no README (depende do deploy, etapa 24).
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
21. **Ortografia explícita e mapeada.** O painel só busca sugestões sob demanda e nada
    é aplicado automaticamente. “Ignorar” remove apenas da lista; “Aplicar” remapeia o
    `lineId` e os offsets da linha normalizada para o texto cru do editor, valida que o
    trecho ainda coincide e só então substitui e reformata. Se o texto mudou, a
    sugestão é descartada com aviso, sem edição parcial. Nenhum texto ou sugestão vai
    para storage ou log.
22. **Rotas testadas por handler, não por servidor.** Os testes de integração importam
    `POST` diretamente, usam `vi.stubEnv` e `vi.resetModules()` para recarregar `env` e
    o rate limit em memória, e enviam `x-forwarded-for` único por cenário. Assim os
    limites (10/min e 5/min) não vazam entre testes e nenhum servidor HTTP real é
    necessário.
23. **Skill local de E2E.** `.opencode/skills/laudo-e2e/SKILL.md` concentra comandos,
    seletores, estado do modo mock e receitas da etapa 21 (clipboard, download,
    `page.route`, overflow mobile) para evitar reler a documentação a cada sessão. A
    skill é descoberta automaticamente pelo OpenCode, carregada sob demanda e não
    altera o app nem os testes.
24. **E2E em `localhost`, não em `127.0.0.1`.** O Next.js 16 bloqueia recursos de dev
    cross-origin por padrão; com `127.0.0.1` o bundle não hidratava e cliques, selects
    e digitação não tinham efeito. `playwright.config.ts` usa `http://localhost:3000`
    no `baseURL` e no `webServer`, mantendo `AI_PROVIDER=mock` e `ALLOW_MOCK_AI=true`.
25. **Orçamento de rate limit nos E2E.** Cada spec formata no máximo duas vezes (fluxo
    principal e aplicar) para caber no limite de 10/min por IP; a ortografia real é
    chamada uma vez por projeto e os demais cenários usam `page.route`. Se o limite for
    atingido, o teste falha com `429`, não com erro de UI.
26. **CI em job único.** Um só job no Ubuntu executa lint, typecheck, testes, build e
    E2E, o que mantém o feedback simples e evita duplicar instalação. A versão do Node
    vem do `.nvmrc` (22 → último 22.x, compatível com `jsdom`/`lint-staged`), o cache
    do npm é habilitado, e `npm ci` valida o lockfile. Playwright instala somente
    `chromium --with-deps`; relatórios e traces sobem como artefato apenas em falha.
27. **README sem link inventado.** A seção de demo existe, mas a URL só é adicionada
    depois do deploy real (etapa 24), para não publicar link quebrado. O README também
    documenta a pegadinha do `localhost` no E2E e o orçamento de rate limit por IP.
28. **E2E contra build de produção.** O `webServer` do Playwright roda
    `npm run build && npm run start` em vez de `npm run dev`. O dev server do Turbopack
    ficou instável sob carga (compilação da rota de ortografia e `page.goto` estourando
    timeout), enquanto o servidor de produção responde em ~1 s por teste. Efeito
    colateral: o CI compila duas vezes (build explícito + webServer); o custo é pequeno e
    o build explícito continua sendo o gate da etapa 22.
29. **Typegen antes do typecheck.** `src/app/layout.tsx` usa o tipo global `LayoutProps`
    gerado pelo Next; em checkout limpo ele não existe e o `tsc` falhava no CI. O script
    `typecheck` passou a rodar `next typegen && tsc --noEmit`, o que funciona sem build
    completo e mantém o gate rápido.

## 7. Problemas conhecidos e pontos de atenção

- **Push.** `main` foi publicada em 2026-11-10 com as etapas 21–23, a skill local e o
  fix do typegen. O run #2 do CI passou. O remoto é
  `https://github.com/LuizClaudioAds/laudo-format.git`; se a credencial expirar, repita
  o push em terminal interativo.
- **Sem testes de componente.** Os fluxos principais agora têm cobertura E2E, mas
  `report-preview`, `suggestions-panel` e `privacy-notice` continuam sem testes de
  componente isolados.
- **Dispensa do aviso não persiste.** Recarregar a página mostra o aviso novamente;
  isso é intencional para não usar storage.
- **README em pt-BR com seção de demo pendente.** A URL pública será adicionada na
  etapa 24 (deploy).
- **Rate limit em memória sem Upstash.** Em produção com várias instâncias o limite só
  é consistente com Upstash configurado (ADR 0004).
- **Cobertura da camada de IA.** `src/lib/ai` subiu para 71,11% com os testes de
  integração, mas os caminhos de sucesso do provider (chamada real e parse da resposta)
  continuam sem teste; os thresholds globais passam por causa do domínio.
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
- **Playwright.** Chromium e FFmpeg instalados localmente; o workflow instala
  `chromium --with-deps` no Ubuntu, mas ainda não rodou no GitHub.
- **Node local 22.14.0.** `jsdom@31` pede `^22.22.2` e `lint-staged@17.6` pede
  `>=22.22.1`; o `npm install` emite `EBADENGINE`, mas lint, typecheck, testes, build e
  E2E passaram. O CI usa o último 22.x via `.nvmrc`; atualizar o Node local com
  `nvm use` remove os avisos.
- **Sem chave Google/Upstash local.** O comportamento esperado é fallback heurístico.
- **`next.config.ts`** mantém `cacheComponents` e `partialPrefetching` do scaffold e
  ainda não tem headers de segurança.
- **`docs/SPEC.md` foi movido para `SPEC.md`** em sessão anterior; os links internos
  foram ajustados para `docs/RULES.md` e `docs/API.md`.

## 8. Próxima tarefa exata

### 8.1 Iniciar a etapa 24

Etapa 24 — `chore: add vercel deployment configuration and env docs`:

- Adicionar headers de segurança em `next.config.ts` sem quebrar `cacheComponents`:
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY` (ou `frame-ancestors 'none'` em CSP, se adotada) e
  `Permissions-Policy` restritiva; manter as rotas dinâmicas e o build passando.
- Documentar em `docs/DEPLOY.md` as variáveis de produção: `AI_PROVIDER=google`,
  `GOOGLE_GENERATIVE_AI_API_KEY`, `IP_HASH_SALT`, Upstash opcional, limites e Node 22.
  Nunca habilitar `ALLOW_MOCK_AI=true` em produção.
- Configurar o projeto na Vercel, validar o build e o funcionamento das duas rotas e só
  então adicionar a URL pública ao `README.md` (substituindo o texto da seção Demo).
- Revisar `docs/ARCHITECTURE.md` e `docs/API.md` contra o código final; nenhum dado real
  de paciente no demo.

Entregar apenas a etapa 24 neste ciclo.

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
src/components/            workbench, editor, preview, ortografia, aviso e aba HTML
src/config/report-rules.ts presets e regras
src/data/samples.ts        laudos fictícios do seletor de exemplo
src/lib/env.ts             ambiente
src/lib/errors.ts          AppError
src/lib/http.ts            helpers JSON, erro e limite de corpo
src/lib/rate-limit.ts      rate limit Upstash + memória
src/lib/text.ts            helpers de texto
src/lib/ai/                provider, schema, prompt, classify, spellcheck
src/lib/spell/             validação e aplicação de sugestões ortográficas
src/lib/format/            domínio, pipeline, heurística, render, validação, invariantes
.opencode/skills/          skill local laudo-e2e (convenções Playwright)
tests/unit/                testes unitários (pipeline, spell, apply, http e rate limit)
tests/integration/         testes dos handlers de /api/format e /api/spellcheck
tests/e2e/                 workbench.spec.ts (Playwright, chromium e mobile)
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
