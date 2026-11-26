# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

## [Unreleased]

### Alterado
* Layout de exportação Excel (`.xlsx`) atualizado para o formato oficial **CAUTELA DE SAIDA**, sem linhas de grade, com cabeçalho de separação (`DATA DE SEPARAÇÃO`, `RESPONSÁVEL DA SEPARAÇÃO`), tabela bordada (`Cód`, `DESCRICÃO`, `QTD` com unidade e `TIPO`) e bloco de confirmação com assinatura do responsável no rodapé.

### Adicionado
* Seletor de **Unidade** (`cx`, `un`, `kg`) no formulário, na tabela, no resumo de totais, no histórico e na planilha exportada.
* Base embarcada em `js/base.js` com 7.349 produtos.
* `README.md`, `DOCUMENTACAO.md` e `CHANGELOG.md`.

### Corrigido
* Botão **Abrir Lista** no histórico alterado para vincular `addEventListener` diretamente aos elementos renderizados.
