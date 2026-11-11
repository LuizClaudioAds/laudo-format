# API — laudo-format

Todos os endpoints usam JSON, o runtime Node.js e `Cache-Control: no-store`.

## Headers comuns

| Header                           | Direção      | Descrição                      |
| -------------------------------- | ------------ | ------------------------------ |
| `Content-Type: application/json` | request      | Obrigatório para POST          |
| `x-request-id`                   | response     | ID de correlação da requisição |
| `Cache-Control: no-store`        | response     | Impede cache do conteúdo       |
| `Retry-After`                    | response 429 | Segundos até nova tentativa    |
| `X-RateLimit-Limit`              | response     | Limite da janela               |
| `X-RateLimit-Remaining`          | response     | Requisições restantes          |
| `X-RateLimit-Reset`              | response     | Timestamp de reset             |

As respostas também carregam os headers globais de segurança definidos em
`next.config.ts` (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
`Permissions-Policy` e CSP mínima com `frame-ancestors 'none'`).

## POST /api/format

Formata um laudo bruto.

### Request

```json
{
  "text": "LAUDO CITOLÓGICO\nPaciente: Maria...\n...",
  "preset": "citologia"
}
```

| Campo    | Tipo                        | Obrigatório | Descrição            |
| -------- | --------------------------- | ----------- | -------------------- |
| `text`   | string                      | sim         | Texto bruto do laudo |
| `preset` | `"generico" \| "citologia"` | não         | Padrão: `generico`   |

### Limites

- 20.000 caracteres no texto normalizado.
- 500 linhas não vazias.
- Corpo máximo da requisição: 64 KB.

### Response 200

```json
{
  "html": "<b>LAUDO CITOLÓGICO</b><br><br><b>Paciente:</b> Maria...",
  "warnings": [],
  "meta": {
    "provider": "google",
    "model": "gemini-3.8-flash",
    "usedFallback": false,
    "durationMs": 1840,
    "characters": 1240,
    "lines": 42,
    "blocks": 18
  }
}
```

| Campo               | Descrição                                  |
| ------------------- | ------------------------------------------ |
| `html`              | Fragmento com apenas `<b>`, `<i>` e `<br>` |
| `warnings`          | Avisos legíveis (ex.: fallback aplicado)   |
| `meta.provider`     | `google` ou `mock`                         |
| `meta.model`        | Modelo configurado                         |
| `meta.usedFallback` | `true` quando a IA não foi usada           |
| `meta.durationMs`   | Tempo total do processamento               |
| `meta.characters`   | Caracteres normalizados                    |
| `meta.lines`        | Linhas não vazias                          |
| `meta.blocks`       | Blocos renderizados                        |

### Erros

| Status | Código                   | Quando                                 |
| ------ | ------------------------ | -------------------------------------- |
| 400    | `INVALID_JSON`           | Corpo inválido ou ausente              |
| 400    | `INVALID_INPUT`          | `text` não é string ou preset inválido |
| 400    | `EMPTY_INPUT`            | Nenhuma linha não vazia                |
| 413    | `INPUT_TOO_LARGE`        | Acima de 20.000 caracteres             |
| 413    | `TOO_MANY_LINES`         | Acima de 500 linhas                    |
| 415    | `UNSUPPORTED_MEDIA_TYPE` | `Content-Type` diferente de JSON       |
| 429    | `RATE_LIMITED`           | Limite de requisições excedido         |
| 500    | `INTERNAL_ERROR`         | Falha inesperada                       |

Formato de erro:

```json
{
  "error": {
    "code": "INPUT_TOO_LARGE",
    "message": "O texto excede o limite de 20.000 caracteres.",
    "requestId": "4d0f0b4e-..."
  }
}
```

## POST /api/spellcheck

Sugere correções ortográficas sem alterar o texto.

### Request

```json
{
  "text": "Paciente: Maria das Graças Almeida\n..."
}
```

### Response 200

```json
{
  "suggestions": [
    {
      "lineId": 1,
      "start": 16,
      "end": 22,
      "original": "Gracas",
      "suggestion": "Graças",
      "reason": "Acentuação",
      "confidence": 0.9
    }
  ],
  "warnings": [],
  "meta": {
    "provider": "google",
    "model": "gemini-3.8-flash",
    "usedFallback": false,
    "durationMs": 900
  }
}
```

> O exemplo acima é ilustrativo; o modelo só deve retornar sugestões quando houver
> uma correção plausível.

| Campo           | Descrição                                   |
| --------------- | ------------------------------------------- |
| `lineId`        | ID da linha não vazia, na ordem do texto    |
| `start` / `end` | Offsets UTF-16 dentro da linha normalizada  |
| `original`      | Trecho exato que deve coincidir com o texto |
| `suggestion`    | Correção sugerida                           |
| `reason`        | Justificativa curta                         |
| `confidence`    | 0 a 1                                       |

Sugestões inválidas são descartadas no servidor. Sem IA disponível, o endpoint
retorna `suggestions: []` e um warning, com status 200.

### Erros

Os mesmos erros e limites do `/api/format`, com rate limit de 5 requisições por
minuto.

## Rate limit

| Endpoint               | Limite                     |
| ---------------------- | -------------------------- |
| `POST /api/format`     | 10 req/min por IP hasheado |
| `POST /api/spellcheck` | 5 req/min por IP hasheado  |

Quando o Upstash não está configurado, o fallback em memória é usado por instância.
Em produção, recomenda-se configurar Upstash para um limite consistente.

## GET /api/health

Diagnóstico público, sem segredos e sem chamada ao provedor de IA. Serve para conferir
o que o runtime do deploy está enxergando.

```json
{
  "ok": true,
  "aiProvider": "google",
  "aiModel": "gemini-3.8-flash",
  "googleConfigured": true,
  "upstashConfigured": true,
  "mockAllowed": false
}
```

A resposta inclui `Cache-Control: no-store` e `x-request-id`; nunca expõe chave, token,
URL de Redis ou o texto do laudo.

## Exemplo com curl

```bash
curl -X POST http://localhost:3000/api/format \
  -H "Content-Type: application/json" \
  -d '{"text":"LAUDO CITOLOGICO\nPaciente: Maria\nCONCLUSAO\nSem alteracoes.","preset":"citologia"}'
```
