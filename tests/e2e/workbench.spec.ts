import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

const SAMPLE_ID = "citologia-cervicovaginal";
const SAMPLE_PRESET_LABEL = "Citologia";
const MOCK_FORMAT_WARNING = "Modo mock ativo: classificação heurística aplicada sem chamada de IA.";
const MOCK_SPELL_WARNING = "Modo mock ativo: nenhuma sugestão ortográfica foi gerada.";

const FALLBACK_META = "Classificação heurística (sem IA)";
const DOWNLOAD_FILENAME = "laudo-formatado.html";

// Next.js dev compiles the page on first request; keep the whole spec patient.
test.setTimeout(90_000);

/**
 * Loads a fictional sample and formats it once, returning the visible preview panel.
 * Every extra format call spends the 10/min in-memory rate limit, so tests share this.
 */
async function loadSampleAndFormat(page: Page) {
  await page.goto("/");

  const textarea = page.getByLabel("Texto do laudo");
  const formatButton = page.getByRole("button", { name: "Formatar laudo" });

  await expect(formatButton).toBeDisabled();

  await page.getByLabel("Carregar exemplo").selectOption(SAMPLE_ID);
  await expect(page.getByLabel("Carregar exemplo")).toHaveValue(SAMPLE_ID);
  await expect(page.getByRole("radio", { name: SAMPLE_PRESET_LABEL })).toBeChecked();
  await expect(formatButton).toBeEnabled();

  await formatButton.click();

  const panel = page.getByRole("tabpanel");
  await expect(page.getByText(MOCK_FORMAT_WARNING)).toBeVisible();
  await expect(panel).toContainText("Paciente: Exemplo Fictício");
  await expect(page.getByText(FALLBACK_META)).toBeVisible();

  return { textarea, panel };
}

test("formats a fictional sample, shows the HTML tab, copies and downloads it", async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: baseURL,
  });

  const { panel } = await loadSampleAndFormat(page);

  // Preview keeps the clinical content and only the three allowed tags.
  await expect(panel).toContainText("esfregaço cervicovaginal em meio líquido");
  const previewHtml = await panel
    .locator("div")
    .first()
    .evaluate((element) => element.innerHTML);
  expect(previewHtml).toContain("<b>");
  expect(previewHtml).not.toMatch(/<(?!\/?(?:b|i|br)\b)[a-zA-Z]/);

  // Keyboard navigation between the result tabs.
  const previewTab = page.getByRole("tab", { name: "Pré-visualização" });
  const htmlTab = page.getByRole("tab", { name: "HTML" });

  await expect(previewTab).toHaveAttribute("aria-selected", "true");
  await previewTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(htmlTab).toBeFocused();
  await expect(htmlTab).toHaveAttribute("aria-selected", "true");

  const htmlPanel = page.getByRole("tabpanel");
  await expect(htmlPanel.locator("pre")).toContainText("<b>");
  await expect(htmlPanel.locator("pre")).toContainText("<br>");

  // Copy uses the Clipboard API; feedback is announced via role="status".
  await page.getByRole("button", { name: "Copiar HTML" }).click();
  await expect(page.getByRole("status").filter({ hasText: "HTML copiado" })).toBeVisible();

  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("<b>");
  expect(copied).not.toMatch(/<(?!\/?(?:b|i|br)\b)[a-zA-Z]/);

  // Download keeps the exact sanitized fragment.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar .html" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe(DOWNLOAD_FILENAME);

  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const downloaded = await readFile(downloadPath as string, "utf8");

  expect(downloaded).toContain("<b>");
  expect(downloaded).not.toMatch(/<(?!\/?(?:b|i|br)\b)[a-zA-Z]/);

  // Mobile and desktop must not overflow horizontally.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("shows the privacy notice on first visit and allows dismissing without storage", async ({
  page,
}) => {
  await page.goto("/");

  const notice = page.getByRole("complementary", { name: "Privacidade e uso do demo" });

  await expect(notice).toBeVisible();
  await expect(notice).toContainText("Não use dados reais de pacientes");

  await notice.getByRole("button", { name: "Entendi" }).click();
  await expect(notice).toBeHidden();

  // The dismissal is session-only: no localStorage/sessionStorage is written.
  const storedKeys = await page.evaluate(() => ({
    local: window.localStorage.length,
    session: window.sessionStorage.length,
  }));
  expect(storedKeys).toEqual({ local: 0, session: 0 });

  await page.reload();
  await expect(
    page.getByRole("complementary", { name: "Privacidade e uso do demo" }),
  ).toBeVisible();
});

