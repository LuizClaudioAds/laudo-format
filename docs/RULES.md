# Regras de formatação — laudo-format

Este documento é normativo. O renderer e os testes devem seguir exatamente as regras
descritas aqui.

## 1. Princípios

1. **Conteúdo imutável**: palavras, números, pontuação, acentos e espaços internos são
   preservados. O sistema altera apenas espaços nas extremidades das linhas, quebras
   de linha e envoltórios `<b>`/`<i>`.
2. **Somente três tags**: a saída contém apenas `<b>`, `</b>`, `<i>`, `</i>` e `<br>`.
   Não são emitidos `<p>`, `<h1>`, `<ul>`, `<div>`, atributos ou estilos.
3. **Negrito é estrutural**: aplicado a títulos, seções e rótulos de campo.
   A IA não decide negrito.
4. **Itálico é assistido**: a IA pode sugerir spans de itálico, que são validados
   antes da renderização. Itálico nunca altera o texto.
5. **Formatação determinística**: a IA classifica; o renderer aplica as regras.

## 2. Normalização de entrada

| Etapa            | Regra                                 |
| ---------------- | ------------------------------------- |
| Unicode          | Normalização NFC                      |
| Quebras          | `\r\n` e `\r` viram `\n`              |
| Linhas           | Divisão por `\n`                      |
| Linhas vazias    | Ignoradas (não fazem parte do modelo) |
| Extremidades     | `trim()` em cada linha                |
| Espaços internos | Preservados                           |

O texto normalizado para fins de invariante é:

```text
linhas.map(linha => linha.trim()).filter(Boolean).join("\n")
```

## 3. Modelo de blocos

| Tipo              | Descrição          | Detecção                                                |
| ----------------- | ------------------ | ------------------------------------------------------- |
| `document_title`  | Título do laudo    | IA; primeira linha; palavras como LAUDO/EXAME/RELATÓRIO |
| `section_heading` | Cabeçalho de seção | IA ou preset (ex.: CONCLUSÃO, DIAGNÓSTICO)              |
| `field`           | Rótulo e valor     | IA + regex de rótulo                                    |
| `paragraph`       | Corpo do laudo     | IA ou fallback                                          |
| `list_item`       | Item de lista      | IA ou marcador `-`, `*`, `•`, `1.`, `1)`                |
| `note`            | Nota/observação    | IA ou prefixo NOTA/OBSERVAÇÃO                           |
| `signature`       | Assinatura         | IA ou CRM/CRF/médico responsável                        |
| `unknown`         | Fallback           | Qualquer linha não classificada                         |

Linhas de parágrafo consecutivas são agrupadas em um único bloco. Campos, itens de
lista e linhas de assinatura permanecem como linhas individuais.

## 4. Regras de renderização

### 4.1 Título do documento

- Envolver a linha inteira em `<b>`.
- Não alterar caixa.
- Uma linha em branco antes (se não for o primeiro bloco) e depois.

```text
LAUDO CITOLÓGICO
```

```html
<b>LAUDO CITOLÓGICO</b><br /><br />
```

### 4.2 Seção

- Envolver a linha inteira em `<b>`.
- Uma linha em branco antes (se não for o primeiro bloco) e depois.
- Se a seção já estiver precedida por linha em branco, não duplicar.

```text
DESCRIÇÃO MICROSCÓPICA
```

```html
<b>DESCRIÇÃO MICROSCÓPICA</b><br /><br />
```

### 4.3 Campo

- Se a linha casar `^([^:\n]{1,60}):\s*(.*)$`, envolver apenas `Rótulo:` em `<b>`.
- O valor não recebe negrito.
- Campos consecutivos usam uma única `<br>` entre si.
- Após o grupo de campos, uma linha em branco.

```text
Paciente: Maria das Graças Almeida
Idade: 42 anos
```

```html
<b>Paciente:</b> Maria das Graças Almeida<br /><b>Idade:</b> 42 anos<br /><br />
```

Se não houver rótulo reconhecível, o campo é renderizado como parágrafo, sem
negrito inventado.

### 4.4 Parágrafo

- Unir as linhas do bloco com um espaço simples.
- Preservar o texto de cada linha.
- Uma linha em branco entre blocos.

```text
A amostra apresenta celularidade
satisfatória para avaliação.
```

```html
A amostra apresenta celularidade satisfatória para avaliação.<br /><br />
```

