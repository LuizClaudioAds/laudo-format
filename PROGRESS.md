# Progresso — laudo-format

Atualizado em: 2026-11-06
Branch: `main`
Último commit de código: `3bc54e2 feat(ui): add sample reports and privacy notice`
Remoto: `origin` configurado; push de `main` **pendente** (a autenticação HTTPS falha ou
trava aguardando credencial). Todos os commits das etapas 1–17 estão locais.

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

| Comando                          | Resultado                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------ |
| `npm.cmd run test:unit -- --run` | 8 arquivos, **68 testes passando**                                             |
| `npm.cmd run test:coverage`      | passou nos thresholds; 90,61% statements, 85,77% branches, 90,66% lines        |
| `npm.cmd run lint`               | passou                                                                         |
| `npm.cmd run typecheck`          | passou                                                                         |
| `npm.cmd run format:check`       | passou                                                                         |
| `npm.cmd run build`              | passou; `/` e `/_not-found` estáticas; `/api/format` dinâmica                  |
| `npm.cmd run test:e2e`           | não executado; browsers do Playwright não instalados e ainda não há testes E2E |

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

## 2. Etapa atual

A etapa 17 (`feat(ui): add sample reports and privacy notice`) está **implementada,
verificada e commitada** em `3bc54e2`. A UI ganhou três laudos fictícios em
`src/data/samples.ts` (biópsia gástrica, citologia cervicovaginal e
imuno-histoquímica), um seletor “Carregar exemplo” que preenche o texto e ajusta o
preset, e um aviso de privacidade não bloqueante com botão “Entendi” (dispensa apenas
em memória, sem storage).

O `POST /api/format` já aplica rate limit por IP hasheado (10/min), limite de 64 KiB no
corpo da requisição, helpers HTTP reutilizáveis e os headers `X-RateLimit-*` e
`Retry-After`. O endpoint de ortografia ainda não existe.

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

Após os commits `79bdc5a` (etapa 12), `a431fa1` (etapa 13), `e749a4a` (etapa 14),
`33b76f3` (etapa 15), `7232103` (etapa 16) e `3bc54e2` (etapa 17), não há arquivos de
código pendentes. Atualizações de documentação de continuidade são commitadas
separadamente.

## 5. Ainda não implementado

- `src/app/api/spellcheck/route.ts`.
- Painel de sugestões ortográficas (etapa 19).
- Testes de integração das rotas (etapa 20).
- Testes E2E e validação de acessibilidade/mobile em navegador real (etapa 21).
- `.github/workflows/ci.yml`.
- README final; o atual é o template do create-next-app.
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

- **Push pendente.** `git push -u origin main` já falhou com “Invalid username or token”
  e também ficou travado aguardando credencial interativa (timeout de 5 min). Não há
  token em variáveis de ambiente nem credencial GitHub no Windows Credential Manager.
  Todos os commits das etapas 1–17 estão locais (`7fc06f5` até `3bc54e2`). Configure
  uma credencial válida do GitHub em um terminal interativo e repita o push; não deixar
  o comando pendurado em scripts.
- **Documentação à frente do código.** `docs/API.md` e `docs/ARCHITECTURE.md`
  descrevem `/api/spellcheck` e o painel de ortografia que ainda não existem. Use este
  arquivo como fonte de verdade do estado real.
- **UI sem testes automatizados.** Os componentes foram verificados por lint,
  typecheck, build e smoke test (`GET /`, `POST /api/format`, aviso e samples no HTML),
  mas ainda não há testes de componente nem E2E; copiar/baixar, dispensa do aviso e
  carregamento de exemplo em navegador real ficam para a etapa 21.
- **Dispensa do aviso não persiste.** Recarregar a página mostra o aviso novamente;
  isso é intencional para não usar storage.
- **README padrão.**
- **API parcial.** `POST /api/format` existe; `POST /api/spellcheck` ainda não.
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

### 8.1 Iniciar a etapa 18

Etapa 18 — `feat(api): add optional spelling suggestion endpoint`:

- Adicionar validação de sugestões ortográficas contra o texto original: descartar
  `lineId` inválido, offsets fora da linha, `original` que não coincide exatamente,
  `suggestion` igual ao original, duplicatas/sobreposições e excesso de sugestões.
- Criar a orquestração de IA em `src/lib/ai/spellcheck.ts` com `temperature: 0`,
  timeout de 20 s, `maxRetries: 1`, modo mock e fallback para `suggestions: []` com
  aviso em pt-BR (HTTP 200).
- Criar `src/app/api/spellcheck/route.ts` com `maxDuration = 30`, corpo limitado a
  64 KiB via `readJsonBody`, rate limit de 5 req/min por IP hasheado, headers
  `X-RateLimit-*`/`Retry-After`, `Cache-Control: no-store` e o mesmo envelope de erro.
- Cobrir validação e fallback com testes unitários; a UI de sugestões fica na etapa 19
  e os testes de rota na etapa 20.

Entregar apenas essa etapa neste ciclo. Não iniciar a etapa 19 antes de concluir e
registrar a etapa 18.

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
src/components/            workbench, editor, preview, aviso e aba HTML
src/config/report-rules.ts presets e regras
src/data/samples.ts        laudos fictícios do seletor de exemplo
src/lib/env.ts             ambiente
src/lib/errors.ts          AppError
src/lib/http.ts            helpers JSON, erro e limite de corpo
src/lib/rate-limit.ts      rate limit Upstash + memória
src/lib/text.ts            helpers de texto
src/lib/ai/                provider, schema, prompt, classify
src/lib/format/            domínio, pipeline, heurística, render, validação, invariantes
tests/unit/                testes unitários (pipeline, http e rate limit com mocks)
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
