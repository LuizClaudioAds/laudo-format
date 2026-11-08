# Roadmap — laudo-format

Legenda:

- `[x]` concluído e verificado por código, testes e/ou build.
- `[ ]` pendente.
- Um item de implementação pode estar concluído enquanto o commit correspondente ainda está pendente; isso é indicado explicitamente.

## 1. Fundação do repositório

- [x] Scaffold Next.js 16.4.5 + React 19.3 + TypeScript strict + Tailwind 4.
- [x] ESLint, Prettier, `tsc --noEmit`, commitlint, Husky e lint-staged.
- [x] Vitest 5 + cobertura V8 + Playwright 1.65 configurados.
- [x] `.gitattributes` com LF, `.editorconfig`, `.nvmrc` e `.env.example`.
- [x] Especificação do produto, regras de formatação, arquitetura, API, commits e deploy.
- [x] ADRs 0001–0004.
- [x] Primeiro build de produção validado.
- [ ] CI no GitHub Actions.

## 2. Domínio determinístico

- [x] Tipos de bloco, presets e estruturas de relatório.
- [x] Segmentação com normalização NFC/CRLF, IDs e offsets estáveis.
- [x] Limites de 20.000 caracteres, 500 linhas e 64 KiB definidos e aplicados na borda HTTP.
- [x] Presets `generico` e `citologia`.
- [x] Renderizador determinístico com apenas `<b>`, `<i>` e `<br>`.
- [x] Escape de HTML e preservação de conteúdo.
- [x] Classificador heurístico de fallback.
- [x] Regras de espaçamento, campos, seções, listas e assinatura.
- [x] Testes unitários de segmentação, heurísticas, renderização e invariantes.
- [x] Utilitários de invariantes para remover tags, decodificar entidades e comparar conteúdo não branco.

## 3. Camada de IA

- [x] Leitura normalizada de ambiente em `src/lib/env.ts`.
- [x] Provider factory isolado em `src/lib/ai/provider.ts`.
- [x] Schema Zod restrito a `lineIds`, tipos, spans e avisos.
- [x] Prompt de classificação em pt-BR e prompt de ortografia.
- [x] Validação/reparo de classificação e spans em `src/lib/format/validate.ts`.
- [x] Testes unitários de reparo, IDs inválidos, duplicados, agrupamento e limite de itálico.
- [x] Orquestração `classifyReport` com timeout de 20 s, `temperature: 0`, `maxRetries: 1`, mock e fallback heurístico.
- [x] Commit #12 com prompt, validação/reparo e testes.
- [x] Commit #13 com pipeline, rota de formatação e teste de pipeline.
- [ ] Testes unitários específicos da orquestração/mock/fallback (podem entrar na etapa de testes de API).

## 4. API

- [x] `src/lib/format/pipeline.ts` unindo segmentação, classificação e renderização.
- [x] `POST /api/format` com validação de body, preset, erros JSON e fallback 200.
- [x] Aplicação dos limites de 20.000 caracteres, 500 linhas e 64 KiB na rota.
- [x] Metadados de resposta (`provider`, `model`, `usedFallback`, `durationMs`, contagens).
- [x] Rate limit por IP hasheado com Upstash e fallback em memória.
- [x] `Retry-After` em respostas 429.
- [x] `POST /api/spellcheck` com sugestões opt-in.
- [x] Helpers HTTP/erros reutilizáveis.
- [x] `maxDuration = 30` na rota de formatação.

## 5. Interface

- [x] Substituir a página padrão do create-next-app pelo workbench real.
- [x] Layout responsivo de dois painéis: entrada e resultado.
- [x] Contagem de caracteres/linhas, limpar e carregar exemplo.
- [x] Seletor de preset `generico`/`citologia`.
- [x] Abas de pré-visualização e HTML exato.
- [x] Botões de copiar e baixar o fragmento.
- [x] Aviso de privacidade visível na primeira visita.
- [x] Estados de carregamento, erro, fallback e `aria-live`.
- [x] Laudos fictícios em `src/data/samples.ts`.
- [ ] Painel de sugestões ortográficas com “Aplicar” e “Ignorar”.
- [ ] Acessibilidade e mobile validados.

