# Arquitetura — laudo-format

## 1. Visão geral

A aplicação é um app Next.js com uma página interativa e duas Route Handlers. O
navegador nunca acessa a chave da IA. O servidor segmenta o texto, consulta o modelo
apenas para classificar linhas e aplica a formatação de forma determinística.

```text
┌──────────────────────┐
│ Navegador            │
│ React + Tailwind     │
└──────────┬───────────┘
           │ POST /api/format { text, preset }
           ▼
┌─────────────────────────────────────────────────────┐
│ Route Handler (Node.js runtime)                     │
│                                                     │
│  1. valida limite de entrada                        │
│  2. segmenta linhas (IDs + offsets)                 │
│  3. chama IA (somente lineIds e spans)              │
│  4. valida/repair da resposta com Zod               │
│  5. fallback heurístico se necessário               │
│  6. renderer determinístico → <b>/<i>/<br>          │
└──────────┬──────────────────────────────────────────┘
           │ { html, warnings, meta }
           ▼
┌──────────────────────┐
│ Navegador            │
│ preview + HTML       │
└──────────────────────┘

POST /api/spellcheck { text } ──► IA ──► sugestões validadas
```

## 2. Módulos

| Caminho                                | Responsabilidade                         |
| -------------------------------------- | ---------------------------------------- |
| `src/app/page.tsx`                     | Página inicial (Server Component)        |
| `src/components/format-workbench.tsx`  | Estado e fluxo principal da UI           |
| `src/components/report-editor.tsx`     | Textarea, presets, exemplos e ações      |
| `src/components/report-preview.tsx`    | Preview do HTML formatado                |
| `src/components/html-output.tsx`       | Aba com o fragmento exato                |
| `src/components/suggestions-panel.tsx` | Sugestões ortográficas                   |
| `src/components/privacy-notice.tsx`    | Aviso de privacidade                     |
| `src/app/api/format/route.ts`          | Endpoint de formatação                   |
| `src/app/api/spellcheck/route.ts`      | Endpoint de sugestões                    |
| `src/lib/format/segment.ts`            | Normalização e segmentação de linhas     |
| `src/lib/format/render.ts`             | Renderer determinístico                  |
| `src/lib/format/heuristics.ts`         | Classificador de fallback                |
| `src/lib/format/validate.ts`           | Validação/repair da classificação        |
| `src/lib/format/pipeline.ts`           | Orquestração do fluxo                    |
| `src/lib/format/invariants.ts`         | Utilitários de invariante para testes    |
| `src/lib/ai/provider.ts`               | Fábrica de provider                      |
| `src/lib/ai/schema.ts`                 | Schemas Zod da IA                        |
| `src/lib/ai/prompt.ts`                 | Prompts de classificação e ortografia    |
| `src/lib/ai/classify.ts`               | Chamada `generateObject` e tratamento    |
| `src/lib/spell/suggest.ts`             | Validação de sugestões ortográficas      |
| `src/lib/rate-limit.ts`                | Rate limit Upstash + fallback em memória |
| `src/lib/env.ts`                       | Leitura centralizada de variáveis        |
| `src/config/report-rules.ts`           | Presets e regras centralizadas           |
| `src/data/samples.ts`                  | Laudos fictícios                         |

## 3. Fluxo de formatação

1. **Entrada**: o cliente envia `{ text, preset }`.
2. **Validação**: vazio, tamanho e número de linhas.
3. **Segmentação** (`segment.ts`):
   - normaliza NFC e quebras de linha;
   - cria `SourceLine[]` com `id`, `text`, `start`, `end`;
   - ignora linhas vazias;
   - aplica limites.
4. **Classificação** (`classify.ts`):
   - monta o prompt com IDs e textos;
   - chama `generateObject` com schema Zod;
   - recebe `blocks` e `emphasis`;
   - em caso de erro, retorna `null` para o pipeline.
5. **Validação** (`validate.ts`):
   - transforma a classificação em um mapa `lineId → tipo`;
   - linhas faltantes usam heurística;
   - reconstrói blocos contíguos na ordem original;
   - valida spans de itálico.
