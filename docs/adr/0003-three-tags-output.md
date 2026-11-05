# ADR 0003 — Saída restrita a `<b>`, `<i>` e `<br>`

- Status: aceito
- Data: 2026-11-05

## Contexto

O sistema de destino dos laudos aceita apenas três tags HTML: `<b>`, `<i>` e `<br>`.
Uma saída semântica com `<h1>`, `<p>` e `<ul>` não seria compatível.

## Decisão

O renderer emite exclusivamente `<b>`, `</b>`, `<i>`, `</i>` e `<br>`. O preview no
app usa CSS próprio para exibir o fragmento. O espaçamento é controlado por sequências
de `<br>`, com no máximo uma linha em branco consecutiva.

## Consequências

**Positivas**

- Compatibilidade direta com o sistema de destino.
- Superfície de HTML pequena e fácil de escapar/testar.
- Preview e cópia usam exatamente o mesmo fragmento.

**Negativas**

- Menos semântica e acessibilidade no HTML exportado.
- Espaçamento depende do CSS do sistema de destino.
- Listas não usam `<ul>`/`<li>`; o marcador original é preservado como texto.

## Alternativas consideradas

- HTML semântico: rejeitado por incompatibilidade.
- Markdown: rejeitado porque o destino não aceita Markdown.
