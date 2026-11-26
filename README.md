# ListaCOD

Aplicação web leve em HTML5, CSS3 e JavaScript puro para consultar itens por **COD** ou descrição (a partir da base embarcada em `js/base.js`), registrar saídas com quantidade e unidade (`cx`, `un`, `kg`), salvar listas no histórico local, exportar para Excel (`.xlsx`) e gerar impressão/PDF.

## Funcionalidades

* **Consulta rápida por COD ou texto:** busca exata por código, prefixo ou trecho da descrição com sugestões via `<datalist>` e pré-visualização do item selecionado.
* **Registro de saídas com unidade:** entrada de quantidade, seleção de unidade (`cx`, `un`, `kg`), forma de saída (`Venda`, `Consumo interno`, `Transferência`, `Devolução`, `Avaria / Descarte`, `Doação`, `Outro`) e observação opcional por item.
* **Resumo e controle da lista:** total de itens e soma separada por unidade (`cx`, `un`, `kg`), metadados da operação (identificação da lista, responsável e destino/observação geral) e remoção individual ou limpeza completa.
* **Histórico local (`localStorage`):** salva até 50 listas no navegador e permite reabrir qualquer lista salva para edição ou exportação.
* **Exportação e impressão:** exporta a lista atual para `.xlsx` usando SheetJS (`xlsx.full.min.js`) e oferece visualização otimizada para impressão/PDF (`@media print`).

## Estrutura de pastas

```text
listacod/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── base.js
│   └── app.js
├── README.md
├── DOCUMENTACAO.md
└── CHANGELOG.md
