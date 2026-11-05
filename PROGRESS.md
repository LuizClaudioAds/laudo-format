# Progresso — laudo-format

Atualizado em: 2026-11-05
Branch: `main`
Último commit de código: `a431fa1 feat(api): implement format endpoint with fallback handling`
Remoto: `origin` configurado; push de `main` **pendente** por falha de autenticação HTTPS
nesta sessão. Os commits `79bdc5a`, `a431fa1` e `c23c7eb` estão locais.

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
| `npm.cmd run test:unit -- --run` | 5 arquivos, **40 testes passando**                                             |
| `npm.cmd run test:coverage`      | passou nos thresholds; 89,11% statements, 84,89% branches, 88,88% lines        |
| `npm.cmd run lint`               | passou                                                                         |
| `npm.cmd run typecheck`          | passou                                                                         |
| `npm.cmd run build`              | passou; `/` e `/_not-found` estáticas; `/api/format` dinâmica                  |
| `npm.cmd run test:e2e`           | não executado; browsers do Playwright não instalados e ainda não há testes E2E |

Avisos não bloqueantes do Vitest:

- `vitest.config.ts` usa sintaxe ESM carregada como CJS.
- Plugin `vite-tsconfig-paths` é sugerido substituir por `resolve.tsconfigPaths`.

## 2. Etapa atual

As etapas 12 (`feat(ai): add portuguese classification prompt and repair logic`) e 13
(`feat(api): implement format endpoint with fallback handling`) estão **implementadas,
verificadas e commitadas** em `79bdc5a` e `a431fa1`. A etapa 14 ainda não começou.

O pipeline determinístico e o `POST /api/format` já existem. O que falta na camada de
API é aplicar o limite de 64 KiB na borda, adicionar rate limit, helpers HTTP
reutilizáveis e o endpoint de ortografia. A UI real continua pendente.

## 3. Implementado e commitado

Commits existentes:

`7fc06f5`, `1d9e2c2`, `d87217f`, `4b79573`, `ed44ff8`, `aafd77a`, `4e70a5e`,
`ab7f9e7`, `16f94e8`, `ac6f905`, `14e7066`, `79bdc5a`, `a431fa1`.

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
- `src/app/api/format/route.ts`: `POST` com `maxDuration = 30`, `Content-Type` JSON,
  validação de `{ text, preset }`, `Cache-Control: no-store`, header `x-request-id`,
  fallback 200 e mapeamento de `AppError` para `{ error: { code, message, requestId } }`.
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
- `.env.example`, `vitest.config.ts`, `playwright.config.ts`, configs de lint,
  Prettier, commitlint, Husky e lint-staged.
- `SPEC.md` (movido de `docs/SPEC.md` nesta sessão), `docs/RULES.md`,
  `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/COMMITS.md`, `docs/DEPLOY.md`,
  `docs/adr/0001` a `0004`.

## 4. Nenhum código pendente de commit

Após os commits `79bdc5a` (etapa 12) e `a431fa1` (etapa 13), não há arquivos de código
pendentes. A documentação de continuidade é commitada separadamente.

## 5. Ainda não implementado

- `src/app/api/spellcheck/route.ts`.
- `src/lib/http.ts` e helpers de erro/resposta reutilizáveis.
- `src/lib/rate-limit.ts` com Upstash e fallback em memória.
- Aplicação real do limite de 64 KiB na rota.
- Headers `Retry-After` e `X-RateLimit-*`; `/api/format` já retorna `x-request-id` e
  `Cache-Control: no-store`.
- `src/data/samples.ts`.
- `src/components/**` e a UI real; `src/app/page.tsx` ainda é o template padrão.
- Painel de sugestões ortográficas.
- Testes de integração das rotas.
- Testes E2E.
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

## 7. Problemas conhecidos e pontos de atenção

- **Push pendente.** `git push -u origin main` falhou com “Invalid username or token”.
  Os commits `79bdc5a`, `a431fa1` e `c23c7eb` estão locais. É necessário configurar uma
  credencial válida do GitHub (Git Credential Manager ou equivalente) e repetir o push.
- **Documentação à frente do código.** `docs/API.md` e `docs/ARCHITECTURE.md`
  descrevem `/api/spellcheck`, rate limit e componentes de UI que ainda não existem.
  Use este arquivo como fonte de verdade do estado real.
- **UI padrão.** `src/app/page.tsx`, `layout.tsx` e `globals.css` ainda são do
  create-next-app.
- **README padrão.**
- **API parcial.** `POST /api/format` existe; `POST /api/spellcheck` ainda não.
- **Sem rate limit.** O limite de 64 KiB está definido em `segment.ts`, mas não é
  aplicado na borda HTTP.
- **Headers parciais.** A rota já retorna `Cache-Control: no-store` e `x-request-id`;
  `Retry-After` e `X-RateLimit-*` dependem do rate limit da etapa 14.
- **Rota sem teste de integração.** A etapa 13 cobre o pipeline com provider mock; a
  suíte de rotas (limites, erros, rate limit e fallback HTTP) fica para a etapa 20.
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

### 8.1 Iniciar a etapa 14

Etapa 14 — `feat(api): add size limits, rate limiting and request metadata`:

- Criar `src/lib/http.ts` com helpers de resposta JSON, erro consistente, `requestId`,
  `Cache-Control: no-store` e `Retry-After`.
- Criar `src/lib/rate-limit.ts` com Upstash quando configurado e fallback em memória
  por instância; chave `kind + hash(IP + IP_HASH_SALT)`.
- Aplicar o limite de 64 KiB na leitura do body de `/api/format` sem logar conteúdo.
- Integrar rate limit de 10 req/min na rota, retornando 429 com `Retry-After` e
  `X-RateLimit-*`.
- Manter o fallback de IA como HTTP 200 com `usedFallback: true`.
- Testes de limite, erro e rate limit podem entrar na etapa 20, mas a implementação
  deve passar em lint, typecheck, testes e build.

Entregar apenas essa etapa neste ciclo. Não iniciar a etapa 15 antes de concluir e
registrar a etapa 14.

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
src/app/                   App Router; página ainda padrão
src/app/api/format/        POST /api/format
src/config/report-rules.ts presets e regras
src/lib/env.ts             ambiente
src/lib/errors.ts          AppError
src/lib/text.ts            helpers de texto
src/lib/ai/                provider, schema, prompt, classify
src/lib/format/            domínio, pipeline, heurística, render, validação, invariantes
tests/unit/                testes unitários (inclui pipeline com provider mock)
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
