# Política de commits — laudo-format

## 1. Formato

O projeto usa [Conventional Commits](https://www.conventionalcommits.org/):

```text
<tipo>(<escopo>): <assunto no imperativo>

<corpo opcional explicando o porquê>

<rodapé opcional>
```

Regras:

- Assunto em inglês, imperativo, minúsculo após o tipo, sem ponto final.
- Máximo de 72 caracteres no assunto.
- Um commit deve conter uma única mudança lógica.
- Não misturar feature, refactor e formatação no mesmo commit.
- Cada commit deve passar em `lint`, `typecheck` e testes aplicáveis.
- Testes da mudança entram no mesmo commit, exceto suítes transversais.
- Não commitar segredos. `.env.example` é a única exceção de ambiente.
- Não usar commits WIP; usar `git commit --fixup` e squash antes do push.
- O histórico deve contar a evolução do projeto de forma legível.

Tipos permitidos:

| Tipo       | Uso                                      |
| ---------- | ---------------------------------------- |
| `feat`     | Nova funcionalidade                      |
| `fix`      | Correção de bug                          |
| `docs`     | Documentação                             |
| `test`     | Testes                                   |
| `refactor` | Refatoração sem mudança de comportamento |
| `perf`     | Performance                              |
| `ci`       | Integração contínua                      |
| `build`    | Build/dependências                       |
| `chore`    | Manutenção                               |
| `revert`   | Reversão                                 |

## 2. Validação local

O Husky executa:

- `pre-commit`: `lint-staged` (ESLint + Prettier nos arquivos alterados).
- `commit-msg`: `commitlint` com `@commitlint/config-conventional`.

## 3. Sequência planejada

| #   | Commit                                                             |
| --- | ------------------------------------------------------------------ |
| 1   | `chore: scaffold Next.js app with TypeScript and Tailwind`         |
| 2   | `chore: configure lint, formatting and typecheck`                  |
| 3   | `chore: configure vitest and playwright`                           |
| 4   | `docs: add product specification and formatting rules`             |
| 5   | `docs: add architecture, api, commit and deploy guides`            |
| 6   | `feat(domain): add report block types and line segmentation`       |
| 7   | `feat(domain): add generic and cytology formatting presets`        |
| 8   | `feat(domain): add deterministic renderer for b, i and br tags`    |
| 9   | `feat(domain): add heuristic fallback classifier`                  |
| 10  | `test(domain): cover renderer invariants, escaping and spacing`    |
| 11  | `feat(ai): add provider factory and structured output schema`      |
| 12  | `feat(ai): add portuguese classification prompt and repair logic`  |
| 13  | `feat(api): implement format endpoint with fallback handling`      |
| 14  | `feat(api): add size limits, rate limiting and request metadata`   |
| 15  | `feat(ui): build two-pane formatting workbench`                    |
| 16  | `feat(ui): add preview, html source and copy actions`              |
| 17  | `feat(ui): add sample reports and privacy notice`                  |
| 18  | `feat(api): add optional spelling suggestion endpoint`             |
| 19  | `feat(ui): add spelling suggestions panel with explicit apply`     |
| 20  | `test(api): cover format and spellcheck routes with mock provider` |
| 21  | `test(e2e): cover format, copy, privacy and mobile flows`          |
| 22  | `ci: run lint, typecheck, unit, build and e2e`                     |
| 23  | `docs: add readme with demo, architecture and setup`               |
| 24  | `chore: add vercel deployment configuration and env docs`          |

## 4. Antes do push

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
git log --oneline
git status
```

O push para `main` só deve ocorrer com a árvore limpa e o CI local verde.

## 5. Exemplos

Bom:

```text
feat(domain): add deterministic renderer for b, i and br tags

The model only classifies lines and emphasis offsets. Rendering original text
in code prevents the model from rewriting medical content.
```

Ruim:

```text
update stuff
```

Ruim:

```text
feat: renderer + fix lint + update docs + add tests
```
