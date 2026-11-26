
Documentação Técnica — ListaCOD
1. Visão Geral da Arquitetura
O ListaCOD é uma aplicação web client-side sem backend próprio. Os dados de catálogo são carregados na inicialização a partir do objeto global BASE_PRODUTOS_FIXA definido em js/base.js, e o estado operacional (lista em andamento e histórico de listas) é persistido no localStorage do navegador.

Arquivos principais
index.html: define a estrutura semântica da interface em três blocos principais (1. Registrar Saída, 2. Itens que Saíram e 3. Listas Salvas), carrega css/styles.css, a biblioteca SheetJS (xlsx@0.20.3) via CDN, js/base.js e js/app.js.

css/styles.css: estiliza layout responsivo em grid (390px + 1fr no desktop, colapsando abaixo de 960px), cartões, botões, tabelas, itens do histórico e regras @media print para ocultar elementos .no-print na impressão.

js/base.js: declara BASE_PRODUTOS_FIXA mapeando cada código (COD) para a respectiva descrição textual do item.

js/app.js: gerencia a hidratação do catálogo em memória (Map), busca/correspondência, validação de formulário, formatação numérica (pt-BR), totalização por unidade, persistência em localStorage, exportação .xlsx e renderização do DOM.

2. Fluxo de Dados e Persistência
Carregamento da base (carregarBaseEmbutida)
Lê BASE_PRODUTOS_FIXA (se existir e for um objeto não nulo).

Normaliza o código com trim() e ignora entradas sem código ou sem descrição.

Armazena os registros em baseProdutos (Map<string, { codigo, descricao }>) e popula até 2000 opções no <datalist id="sugestoesCod">.

Busca e seleção (buscarPorCodigoOuTexto)
Verifica correspondência exata na chave do Map (baseProdutos.has(q)).

Caso não haja correspondência exata, percorre baseProdutos.values() procurando código que comece com o termo (startsWith) ou descrição que contenha o termo (includes, case-insensitive).

Exibe o cartão #itemPreview quando encontrado ou apresenta mensagem de erro em #feedbackMsg caso não localize.

Chaves de localStorage
listacod_lista_atual_v1: armazena o array listaAtual com os itens adicionados na sessão atual.

listacod_historico_v1: armazena até 50 listas salvas (id, numero, responsavel, destino, dataHora, itens).

3. Regras de Quantidade, Unidades e Exportação
Unidades suportadas (normalizarUnidade): cx (Caixas), un (Unidades) e kg (Kg).

Resumo de totais (montarResumoTotais): soma as quantidades separadamente por cx, un e kg, exibindo apenas as unidades com total maior que zero no formato pt-BR (até 3 casas decimais).

Exportação Excel (exportarExcel): gera uma planilha Saidas com as colunas Lista, Data_Hora, Responsavel, Destino, COD, Descricao, Quantidade, Unidade, Forma_Saida e Observacao, salvando como <Identificacao_da_Lista>.xlsx (ou lista_saidas.xlsx quando vazio).

4. Segurança e Limitações Conhecidas
A função escapeHtml() escapa &, <, > e " antes de inserir valores dinâmicos no HTML via template strings.

Por depender do localStorage do navegador, o histórico e a lista atual ficam vinculados ao navegador e ao dispositivo utilizados (e à origem file:// ou https://wllslz.github.io/listacod/).

O carregamento de xlsx.full.min.js depende de acesso à CDN no momento do uso da exportação para Excel.
