# Especificação do produto — laudo-format

## 1. Visão

`laudo-format` é uma aplicação web que recebe o texto bruto de um laudo descritivo
(citologia, histopatologia e documentos semelhantes), identifica sua estrutura e
devolve o mesmo conteúdo formatado para colagem em sistemas que aceitam apenas as
tags `<b>`, `<i>` e `<br>`.

O produto não reescreve o laudo. A IA identifica títulos, seções, campos, parágrafos,
listas e assinaturas; um renderizador determinístico aplica negrito, itálico,
quebras de linha e espaçamento usando exclusivamente as três tags permitidas.

## 2. Problema

Laudos chegam em formatos irregulares: títulos misturados com o corpo, campos sem
destaque, quebras de linha inconsistentes e excesso de linhas em branco. A
formatação manual é repetitiva, sujeita a erro e consome tempo. Ferramentas
genéricas de IA tendem a reescrever o texto, o que é inaceitável em um documento
médico.

## 3. Público-alvo

| Persona                  | Necessidade                                                                |
| ------------------------ | -------------------------------------------------------------------------- |
| Médico(a) patologista    | Padronizar o laudo antes de colar no sistema institucional                 |
| Secretária/assistente    | Preparar documentos recebidos em texto bruto                               |
| Desenvolvedor/recrutador | Avaliar um projeto de portfólio com IA aplicada, testes e boa documentação |

## 4. Objetivos

1. Preservar integralmente palavras, números, pontuação e acentuação do texto original.
2. Identificar a estrutura lógica do laudo com auxílio de IA.
3. Aplicar formatação determinística e previsível.
4. Gerar um fragmento HTML contendo apenas `<b>`, `<i>` e `<br>`.
5. Oferecer sugestões ortográficas opcionais, nunca aplicadas automaticamente.
6. Funcionar mesmo sem IA, por meio de um classificador heurístico de fallback.
7. Ser simples de executar, testar, documentar e publicar na Vercel.

## 5. Fora de escopo

- Login, contas, histórico ou persistência de laudos.
- Banco de dados.
- Upload de PDF, DOCX ou imagens.
- Integração com prontuário eletrônico, HL7 ou FHIR.
- Emissão de diagnóstico, interpretação clínica ou validação médica.
- Tradução, reescrita, resumo ou correção automática.
- Múltiplos idiomas na interface.
- Uso com dados reais de pacientes no demo público.

## 6. Requisitos funcionais

### FR-01 — Entrada de texto

O usuário deve colar o texto bruto em um campo de entrada, visualizar a contagem de
caracteres e linhas, limpar o campo e carregar um laudo fictício de exemplo.

### FR-02 — Limites de entrada

A aplicação deve recusar texto vazio, acima de 20.000 caracteres ou acima de 500
linhas não vazias, com mensagem clara.

### FR-03 — Segmentação

O servidor deve normalizar quebras de linha, dividir o texto em linhas não vazias,
atribuir IDs e offsets estáveis e preservar o conteúdo de cada linha.

### FR-04 — Classificação por IA

A IA deve agrupar linhas em blocos e classificá-los como `document_title`,
`section_heading`, `field`, `paragraph`, `list_item`, `note` ou `signature`.
A IA não pode retornar o texto reescrito: apenas IDs de linhas, tipos e spans de
itálico.

### FR-05 — Validação e fallback

A resposta da IA deve ser validada com Zod. Linhas ausentes, duplicadas ou fora de
ordem devem ser corrigidas. Se a IA falhar, o servidor deve aplicar um classificador
heurístico e retornar `usedFallback: true`.

### FR-06 — Renderização determinística

O renderizador deve gerar HTML usando somente `<b>`, `</b>`, `<i>`, `</i>` e `<br>`.
Todo texto de entrada deve ser escapado antes da inserção das tags.

### FR-07 — Preservação do conteúdo

Removendo as tags e decodificando entidades, a sequência de caracteres não brancos
do HTML deve ser idêntica à sequência do texto de entrada normalizado.

### FR-08 — Espaçamento e quebras

O renderizador deve aplicar as regras do preset selecionado, remover linhas em
branco no início/fim, limitar a uma linha em branco consecutiva e nunca emitir
`<br>` duplicado no fim.

### FR-09 — Saída e ações

O usuário deve visualizar uma pré-visualização formatada, ver o HTML exato, copiar
o fragmento e baixar o resultado.

### FR-10 — Sugestões ortográficas

O usuário pode solicitar sugestões sob demanda. Cada sugestão deve ser exibida com o
trecho original, a sugestão e o motivo. Nada deve ser alterado sem clique em
“Aplicar”.

### FR-11 — Privacidade e abuso

A aplicação não deve persistir o texto. Deve exibir aviso para não usar dados reais de
pacientes, aplicar rate limit e limitar o tamanho das requisições.

### FR-12 — Presets

O MVP deve oferecer os presets `generico` e `citologia`. O preset influencia
heurísticas e reconhecimento de seções, sem alterar a garantia de preservação.

### FR-13 — Exemplos

A aplicação deve incluir pelo menos três laudos fictícios realistas, usados na
interface, na documentação e nos testes.

## 7. Requisitos não funcionais