## 6. Testes e qualidade

- [x] 79 testes unitários passando.
- [x] Cobertura global acima de 80% em statements/linhas e 75% em branches.
- [ ] Testes de integração das rotas com provider mock.
- [ ] Testes de limite de payload, erros, rate limit e fallback no nível da rota (unitários de `http`/`rate-limit` concluídos na etapa 14).
- [ ] Testes E2E de formatação, cópia, privacidade e mobile.
- [ ] Instalar browsers do Playwright no ambiente de CI.
- [ ] Manter lint, typecheck, testes e build verdes em cada commit.

## 7. Documentação e publicação

- [ ] README final com demo, setup, arquitetura e privacidade.
- [ ] CI com lint, typecheck, testes, build e E2E.
- [ ] Configuração de deploy na Vercel e headers de segurança.
- [ ] Revisar `docs/ARCHITECTURE.md` e `docs/API.md` contra o código final.
- [x] Verificação final antes do push.
- [x] `git push -u origin main` (concluído em 2026-11-08).

## Sequência de commits planejada

| #   | Commit                                                             | Status                |
| --- | ------------------------------------------------------------------ | --------------------- |
| 1   | `chore: scaffold Next.js app with TypeScript and Tailwind`         | concluído (`7fc06f5`) |
| 2   | `chore: configure lint, formatting and typecheck`                  | concluído (`1d9e2c2`) |
| 3   | `chore: configure vitest and playwright`                           | concluído (`d87217f`) |
| 4   | `docs: add product specification and formatting rules`             | concluído (`4b79573`) |
| 5   | `docs: add architecture, api, commit and deploy guides`            | concluído (`ed44ff8`) |
| 6   | `feat(domain): add report block types and line segmentation`       | concluído (`aafd77a`) |
| 7   | `feat(domain): add generic and cytology formatting presets`        | concluído (`4e70a5e`) |
| 8   | `feat(domain): add deterministic renderer for b, i and br tags`    | concluído (`ab7f9e7`) |
| 9   | `feat(domain): add heuristic fallback classifier`                  | concluído (`16f94e8`) |
| 10  | `test(domain): cover renderer invariants, escaping and spacing`    | concluído (`ac6f905`) |
| 11  | `feat(ai): add provider factory and structured output schema`      | concluído (`14e7066`) |
| 12  | `feat(ai): add portuguese classification prompt and repair logic`  | concluído (`79bdc5a`) |
| 13  | `feat(api): implement format endpoint with fallback handling`      | concluído (`a431fa1`) |
| 14  | `feat(api): add size limits, rate limiting and request metadata`   | concluído (`e749a4a`) |
| 15  | `feat(ui): build two-pane formatting workbench`                    | concluído (`33b76f3`) |
| 16  | `feat(ui): add preview, html source and copy actions`              | concluído (`7232103`) |
| 17  | `feat(ui): add sample reports and privacy notice`                  | concluído (`3bc54e2`) |
| 18  | `feat(api): add optional spelling suggestion endpoint`             | concluído (`4e7db2f`) |
| 19  | `feat(ui): add spelling suggestions panel with explicit apply`     | pendente              |
| 20  | `test(api): cover format and spellcheck routes with mock provider` | pendente              |
| 21  | `test(e2e): cover format, copy, privacy and mobile flows`          | pendente              |
| 22  | `ci: run lint, typecheck, unit, build and e2e`                     | pendente              |
| 23  | `docs: add readme with demo, architecture and setup`               | pendente              |
| 24  | `chore: add vercel deployment configuration and env docs`          | pendente              |
