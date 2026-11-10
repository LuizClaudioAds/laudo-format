# LaudoFormat

Aplicação web para formatar o texto bruto de laudos descritivos (citologia,
histopatologia e documentos semelhantes) preservando integralmente o conteúdo
clínico.

A IA identifica a estrutura do laudo — títulos, seções, campos, parágrafos, listas,
notas e assinaturas — e o renderer determinístico aplica a formatação usando somente
as tags `<b>`, `<i>` e `<br>`. A IA nunca devolve o laudo formatado nem reescreve o
texto: ela apenas indica IDs de linhas, tipos de bloco e spans de itálico.

## Demo

A URL pública do demo será adicionada após a configuração de deploy (etapa 24 do
[ROADMAP.md](ROADMAP.md)). Enquanto isso, rode localmente com `npm.cmd run dev`.

## Funcionalidades

- Entrada de texto com contagem de caracteres e linhas não vazias.
- Presets `generico` e `citologia`.
- Classificação por IA com fallback heurístico quando o provedor não está disponível.
- Pré-visualização formatada e aba com o fragmento HTML exato.
- Ações de copiar e baixar o resultado.
- Laudos fictícios de exemplo.
- Aviso de privacidade sem persistência de dados.
- Endpoint opcional de sugestões ortográficas (opt-in; nada é aplicado
  automaticamente).
- Rate limit por IP hasheado e limites de entrada.

## Stack

- Next.js 16.4.5 (App Router, Turbopack) e React 19.3.
- TypeScript em modo `strict`.
- Tailwind CSS 4.
- Vercel AI SDK 7 com `@ai-sdk/google` (`gemini-2.5-flash` por padrão).
- Zod 4.
- Upstash Redis opcional para rate limit distribuído.
- Vitest 5 e Playwright 1.65.

## Requisitos

- Node.js 22 (o `.nvmrc` fixa a major; o CI instala o último 22.x).
- `npm`.
- Chave do Google AI Studio para usar a IA (opcional para o modo heurístico).

No Windows/PowerShell, `npm.ps1` é bloqueado por padrão. Use `npm.cmd` nos comandos
abaixo.

## Configuração

1. Instale as dependências:

   ```powershell
   npm.cmd install
   ```

2. Crie o arquivo de ambiente:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Preencha as variáveis necessárias. Principais:

   | Variável                       | Descrição                                           |
   | ------------------------------ | --------------------------------------------------- |
   | `AI_PROVIDER`                  | `google` (padrão) ou `mock`                         |
   | `AI_MODEL`                     | Modelo usado (padrão: `gemini-2.5-flash`)           |
   | `GOOGLE_GENERATIVE_AI_API_KEY` | Chave do Google AI Studio                           |
   | `UPSTASH_REDIS_REST_URL`       | URL do Redis do Upstash (opcional)                  |
   | `UPSTASH_REDIS_REST_TOKEN`     | Token do Redis do Upstash (opcional)                |
   | `IP_HASH_SALT`                 | Salt usado para hashear IPs no rate limit           |
   | `ALLOW_MOCK_AI`                | Habilita o mock apenas em desenvolvimento/teste     |
   | `RATE_LIMIT_FORMAT`            | Formatações por minuto (padrão: `10`)               |
   | `RATE_LIMIT_SPELL`             | Sugestões ortográficas por minuto (padrão: `5`)     |
   | `NEXT_PUBLIC_APP_URL`          | URL pública da aplicação (padrão: `localhost:3000`) |

Sem `GOOGLE_GENERATIVE_AI_API_KEY`, a aplicação continua funcionando com o
classificador heurístico e responde HTTP 200 com `usedFallback: true`.

## Execução

```powershell
npm.cmd run dev
```

Abra <http://localhost:3000>.

## Comandos

| Comando                               | Descrição                                  |
| ------------------------------------- | ------------------------------------------ |
| `npm.cmd run dev`                     | Inicia o servidor de desenvolvimento       |
| `npm.cmd run build`                   | Gera o build de produção                   |
| `npm.cmd run start`                   | Inicia o build de produção                 |
| `npm.cmd run lint`                    | Executa o ESLint                           |
| `npm.cmd run typecheck`               | Verifica os tipos com `tsc --noEmit`       |
| `npm.cmd run test:unit -- --run`      | Executa os testes unitários uma vez        |
| `npm.cmd run test:coverage`           | Executa os testes com cobertura            |
| `npm.cmd run test:e2e`                | Executa os testes E2E com Playwright       |
| `npx.cmd playwright install chromium` | Instala o browser usado pelos testes E2E   |
| `npm.cmd run format`                  | Formata o código com Prettier              |
| `npm.cmd run format:check`            | Verifica a formatação sem alterar arquivos |

## Como usar