test("shows labels, aria-live status and visible focus on the editor", async ({ page }) => {
  await page.goto("/");

  const textarea = page.getByLabel("Texto do laudo");

  await expect(textarea).toBeVisible();
  await expect(page.getByLabel("Carregar exemplo")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Genérico" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Citologia" })).toBeVisible();

  await expect(page.getByRole("status").first()).toBeAttached();

  // Tab reaches the textarea and the focus ring is visible (ring => box-shadow).
  for (let index = 0; index < 6; index += 1) {
    const isFocused = await textarea.evaluate((element) => element === document.activeElement);
    if (isFocused) break;
    await page.keyboard.press("Tab");
  }

  await expect(textarea).toBeFocused();
  const focusShadow = await textarea.evaluate((element) => getComputedStyle(element).boxShadow);
  expect(focusShadow).not.toBe("none");
});

test("requests spelling suggestions in mock mode and shows the empty state", async ({ page }) => {
  await page.goto("/");

  const textarea = page.getByLabel("Texto do laudo");
  const requestButton = page.getByRole("button", { name: "Sugerir correções" });

  await expect(requestButton).toBeDisabled();

  await textarea.fill("Paciete: Exemplo Fictício\nRegistro: 0000000");
  await expect(requestButton).toBeEnabled();

  await requestButton.click();

  await expect(page.getByText(MOCK_SPELL_WARNING)).toBeVisible();
  await expect(page.getByText("Nenhuma sugestão de correção encontrada.")).toBeVisible();
});

test("applies a spelling suggestion and re-formats the report", async ({ page }) => {
  await page.route("**/api/spellcheck", (route) =>
    route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify({
        suggestions: [
          { lineId: 0, start: 0, end: 8, original: "Pacienta", suggestion: "Paciente" },
        ],
        warnings: [],
        meta: { provider: "mock", model: "test", usedFallback: true, durationMs: 1 },
      }),
    }),
  );

  await page.goto("/");

  const textarea = page.getByLabel("Texto do laudo");
  await textarea.fill("Pacienta: Exemplo Fictício\nRegistro: 0000000");
  await page.getByRole("button", { name: "Sugerir correções" }).click();

  await expect(page.getByRole("button", { name: /^Aplicar sugestão:/ })).toBeVisible();

  await page.getByRole("button", { name: /^Aplicar sugestão:/ }).click();

  await expect(textarea).toHaveValue("Paciente: Exemplo Fictício\nRegistro: 0000000");
  await expect(page.getByRole("tabpanel")).toContainText("Paciente: Exemplo Fictício");
  await expect(page.getByText("Original: Pacienta")).toBeHidden();
});

test("ignores a spelling suggestion without touching the text", async ({ page }) => {
  await page.route("**/api/spellcheck", (route) =>
    route.fulfill({
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify({
        suggestions: [
          { lineId: 0, start: 0, end: 8, original: "Pacienta", suggestion: "Paciente" },
        ],
        warnings: [],
        meta: { provider: "mock", model: "test", usedFallback: true, durationMs: 1 },
      }),
    }),
  );

  await page.goto("/");

  const textarea = page.getByLabel("Texto do laudo");
  const original = "Pacienta: Exemplo Fictício\nRegistro: 0000000";

  await textarea.fill(original);
  await page.getByRole("button", { name: "Sugerir correções" }).click();
  await page.getByRole("button", { name: /^Ignorar sugestão:/ }).click();

  await expect(textarea).toHaveValue(original);
  await expect(page.getByText("Original: Pacienta")).toBeHidden();
  await expect(page.getByText("Nenhuma sugestão de correção encontrada.")).toBeVisible();
});