| Código | Requisito                                                          |
| ------ | ------------------------------------------------------------------ |
| NFR-01 | Next.js + TypeScript com `strict: true`                            |
| NFR-02 | Nenhum texto de laudo em logs, banco ou armazenamento local        |
| NFR-03 | HTML de saída restrito a `<b>`, `<i>` e `<br>`                     |
| NFR-04 | Escape de HTML testado contra `<script>`, atributos e entidades    |
| NFR-05 | Rate limit por IP hasheado: 10 formatações/min e 5 ortografias/min |
| NFR-06 | Resposta de formatação em até 30 segundos (limite da função)       |
| NFR-07 | Funcionamento em viewport desktop e mobile                         |
| NFR-08 | Acessibilidade: labels, foco visível, `aria-live`, contraste       |
| NFR-09 | Cobertura mínima de 80% em `src/lib`, `src/config`                 |
| NFR-10 | Build, lint, typecheck, testes unitários e E2E no CI               |

## 8. Histórias de usuário e critérios de aceitação

### US-01 — Formatar um laudo

Como usuário, quero colar um laudo bruto e receber o mesmo conteúdo formatado.

**Critérios**

- Dado um texto com título, campos e seções, quando eu clico em “Formatar laudo”,
  então recebo uma pré-visualização e o HTML correspondente.
- O HTML contém apenas `<b>`, `<i>` e `<br>`.
- Nenhuma palavra, número ou pontuação é alterada.

### US-02 — Preservar o conteúdo

Como usuário, quero ter certeza de que a IA não reescreveu meu laudo.

**Critérios**

- A resposta da IA contém apenas IDs de linhas, tipos e spans de itálico.
- Um teste automatizado compara os caracteres não brancos da entrada e da saída.
- As tags `<b>` são aplicadas somente a títulos, seções e rótulos.
- As tags `<i>` vêm de spans validados e não alteram o texto.

### US-03 — Continuar funcionando sem IA

Como usuário, quero que a ferramenta funcione mesmo se a IA estiver indisponível.

**Critérios**

- Sem chave de API, a formatação heurística é aplicada.
- A interface exibe “Modo básico” e um aviso.
- O status HTTP é 200, não 5xx.

### US-04 — Copiar o resultado

Como usuário, quero copiar o HTML e colar no meu sistema de laudo.

**Critérios**

- O botão “Copiar HTML” copia exatamente o fragmento exibido na aba HTML.
- O botão exibe confirmação visual após copiar.
- O download contém o mesmo fragmento.

### US-05 — Sugestões ortográficas

Como usuário, quero ver sugestões de correção sem que o texto seja alterado.

**Critérios**

- As sugestões listam trecho original, sugestão e motivo.
- “Ignorar” remove a sugestão da lista sem alterar o texto.
- “Aplicar” altera o texto do editor e solicita nova formatação.
- Sem ação do usuário, o HTML permanece idêntico.

### US-06 — Privacidade

Como responsável pelo deploy, quero evitar uso indevido com dados sensíveis.

**Critérios**

- O aviso de privacidade é visível na primeira visita.
- O texto não é gravado em banco, logs ou localStorage.
- O rate limit retorna 429 com `Retry-After`.
- A documentação explica que o free tier do Gemini não é adequado para PHI.

### US-07 — Mobile

Como usuário mobile, quero usar a ferramenta sem zoom horizontal.

**Critérios**

- Os painéis empilham em telas pequenas.
- Os botões permanecem acessíveis.
- A pré-visualização não causa overflow horizontal.

## 9. Regras de formatação

As regras completas estão em [RULES.md](./RULES.md). Resumo:

- Título: `<b>texto</b>` + linha em branco.
- Seção: `<b>texto</b>` com linha em branco antes e depois.
- Campo: `<b>Rótulo:</b> valor`.
- Parágrafo: linhas unidas com um espaço; linha em branco entre blocos.
- Lista: marcador original preservado; itens consecutivos sem linha em branco.
- Assinatura: linhas individuais; linha em branco antes.
- Itálico: apenas spans validados; nunca altera o texto.
- Máximo de uma linha em branco consecutiva.

## 10. Contratos de API

Detalhados em [API.md](./API.md).

- `POST /api/format`: recebe `{ text, preset }` e devolve `{ html, warnings, meta }`.
- `POST /api/spellcheck`: recebe `{ text }` e devolve `{ suggestions, warnings, meta }`.

## 11. Riscos e mitigação

| Risco                                | Mitigação                                                    |
| ------------------------------------ | ------------------------------------------------------------ |
| IA classificar incorretamente        | Fallback heurístico, warnings e confiança por bloco          |
| IA tentar reescrever o texto         | A IA só devolve IDs e offsets; renderer usa o texto original |
| Prompt injection no texto            | Prompt de sistema restritivo + validação de schema           |
| XSS via texto colado                 | Escape de HTML + testes dedicados                            |
| Dados sensíveis no demo              | Aviso, ausência de persistência e documentação               |
| Estouro de quota/custo               | Rate limit, limites de entrada e fallback                    |
| Regras não atenderem todos os laudos | Presets e configuração centralizada                          |
| Hífen no fim de linha                | Documentado como limitação; conteúdo preservado              |

## 12. Métricas de sucesso

- 100% dos testes de invariante passando.
- Nenhum caractere não branco perdido em laudos de exemplo.
- Formatação em menos de 30 segundos no percentil 95.
- Fluxo completo utilizável em desktop e mobile.
- Repositório com histórico atômico, CI verde e documentação reproduzível.
