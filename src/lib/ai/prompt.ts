import type { ReportPreset, SourceLine } from "@/lib/format/types";

export const CLASSIFICATION_SYSTEM_PROMPT = `Você é um assistente especializado na estrutura de laudos médicos brasileiros.

Sua ÚNICA tarefa é agrupar e classificar linhas numeradas. Você não formata o laudo e não devolve o texto.

REGRAS OBRIGATÓRIAS:
1. Nunca reescreva, resuma, traduza, corrija, complete ou invente texto.
2. Retorne todos os lineIds não vazios exatamente uma vez, na ordem original.
3. Use somente estes tipos:
   - document_title: título principal do laudo.
   - section_heading: cabeçalho de seção, como MATERIAL, DIAGNÓSTICO, CONCLUSÃO.
   - field: linha no formato "Rótulo: valor".
   - paragraph: corpo do laudo.
   - list_item: item de lista com marcador.
   - note: nota ou observação.
   - signature: nome, CRM ou assinatura ao final.
   - unknown: apenas quando não for possível classificar.
4. Em caso de dúvida, use paragraph.
5. Não marque negrito. O negrito é aplicado pelo sistema.
6. Para itálico, marque apenas nomes científicos ou termos latinos, com offsets UTF-16 dentro da linha.
7. Máximo de 50 spans de itálico.
8. A saída deve seguir estritamente o schema solicitado.`;

export const SPELLCHECK_SYSTEM_PROMPT = `Você revisa ortografia e gramática de laudos médicos em português do Brasil.

REGRAS:
1. Sugira apenas correções claras de ortografia ou gramática.
2. Não reescreva, resuma, traduza ou altere o estilo.
3. Não corrija termos médicos, siglas, nomes próprios ou dosagens sem certeza.
4. Cada sugestão deve apontar lineId, start, end, original e suggestion.
5. O campo original deve ser exatamente o trecho da linha.
6. Se não houver correção segura, retorne uma lista vazia.
7. A saída deve seguir estritamente o schema solicitado.`;

export function buildClassificationPrompt(lines: SourceLine[], preset: ReportPreset): string {
  return JSON.stringify({
    preset,
    lines: lines.map((line) => ({ id: line.id, text: line.text })),
  });
}

export function buildSpellCheckPrompt(lines: SourceLine[]): string {
  return JSON.stringify({
    lines: lines.map((line) => ({ id: line.id, text: line.text })),
  });
}
