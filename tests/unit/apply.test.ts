import { describe, expect, it } from "vitest";

import { applySuggestion } from "@/lib/spell/apply";

function suggestion(overrides: Partial<Parameters<typeof applySuggestion>[1]> = {}) {
  return {
    lineId: 0,
    start: 20,
    end: 26,
    original: "Gracas",
    suggestion: "Graças",
    ...overrides,
  };
}

describe("applySuggestion", () => {
  it("aplica a substituição na linha indicada", () => {
    const text = "Paciente: Maria das Gracas\nIdade: 42 anos";

    expect(applySuggestion(text, suggestion())).toBe(
      "Paciente: Maria das Gracas\nIdade: 42 anos".replace("Gracas", "Graças"),
    );
  });

  it("preserva CRLF e espaços das extremidades", () => {
    const text = "Título\r\n   Paciente: Maria das Gracas   \r\nFim";
    const result = applySuggestion(text, suggestion({ lineId: 1 }));

    expect(result).toBe("Título\r\n   Paciente: Maria das Graças   \r\nFim");
  });

  it("ignora linhas vazias ao contar lineId", () => {
    const text = "Primeira\n\n\nSegunda: Gracas";
    const result = applySuggestion(text, suggestion({ lineId: 1, start: 9, end: 15 }));

    expect(result).toBe("Primeira\n\n\nSegunda: Graças");
  });

  it("preserva quebras de linha isoladas com \\r", () => {
    const text = "Primeira\rSegunda: Gracas";
    const result = applySuggestion(text, suggestion({ lineId: 1, start: 9, end: 15 }));

    expect(result).toBe("Primeira\rSegunda: Graças");
  });

  it("retorna null quando o original não coincide", () => {
    const text = "Paciente: Maria das Gracas";

    expect(applySuggestion(text, suggestion({ original: "Gráças" }))).toBeNull();
  });

  it("retorna null para lineId inexistente ou offsets inválidos", () => {
    const text = "Paciente: Maria das Gracas";

    expect(applySuggestion(text, suggestion({ lineId: 9 }))).toBeNull();
    expect(applySuggestion(text, suggestion({ start: 999, end: 1000 }))).toBeNull();
    expect(applySuggestion(text, suggestion({ start: 1.5 }))).toBeNull();
  });

  it("retorna null quando a sugestão é idêntica ao original", () => {
    const text = "Paciente: Maria das Gracas";

    expect(applySuggestion(text, suggestion({ suggestion: "Gracas" }))).toBeNull();
  });
});
