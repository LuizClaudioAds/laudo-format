# ADR 0001 — IA classifica, código renderiza

- Status: aceito
- Data: 2026-11-05

## Contexto

O produto não pode reescrever o texto de um laudo médico. Modelos generativos podem
alterar palavras, omitir trechos ou inventar conteúdo ao formatar diretamente.

## Decisão

A IA recebe linhas numeradas e devolve apenas:

- agrupamento de `lineIds`;
- tipo de cada bloco;
- spans de itálico com offsets;
- confiança e warnings.

O renderer sempre usa as linhas originais para produzir o HTML. Nenhum texto gerado
pelo modelo é usado como conteúdo.

## Consequências

**Positivas**

- Elimina reescrita e alucinação de conteúdo.
- Torna a formatação determinística e testável.
- Permite trocar o modelo sem alterar a saída.

**Negativas**

- A IA não pode corrigir quebras de linha dentro de uma palavra.
- A qualidade depende da classificação por linha.
- O prompt precisa explicar bem o contrato.

## Alternativas consideradas

- Pedir ao modelo o HTML final: rejeitado pelo risco de alteração.
- Não usar IA: rejeitado pela baixa robustez em estruturas variadas.
