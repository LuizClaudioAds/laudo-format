# ADR 0002 — Provider de IA agnóstico

- Status: aceito
- Data: 2026-11-05

## Contexto

O projeto é um portfólio e deve ser fácil de executar com diferentes provedores,
incluindo uma camada gratuita para o demo. Acoplar o código ao SDK de um único
fornecedor dificulta testes e manutenção.

## Decisão

Usar o Vercel AI SDK com uma fábrica de provider em `src/lib/ai/provider.ts`.
O provider e o modelo são configurados por `AI_PROVIDER` e `AI_MODEL`. O default do
demo é Google Gemini, mas a interface permite adicionar OpenAI/Anthropic sem alterar
o pipeline.

## Consequências

**Positivas**

- Troca de modelo por variável de ambiente.
- Testes com classificador determinístico.
- Uso de `generateObject` com schema comum.

**Negativas**

- Dependência do AI SDK.
- Pequenas diferenças de suporte a structured output entre provedores.
- Necessário validar a resposta localmente de qualquer forma.

## Alternativas consideradas

- SDK oficial de um único provedor: mais simples, porém menos flexível.
- Chamadas HTTP manuais: mais controle, mais código e manutenção.