### 4.5 Item de lista

- Preservar o marcador original no texto.
- Cada item em sua própria linha visual.
- Itens consecutivos sem linha em branco.
- Uma linha em branco após o último item.

```text
- Material insuficiente
- Repetir coleta em 30 dias
```

```html
- Material insuficiente<br />- Repetir coleta em 30 dias<br /><br />
```

### 4.6 Nota

- Se houver rótulo (`NOTA:`, `OBSERVAÇÃO:`), aplicar negrito apenas no rótulo.
- Uma linha em branco antes e depois.

```text
NOTA: resultado deve ser correlacionado com dados clínicos.
```

```html
<b>NOTA:</b> resultado deve ser correlacionado com dados clínicos.<br /><br />
```

### 4.7 Assinatura

- Uma linha em branco antes.
- Cada linha da assinatura em sua própria linha visual.
- Sem negrito automático.

```text
Dra. Helena Martins
CRM 123456-SP
```

```html
<br />Dra. Helena Martins<br />CRM 123456-SP
```

## 5. Itálico

- A IA retorna spans `{ lineId, start, end, style: "italic" }`.
- Offsets usam índices UTF-16 da linha já normalizada.
- Spans inválidos, fora dos limites, vazios ou sobrepostos são descartados.
- Máximo de 50 spans por laudo.
- O texto dentro de `<i>` é idêntico ao original.
- A IA deve priorizar nomes científicos e termos latinos, mas o renderer não
  reescreve nem valida semanticamente o termo.

```text
Cultura positiva para Candida albicans.
```

```html
Cultura positiva para <i>Candida albicans</i>.<br /><br />
```

## 6. Espaçamento

| Situação                      | Resultado                      |
| ----------------------------- | ------------------------------ |
| Início do laudo               | Sem `<br>` inicial             |
| Fim do laudo                  | Sem `<br>` final               |
| Linhas em branco consecutivas | Máximo uma                     |
| Título                        | Linha em branco antes/depois   |
| Seção                         | Linha em branco antes/depois   |
| Campos consecutivos           | Uma `<br>` entre eles          |
| Parágrafos consecutivos       | Uma linha em branco entre eles |
| Itens consecutivos            | Uma `<br>` entre eles          |
| Assinatura                    | Linha em branco antes          |

A serialização usa `<br>` entre entradas. Uma entrada vazia representa uma linha em
branco; portanto, uma linha em branco entre dois conteúdos resulta em `<br><br>`.

## 7. Escape

Antes de inserir tags, o texto é escapado:

| Caractere | Entidade |
| --------- | -------- |
| `&`       | `&amp;`  |
| `<`       | `&lt;`   |
| `>`       | `&gt;`   |

Aspas não precisam de escape em nós de texto, mas podem ser escapadas por defesa em
profundidade.

Exemplo:

```text
Medida < 5 mm & sem alterações.
```

```html
Medida &lt; 5 mm &amp; sem alterações.
```

## 8. Invariantes

Os testes devem garantir:

1. A saída contém somente as tags permitidas.
2. Não existem tags aninhadas indevidamente.
3. Não existem `<br>` no início ou no fim.
4. Não existem três `<br>` consecutivos.
5. Removendo tags, substituindo `<br>` por espaço, decodificando entidades e
   removendo espaços, a saída é igual à entrada normalizada sem espaços.
6. Nenhuma palavra é adicionada, removida, corrigida ou reordenada.
7. Entradas maliciosas como `<script>alert(1)</script>` aparecem como texto escapado.

## 9. Presets

### `generico`

Usa as regras acima e um conjunto padrão de palavras de seção.

### `citologia`

Além das regras gerais, reconhece seções como:

- IDENTIFICAÇÃO
- DADOS CLÍNICOS
- MATERIAL
- DESCRIÇÃO MICROSCÓPICA
- DIAGNÓSTICO
- CONCLUSÃO
- RECOMENDAÇÕES
- OBSERVAÇÕES

O preset não altera o conteúdo nem aplica negrito em termos do corpo do laudo.

## 10. Limitações conhecidas

- Palavras hifenizadas no fim da linha não são reconstruídas; o hífen é preservado.
- Espaços internos múltiplos podem ser colapsados pelo sistema de destino.
- A classificação pode variar para laudos com estrutura atípica.
- Não há validação semântica ou médica do conteúdo.
