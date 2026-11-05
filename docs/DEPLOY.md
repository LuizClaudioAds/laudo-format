# Deploy — laudo-format

## 1. Pré-requisitos

- Conta na [Vercel](https://vercel.com) (plano Hobby).
- Chave do [Google AI Studio](https://aistudio.google.com/app/apikey) para o Gemini.
- Conta gratuita no [Upstash](https://upstash.com) para rate limit distribuído
  (recomendado).
- Repositório no GitHub: <https://github.com/LuizClaudioAds/laudo-format>.

## 2. Importar na Vercel

1. Acesse o dashboard da Vercel e clique em **Add New → Project**.
2. Importe o repositório `LuizClaudioAds/laudo-format`.
3. Framework preset: **Next.js** (detectado automaticamente).
4. Build command: `npm run build`.
5. Output directory: padrão (`.next`).
6. Não altere o install command.

## 3. Variáveis de ambiente

Configure em **Project → Settings → Environment Variables** para Production,
Preview e Development:

| Variável                       | Obrigatória | Exemplo            | Descrição                 |
| ------------------------------ | ----------- | ------------------ | ------------------------- |
| `AI_PROVIDER`                  | sim         | `google`           | Provider de IA            |
| `AI_MODEL`                     | sim         | `gemini-2.5-flash` | Modelo usado              |
| `GOOGLE_GENERATIVE_AI_API_KEY` | sim para IA | `AIza...`          | Chave do Google AI Studio |
| `UPSTASH_REDIS_REST_URL`       | recomendado | `https://...`      | URL do Redis              |
| `UPSTASH_REDIS_REST_TOKEN`     | recomendado | `AX...`            | Token do Redis            |
| `IP_HASH_SALT`                 | recomendado | string aleatória   | Salt do hash de IP        |
| `RATE_LIMIT_FORMAT`            | não         | `10`               | Formatações por minuto    |
| `RATE_LIMIT_SPELL`             | não         | `5`                | Ortografias por minuto    |
| `ALLOW_MOCK_AI`                | não         | `false`            | Nunca `true` em produção  |
| `NEXT_PUBLIC_APP_URL`          | não         | `https://...`      | URL pública               |

> A ausência da chave do Gemini não quebra o deploy: a aplicação usa o classificador
> heurístico e exibe “Modo básico”. Ainda assim, configure a chave para o demo completo.

## 4. Gemini

1. Crie uma chave no Google AI Studio.
2. Adicione em `GOOGLE_GENERATIVE_AI_API_KEY`.
3. Ajuste `AI_MODEL` se necessário. O default do projeto é `gemini-2.5-flash`.
4. O free tier tem quotas e pode usar dados enviados para melhoria do produto.
   **Não use dados reais de pacientes no demo público.** Para uso clínico real, é
   necessário um plano/contrato compatível com PHI e revisão jurídica.

## 5. Upstash

1. Crie um banco Redis gratuito no Upstash.
2. Copie `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
3. Sem essas variáveis, o rate limit usa memória por instância — útil em
   desenvolvimento, mas inconsistente em produção com múltiplas instâncias.

## 6. Deploy

Após configurar as variáveis:

1. Clique em **Deploy**.
2. Aguarde o build.
3. Abra a URL de produção.
4. Teste:
   - carregar um exemplo;
   - formatar;
   - copiar o HTML;
   - solicitar sugestões ortográficas;
   - verificar o aviso de privacidade.
5. Copie a URL para o README (`NEXT_PUBLIC_APP_URL` opcional).

## 7. Preview deployments

A integração Git da Vercel cria um preview por pull request. Configure as mesmas
variáveis para o ambiente **Preview**, de preferência com uma chave de IA separada e
limites menores.

## 8. CI

O workflow `.github/workflows/ci.yml` roda em pushes e pull requests:

- lint;
- typecheck;
- testes unitários e de integração;
- build de produção;
- E2E com provider mock.

A Vercel faz o deploy independentemente do CI. Recomenda-se proteger `main` exigindo
o check de CI verde antes do merge.

## 9. Segurança operacional

- Nunca commitar `.env` ou chaves.
- Usar chaves diferentes para produção e preview quando possível.
- Configurar `IP_HASH_SALT` com valor aleatório.
- Revisar os logs da Vercel: o app não registra o texto do laudo.
- Monitorar quota do Gemini e erros 429.
- Manter `ALLOW_MOCK_AI=false` em produção.

## 10. Limites da Vercel Hobby

- Funções têm limite de duração; o projeto usa `maxDuration = 30`.
- O free tier tem limites de banda e invocações.
- Para uso real, considere plano pago e observabilidade dedicada.

## 11. Troubleshooting

| Sintoma               | Causa provável          | Solução                                                           |
| --------------------- | ----------------------- | ----------------------------------------------------------------- |
| “Modo básico” sempre  | Chave ausente/inválida  | Conferir `GOOGLE_GENERATIVE_AI_API_KEY`                           |
| 429 frequente         | Rate limit ou quota     | Ajustar limites/plano                                             |
| Erro 500              | Configuração inválida   | Ver logs da Vercel pelo `requestId`                               |
| HTML vazio            | Texto vazio ou inválido | Conferir mensagem da API                                          |
| Preview sem quebras   | CSS do alvo             | O fragmento usa `<br>`; o sistema de destino deve renderizar HTML |
| Deploy sem rate limit | Upstash não configurado | Configurar URL/token                                              |

## 12. Rollback

Use **Deployments → Promote to Production** em um deployment anterior ou faça
`git revert` do commit problemático e push para `main`.
