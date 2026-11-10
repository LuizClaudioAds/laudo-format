---
name: Laudo E2E
description: Convenções, seletores e receitas para escrever ou rodar testes E2E com Playwright no laudo-format (etapa 21) — formatar, copiar, baixar, aviso de privacidade, ortografia em modo mock, layout mobile e acessibilidade.
---

# E2E do laudo-format (Playwright)

Use esta skill somente ao criar, corrigir ou rodar `tests/e2e/*.spec.ts`. Não repita a
leitura de `SPEC.md`/`docs/` para isso; se precisar do escopo exato, leia
`PROGRESS.md` §8.

## Comandos (Windows)

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run test:e2e -- tests/e2e/workbench.spec.ts
npm.cmd run test:e2e -- --project=chromium
```

`playwright.config.ts` já faz o resto:

- sobe `npm run dev` em `http://127.0.0.1:3000` com `AI_PROVIDER=mock` e
  `ALLOW_MOCK_AI=true`;
- reutiliza servidor existente fora de CI (porta ocupada por outro env pode mascarar o
  teste: encerre o servidor antes);
- projetos `chromium` (Desktop Chrome) e `mobile` (Pixel 7, também Chromium);
- `testDir` em `./tests/e2e`, trace no primeiro retry, screenshot só na falha.

## Estado esperado em modo mock

- `POST /api/format` → 200, `usedFallback: true`, aviso
  "Modo mock ativo: classificação heurística aplicada sem chamada de IA." e rodapé
  "Classificação heurística (sem IA)".
- `POST /api/spellcheck` → 200, `suggestions: []`, aviso
  "Modo mock ativo: nenhuma sugestão ortográfica foi gerada." e estado vazio
  "Nenhuma sugestão de correção encontrada."
- Nenhuma chave de provider é necessária.

## Seletores estáveis (prefira role/label, nunca classes)

| Elemento             | Localizador                                                                             |
| -------------------- | --------------------------------------------------------------------------------------- |
| textarea             | `getByLabel("Texto do laudo")` (`#laudo-texto`)                                         |
| seletor de exemplo   | `getByLabel("Carregar exemplo")` (`#laudo-exemplo`)                                     |
| presets              | `getByRole("radio", { name: "Genérico" })` / `"Citologia"`                              |
| enviar / limpar      | `getByRole("button", { name: "Formatar laudo" })` / `"Limpar"`                          |
| aviso de privacidade | `getByRole("complementary", { name: "Privacidade e uso do demo" })` + botão `"Entendi"` |
| abas                 | `getByRole("tab", { name: "Pré-visualização" })` / `"HTML"`                             |
| copiar / baixar      | `getByRole("button", { name: "Copiar HTML" })` / `"Baixar .html"`                       |
| ortografia           | `getByRole("button", { name: "Sugerir correções" })`                                    |
| aplicar / ignorar    | `getByRole("button", { name: /^Aplicar sugestão:/ })` / `/^Ignorar sugestão:/`          |
| feedback             | `getByRole("status")` (copiar, baixar, status do editor)                                |

Samples fictícios: `citologia-cervicovaginal` ("Citologia cervicovaginal"),
`anatomopatologico-gastrico`, `imuno-histoquimica-mamaria`. O preset muda junto com o
sample. O painel HTML mostra o fragmento cru (tags `<b>`, `<i>` e `<br>` visíveis).

## Receitas

Clipboard (Chromium):

```ts
await context.grantPermissions(["clipboard-read", "clipboard-write"], {
  origin: "http://127.0.0.1:3000",
});
await page.getByRole("button", { name: "Copiar HTML" }).click();
const copied = await page.evaluate(() => navigator.clipboard.readText());
expect(copied).toContain("<b>");
```

Download:

```ts
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Baixar .html" }).click();
const download = await downloadPromise;
expect(download.suggestedFilename()).toBe("laudo-formatado.html");
```

Sugestão fictícia via `page.route` (sem depender do provider):

```ts
await page.route("**/api/spellcheck", (route) =>
  route.fulfill({
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify({
      suggestions: [{ lineId: 0, start: 0, end: 8, original: "Pacienta", suggestion: "Paciente" }],
      warnings: [],
      meta: { provider: "mock", model: "test", usedFallback: true, durationMs: 1 },
    }),
  }),
);
```

O texto digitado precisa conter o trecho `original` exatamente na linha indicada por
`lineId` (0 = primeira linha não vazia). Após "Aplicar": textarea corrigido e resultado
anterior limpo (a UI invalida ao editar). "Ignorar": só remove o item da lista.

Mobile / overflow (rode no projeto `mobile` ou em viewport estreito):

```ts
const overflowDx = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
expect(overflowDx).toBeLessThanOrEqual(0);
```

Acessibilidade mínima:

- botão "Formatar laudo" desabilitado com editor vazio;
- labels do textarea, do seletor de exemplo e dos presets visíveis;
- abas com `aria-selected` e navegação ArrowRight/ArrowLeft/Home/End;
- `role="status"`/`aria-live` presente no editor, no resultado e na ortografia;
- foco visível após `Tab` (comparar `document.activeElement`), sem depender de cor.

Preservação de conteúdo:

- usar apenas samples ou `tests/fixtures/reports.ts` (fictícios, sem dados reais);
- para conferir, remova tags e decodifique entidades no próprio spec e compare com o
  texto do sample ignorando espaços em branco.

## Armadilhas

- Editar texto após formatar limpa resultado e sugestões: não espere resultado antigo.
- O aviso de privacidade volta a cada navegação (sem storage); reload mostra de novo.
- Rate limit em memória por IP: 10 formatações/min e 5 ortografias/min. Cada spec que
  formata consome cota; evite mais de 10 formatações por minuto por worker.
- Não use `waitForTimeout`; espere por role/estado (`expect(...).toBeVisible()`).
- Não adicione CI, deploy ou mudanças de app nesta etapa (22–24).
- Antes de commitar: `npm.cmd run lint`, `npm.cmd run typecheck` e
  `npm.cmd run test:e2e`.