1. Cole o texto bruto de um laudo no editor ou carregue um exemplo fictício.
2. Selecione o preset `generico` ou `citologia`.
3. Clique em **Formatar laudo**.
4. Confira a pré-visualização e a aba **HTML**.
5. Copie o fragmento ou baixe o arquivo `.html`.
6. Opcionalmente, clique em **Sugerir correções**, revise cada sugestão e use
   **Aplicar** ou **Ignorar**. Nada é alterado sem a sua confirmação.

## Arquitetura

```text
Navegador
  └─ POST /api/format { text, preset }
       └─ segmentação (linhas, IDs e offsets)
       └─ IA classifica apenas estrutura e itálico
       └─ validação/reparo contra o texto original
       └─ fallback heurístico quando necessário
       └─ renderer determinístico → <b>, <i>, <br>
```

Módulos principais:

- `src/lib/format/`: domínio puro, segmentação, heurísticas, validação, renderização
  e invariantes.
- `src/lib/ai/`: provider, prompts, schemas e orquestração da IA.
- `src/lib/spell/`: validação e aplicação das sugestões ortográficas.
- `src/app/api/`: rotas `POST /api/format` e `POST /api/spellcheck`.
- `src/components/`: workbench, editor, pré-visualização, painel de ortografia, aviso
  de privacidade e saída HTML.
- `src/config/report-rules.ts`: presets e regras centralizadas.

## API

### `POST /api/format`

Recebe `{ "text": "...", "preset": "generico" }` e devolve `{ html, warnings, meta }`.

### `POST /api/spellcheck`

Recebe `{ "text": "..." }` e devolve `{ suggestions, warnings, meta }`. As sugestões
são apenas informativas; nenhuma alteração é aplicada pelo servidor.

Os contratos completos, limites e códigos de erro estão em
[docs/API.md](docs/API.md).

## Privacidade e limites

- O texto do laudo não é gravado em banco, logs, cache ou `localStorage`.
- Use apenas dados fictícios no demo público.
- Limites por requisição: 20.000 caracteres, 500 linhas não vazias e 64 KiB de corpo.
- Rate limit: 10 formatações/min e 5 sugestões ortográficas/min por IP hasheado.
- O free tier do Gemini não é adequado para PHI. Para uso clínico real, use um plano
  compatível e faça a revisão jurídica necessária.
- `ALLOW_MOCK_AI=true` deve ser usado somente em desenvolvimento/teste.

## Testes e CI

- `npm.cmd run test:unit -- --run`: 96 testes unitários e de integração (Vitest 5).
- `npm.cmd run test:coverage`: cobertura V8 com thresholds globais.
- `npm.cmd run test:e2e`: 6 cenários Playwright executados nos projetos `chromium` e
  `mobile` (12 execuções), cobrindo formatação, abas e cópia, download, aviso de
  privacidade, ortografia com “Aplicar”/“Ignorar”, acessibilidade básica e overflow.

Na primeira execução do E2E, instale o browser:

```powershell
npx.cmd playwright install chromium
```

O `playwright.config.ts` gera o build e sobe `npm run start` em
`http://localhost:3000` com `AI_PROVIDER=mock` e `ALLOW_MOCK_AI=true`; o E2E não precisa
de chave nem de servidor externo. O primeiro run compila o app (~10 s). Use `localhost`,
não `127.0.0.1`: o Next.js 16 bloqueia recursos de dev cross-origin e a página não
hidrata em modo dev. Cada cenário consome o rate limit em memória de 10 formatações/min
por IP.

O workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) roda em push para `main`
e em pull requests: `npm ci`, lint, typecheck, testes, build, Chromium com dependências
e E2E. Em caso de falha, publica `playwright-report/` e `test-results/` como artefato.

## Qualidade

Antes de enviar alterações, execute:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:unit -- --run
npm.cmd run build
npm.cmd run format:check
```

Para validar o fluxo completo como o CI, rode também `npm.cmd run test:e2e`. Nenhum
texto de laudo deve aparecer em logs, artefatos ou capturas de tela.

## Documentação

- [SPEC.md](SPEC.md): requisitos funcionais e não funcionais.
- [ROADMAP.md](ROADMAP.md): etapas e progresso.
- [PROGRESS.md](PROGRESS.md): estado real e próxima tarefa.
- [docs/RULES.md](docs/RULES.md): regras de formatação.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): arquitetura e fluxo.
- [docs/API.md](docs/API.md): contratos dos endpoints.
- [docs/COMMITS.md](docs/COMMITS.md): política de commits.
- [docs/DEPLOY.md](docs/DEPLOY.md): deploy na Vercel e variáveis de ambiente.
- [docs/adr/](docs/adr/): decisões arquiteturais.

## Licença

Consulte o proprietário do repositório antes de reutilizar o código.