6. **Renderização** (`render.ts`):
   - aplica negrito estrutural;
   - aplica itálico validado;
   - monta linhas e linhas em branco;
   - serializa com `<br>`;
   - escapa HTML.
7. **Resposta**: `{ html, warnings, meta }`.

## 4. Contrato da IA

### Entrada enviada ao modelo

```json
{
  "preset": "citologia",
  "lines": [{ "id": 0, "text": "LAUDO CITOLÓGICO" }]
}
```

### Saída esperada

```json
{
  "blocks": [{ "lineIds": [0], "type": "document_title", "confidence": 0.98 }],
  "emphasis": [{ "lineId": 4, "start": 20, "end": 36, "style": "italic" }],
  "warnings": []
}
```

A IA não devolve o texto. Isso é a principal defesa contra reescrita e alucinação.

## 5. Validação e repair

- Cada linha não vazia deve aparecer exatamente uma vez.
- IDs desconhecidos são descartados.
- Duplicatas mantêm a primeira ocorrência.
- Linhas faltantes recebem o tipo heurístico.
- Blocos são reconstruídos por linhas consecutivas do mesmo tipo.
- Spans de itálico:
  - `start >= 0`, `end > start`, `end <= linha.length`;
  - sem sobreposição;
  - máximo de 50;
  - texto coberto não pode ser vazio.

## 6. Fallback heurístico

O fallback é usado quando:

- não há chave de API;
- o provider está em modo `mock`;
- a chamada demora mais de 20 segundos;
- a resposta falha no schema;
- a quota do provedor é excedida.

Ele classifica linhas com regras de texto:

- primeira linha em caixa alta com LAUDO/EXAME/RELATÓRIO → título;
- palavras de seção do preset → seção;
- `Rótulo: valor` → campo;
- marcadores de lista → item;
- CRM/CRF/médico responsável → assinatura;
- restante → parágrafo.

O resultado inclui `usedFallback: true` e um warning para a UI.

## 7. Segurança

| Vetor               | Controle                                               |
| ------------------- | ------------------------------------------------------ |
| XSS no laudo        | Escape de `&`, `<`, `>` antes das tags                 |
| Tags não permitidas | Renderer só emite `<b>`, `<i>`, `<br>`                 |
| Prompt injection    | System prompt restritivo + schema + validação          |
| Abuso/custo         | Rate limit, limites de entrada, timeout                |
| Vazamento de chave  | A chave fica apenas no servidor                        |
| Dados sensíveis     | Sem persistência, logs sem texto, aviso de privacidade |
| IP pessoal          | Hash com salt antes de usar no rate limit              |
| Clickjacking        | `X-Frame-Options: DENY`                                |
| MIME sniffing       | `X-Content-Type-Options: nosniff`                      |

## 8. Rate limit

- Upstash Redis quando configurado.
- Fallback em memória por instância em desenvolvimento.
- Chave: `kind + hash(IP + salt)`.
- Janela deslizante de 1 minuto.
- Formatação: 10/min. Ortografia: 5/min.
- Resposta 429 com `Retry-After` e `X-RateLimit-*`.

## 9. Performance

- Entrada máxima: 20.000 caracteres / 500 linhas.
- `maxDuration = 30` na Route Handler.
- Timeout da IA: 20 segundos.
- Sem streaming no MVP; a UI mostra skeleton e status.
- Sem cache de conteúdo para evitar persistência de dados sensíveis.

## 10. Decisões arquiteturais

- [ADR 0001](./adr/0001-deterministic-renderer.md): IA classifica, código renderiza.
- [ADR 0002](./adr/0002-provider-agnostic.md): Vercel AI SDK provider-agnostic.
- [ADR 0003](./adr/0003-three-tags-output.md): saída restrita a `<b>`, `<i>`, `<br>`.
- [ADR 0004](./adr/0004-rate-limit-and-privacy.md): rate limit e privacidade no demo.

## 11. Observabilidade

- Logs apenas com `requestId`, status, duração, contagem de caracteres e modo
  (IA/fallback).
- Nunca logar o texto do laudo.
- Erros inesperados retornam mensagem genérica e `requestId`.
- O `requestId` também é enviado no header `x-request-id`.
