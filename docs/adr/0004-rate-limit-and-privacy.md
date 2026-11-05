# ADR 0004 — Rate limit e privacidade no demo público

- Status: aceito
- Data: 2026-11-05

## Contexto

O demo será público e usa uma chave de IA gratuita com quota limitada. O texto pode
conter dados sensíveis, mesmo que o uso esperado seja apenas com laudos fictícios.

## Decisão

- Não persistir o texto em banco, logs ou localStorage.
- Exibir aviso explícito para não colar dados reais de pacientes.
- Aplicar rate limit por IP hasheado: 10/min para formatação e 5/min para ortografia.
- Usar Upstash Redis quando configurado; fallback em memória em desenvolvimento.
- Limitar entrada a 20.000 caracteres e 500 linhas.
- Nunca habilitar `ALLOW_MOCK_AI` em produção.
- Documentar que o free tier do Gemini não é adequado para PHI.

## Consequências

**Positivas**

- Reduz risco de abuso e custo inesperado.
- Evita persistência acidental de dados sensíveis.
- Deixa claras as limitações do demo.

**Negativas**

- Rate limit em memória não é consistente entre instâncias.
- Usuários legítimos podem esbarrar no limite.
- O texto ainda é enviado ao provedor de IA; a privacidade não é absoluta.

## Alternativas consideradas

- Autenticação: aumentaria o atrito e o escopo do MVP.
- Sem limite: risco de custo e abuso inaceitável em demo público.
