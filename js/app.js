(() => {
  "use strict";

  const STORAGE_KEYS = {
    LISTA_ATUAL: "listacod_lista_atual_v1",
    HISTORICO: "listacod_historico_v1"
  };

  const MAX_HISTORICO = 50;
  const MAX_SUGESTOES = 50;
  const UNIDADES_VALIDAS = ["cx", "un", "kg"];

  const els = {
    statusBase: document.getElementById("statusBase"),
    formSaida: document.getElementById("formSaida"),
    inputCod: document.getElementById("inputCod"),
    sugestoesCod: document.getElementById("sugestoesCod"),
    previewProduto: document.getElementById("previewProduto"),
    inputQtd: document.getElementById("inputQtd"),
    selectUnidade: document.getElementById("selectUnidade"),
    selectMotivo: document.getElementById("selectMotivo"),
    inputObsItem: document.getElementById("inputObsItem"),
    btnLimparCampos: document.getElementById("btnLimparCampos"),
    inputNumeroLista: document.getElementById("inputNumeroLista"),
    inputResponsavel: document.getElementById("inputResponsavel"),
    inputDestino: document.getElementById("inputDestino"),
    resumoTotais: document.getElementById("resumoTotais"),
    tbodyItens: document.getElementById("tbodyItens"),
    infoImpressao: document.getElementById("infoImpressao"),
    btnSalvarLista: document.getElementById("btnSalvarLista"),
    btnExportarExcel: document.getElementById("btnExportarExcel"),
    btnImprimir: document.getElementById("btnImprimir"),
    btnNovaLista: document.getElementById("btnNovaLista"),
    btnLimparHistorico: document.getElementById("btnLimparHistorico"),
    listaHistorico: document.getElementById("listaHistorico")
  };

  /** @type {Array<{ codigo: string, codigoUpper: string, descricao: string, descricaoUpper: string }>} */
  let catalogoLista = [];

  /** @type {Map<string, { codigo: string, descricao: string }>} */
  const baseProdutos = new Map();

  /** @type {Array<{ id: string, codigo: string, descricao: string, quantidade: number, unidade: string, motivo: string, obs: string }>} */
  let listaAtual = [];

  /** @type {Array<{ id: string, numero: string, responsavel: string, destino: string, dataHora: string, itens: Array<any> }>} */
  let historicoListas = [];

  function gerarId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizarUnidade(valor) {
    const u = String(valor || "cx").trim().toLowerCase();
    return UNIDADES_VALIDAS.includes(u) ? u : "cx";
  }

  function formatarNumero(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: Number.isInteger(Number(valor)) ? 0 : 2,
      maximumFractionDigits: 3
    });
  }

  function formatarQtdComUnidade(quantidade, unidade) {
    const u = normalizarUnidade(unidade);
    const sufixo = u === "un" ? "unds" : u;
    return `${formatarNumero(quantidade)}${sufixo}`;
  }

  function formatarDataHora(date = new Date()) {
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatarDataCurta(date = new Date()) {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
  }

  function escaparHtml(texto) {
    return String(texto ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function carregarBaseEmbutida() {
    baseProdutos.clear();
    catalogoLista = [];

    const dados = typeof BASE_PRODUTOS_FIXA !== "undefined" && BASE_PRODUTOS_FIXA ? BASE_PRODUTOS_FIXA : {};
    const entradas = Object.entries(dados);

    for (const [codBruto, descBruta] of entradas) {
      const codigo = String(codBruto).trim();
      const descricao = String(descBruta ?? "").trim();
      if (!codigo || !descricao) continue;

      const registro = { codigo, descricao };
      baseProdutos.set(codigo, registro);
      catalogoLista.push({
        codigo,
        codigoUpper: codigo.toUpperCase(),
        descricao,
        descricaoUpper: descricao.toUpperCase()
      });
    }

    atualizarSugestoesDatalist("");
    els.statusBase.textContent = `Base carregada: ${baseProdutos.size.toLocaleString("pt-BR")} produtos`;
  }

  function atualizarSugestoesDatalist(termoBruto = "") {
    const termoUpper = String(termoBruto ?? "").trim().toUpperCase();
    const matches = [];

    if (!termoUpper) {
      for (let i = 0; i < catalogoLista.length && matches.length < MAX_SUGESTOES; i++) {
        matches.push(catalogoLista[i]);
      }
    } else {
      for (let i = 0; i < catalogoLista.length && matches.length < MAX_SUGESTOES; i++) {
        const item = catalogoLista[i];
        if (item.codigoUpper.startsWith(termoUpper) || item.descricaoUpper.includes(termoUpper)) {
          matches.push(item);
        }
      }
    }

    els.sugestoesCod.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (const item of matches) {
      const opt = document.createElement("option");
      opt.value = item.codigo;
      opt.label = `${item.codigo} — ${item.descricao}`;
      fragment.appendChild(opt);
    }
    els.sugestoesCod.appendChild(fragment);
  }

  function buscarProdutoPorEntrada(entradaBruta) {
    const termo = String(entradaBruta ?? "").trim();
    if (!termo) return null;

    const possiveisCodigos = [
      termo,
      termo.split(/\s+/)[0],
      termo.split("—")[0].trim(),
      termo.split("-")[0].trim()
    ];

    for (const cod of possiveisCodigos) {
      if (baseProdutos.has(cod)) {
        return baseProdutos.get(cod);
      }
    }

    const termoUpper = termo.toUpperCase();
    for (const item of catalogoLista) {
      if (item.codigoUpper.startsWith(termoUpper)) {
        return { codigo: item.codigo, descricao: item.descricao };
      }
    }

    if (termoUpper.length >= 2) {
      for (const item of catalogoLista) {
        if (item.descricaoUpper.includes(termoUpper)) {
          return { codigo: item.codigo, descricao: item.descricao };
        }
      }
    }

    return null;
  }

  function atualizarPreviewProduto() {
    const termo = els.inputCod.value.trim();
    atualizarSugestoesDatalist(termo);

    if (!termo) {
      els.previewProduto.className = "produto-preview vazio";
      els.previewProduto.textContent = "Digite um COD para visualizar a descrição do produto.";
      return;
    }

    const produto = buscarProdutoPorEntrada(termo);
    if (produto) {
      els.previewProduto.className = "produto-preview encontrado";
      els.previewProduto.innerHTML = `<strong>COD ${escaparHtml(produto.codigo)}:</strong> ${escaparHtml(produto.descricao)}`;
    } else {
      els.previewProduto.className = "produto-preview nao-encontrado";
      els.previewProduto.textContent = `COD "${termo}" não encontrado na base.`;
    }
  }

  function salvarEstadoAtual() {
    try {
      localStorage.setItem(STORAGE_KEYS.LISTA_ATUAL, JSON.stringify(listaAtual));
    } catch (erro) {
      console.warn("Não foi possível salvar a lista atual no localStorage:", erro);
    }
  }

  function salvarHistoricoStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(historicoListas));
    } catch (erro) {
      console.warn("Não foi possível salvar o histórico no localStorage:", erro);
    }
  }

  function carregarEstadoStorage() {
    try {
      const salvaAtual = localStorage.getItem(STORAGE_KEYS.LISTA_ATUAL);
      if (salvaAtual) {
        const parsed = JSON.parse(salvaAtual);
        if (Array.isArray(parsed)) {
          listaAtual = parsed.map((item) => ({
            ...item,
            unidade: normalizarUnidade(item.unidade)
          }));
        }
      }
    } catch {
      listaAtual = [];
    }

    try {
      const salvoHist = localStorage.getItem(STORAGE_KEYS.HISTORICO);
      if (salvoHist) {
        const parsed = JSON.parse(salvoHist);
        if (Array.isArray(parsed)) {
          historicoListas = parsed;
        }
      }
    } catch {
      historicoListas = [];
    }
  }

  function calcularTotaisPorUnidade(itens) {
    const totais = { cx: 0, un: 0, kg: 0 };
    for (const item of itens) {
      const u = normalizarUnidade(item.unidade);
      totais[u] += Number(item.quantidade) || 0;
    }
    return totais;
  }

  function montarResumoTotais(itens) {
    const totais = calcularTotaisPorUnidade(itens);
    const partes = [];
    if (totais.cx > 0) partes.push(`${formatarNumero(totais.cx)} cx`);
    if (totais.un > 0) partes.push(`${formatarNumero(totais.un)} un`);
    if (totais.kg > 0) partes.push(`${formatarNumero(totais.kg)} kg`);
    return partes.length > 0 ? partes.join(" | ") : "0";
  }

  function renderizarListaAtual() {
    const totalItens = listaAtual.length;
    const resumoUnidades = montarResumoTotais(listaAtual);

    els.resumoTotais.textContent = `${totalItens} ${totalItens === 1 ? "item" : "itens"} | Total: ${resumoUnidades}`;

    const numeroLista = els.inputNumeroLista.value.trim() || "Sem identificação";
    const responsavel = els.inputResponsavel.value.trim() || "Não informado";
    const destino = els.inputDestino.value.trim() || "Não informado";
    els.infoImpressao.textContent = `Lista: ${numeroLista} | Responsável: ${responsavel} | Destino/Obs: ${destino} | Emitido em: ${formatarDataHora()}`;

    if (totalItens === 0) {
      els.tbodyItens.innerHTML = `
        <tr class="linha-vazia">
          <td colspan="8">Nenhum item adicionado ainda. Use o formulário ao lado para lançar os códigos.</td>
        </tr>
      `;
      return;
    }

    els.tbodyItens.innerHTML = listaAtual
      .map((item, index) => {
        const unidade = normalizarUnidade(item.unidade);
        return `
        <tr>
          <td class="col-num">${index + 1}</td>
          <td class="col-cod">${escaparHtml(item.codigo)}</td>
          <td>${escaparHtml(item.descricao)}</td>
          <td class="col-qtd">${formatarNumero(item.quantidade)}</td>
          <td class="col-un"><span class="badge-un">${escaparHtml(unidade)}</span></td>
          <td>${escaparHtml(item.motivo)}</td>
          <td>${escaparHtml(item.obs || "—")}</td>
          <td class="col-acao no-print">
            <button type="button" class="btn-remover" data-remover-id="${escaparHtml(item.id)}" title="Remover item">Remover</button>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  function renderizarHistorico() {
    if (historicoListas.length === 0) {
      els.listaHistorico.innerHTML = `<p class="vazio-historico">Nenhuma lista salva no histórico.</p>`;
      return;
    }

    els.listaHistorico.innerHTML = historicoListas
      .map((registro) => {
        const qtdItens = Array.isArray(registro.itens) ? registro.itens.length : 0;
        const resumo = montarResumoTotais(registro.itens || []);
        return `
          <article class="item-historico">
            <div class="item-historico-info">
              <strong>${escaparHtml(registro.numero || "Lista sem nome")}</strong>
              <span>
                Data: ${escaparHtml(registro.dataHora)} •
                Resp.: ${escaparHtml(registro.responsavel || "—")} •
                Itens: ${qtdItens} •
                Total: ${escaparHtml(resumo)}
              </span>
            </div>
            <div class="item-historico-acoes">
              <button type="button" class="btn btn-secundario btn-abrir-historico" data-abrir-id="${escaparHtml(registro.id)}">Abrir Lista</button>
              <button type="button" class="btn-remover btn-excluir-historico" data-excluir-id="${escaparHtml(registro.id)}">Excluir</button>
            </div>
          </article>
        `;
      })
      .join("");

    els.listaHistorico.querySelectorAll(".btn-abrir-historico").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-abrir-id");
        abrirListaDoHistorico(id);
      });
    });

    els.listaHistorico.querySelectorAll(".btn-excluir-historico").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-excluir-id");
        excluirListaDoHistorico(id);
      });
    });
  }

  function abrirListaDoHistorico(id) {
    const encontrada = historicoListas.find((h) => h.id === id);
    if (!encontrada) return;

    if (listaAtual.length > 0) {
      const confirmar = window.confirm("Substituir a lista atual pelos itens da lista salva selecionada?");
      if (!confirmar) return;
    }

    listaAtual = (encontrada.itens || []).map((item) => ({
      ...item,
      id: item.id || gerarId(),
      unidade: normalizarUnidade(item.unidade)
    }));

    els.inputNumeroLista.value = encontrada.numero || "";
    els.inputResponsavel.value = encontrada.responsavel || "";
    els.inputDestino.value = encontrada.destino || "";

    salvarEstadoAtual();
    renderizarListaAtual();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function excluirListaDoHistorico(id) {
    historicoListas = historicoListas.filter((h) => h.id !== id);
    salvarHistoricoStorage();
    renderizarHistorico();
  }

  function adicionarItemNaLista(evento) {
    evento.preventDefault();

    const termoCod = els.inputCod.value.trim();
    const produto = buscarProdutoPorEntrada(termoCod);

    if (!produto) {
      alert("Selecione ou digite um COD válido existente na base de produtos.");
      els.inputCod.focus();
      return;
    }

    const qtd = Number(els.inputQtd.value);
    if (!Number.isFinite(qtd) || qtd <= 0) {
      alert("Informe uma quantidade válida maior que zero.");
      els.inputQtd.focus();
      return;
    }

    const unidade = normalizarUnidade(els.selectUnidade.value);
    const motivo = els.selectMotivo.value;
    const obs = els.inputObsItem.value.trim();

    listaAtual.push({
      id: gerarId(),
      codigo: produto.codigo,
      descricao: produto.descricao,
      quantidade: qtd,
      unidade,
      motivo,
      obs
    });

    salvarEstadoAtual();
    renderizarListaAtual();

    els.inputCod.value = "";
    els.inputQtd.value = "1";
    els.inputObsItem.value = "";
    atualizarPreviewProduto();
    els.inputCod.focus();
  }

  function salvarListaNoHistorico() {
    if (listaAtual.length === 0) {
      alert("Adicione pelo menos um item à lista antes de salvar.");
      return;
    }

    const numeroInformado = els.inputNumeroLista.value.trim();
    const numeroFinal = numeroInformado || `Saída ${formatarDataHora()}`;

    const registro = {
      id: gerarId(),
      numero: numeroFinal,
      responsavel: els.inputResponsavel.value.trim(),
      destino: els.inputDestino.value.trim(),
      dataHora: formatarDataHora(),
      itens: listaAtual.map((item) => ({
        ...item,
        unidade: normalizarUnidade(item.unidade)
      }))
    };

    historicoListas.unshift(registro);
    if (historicoListas.length > MAX_HISTORICO) {
      historicoListas = historicoListas.slice(0, MAX_HISTORICO);
    }

    salvarHistoricoStorage();
    renderizarHistorico();
    alert(`Lista "${numeroFinal}" salva com sucesso no histórico!`);
  }

  function exportarExcel() {
    if (listaAtual.length === 0) {
      alert("Não há itens na lista para exportar.");
      return;
    }

    if (typeof XLSX === "undefined") {
      alert("Biblioteca de exportação Excel não carregada. Verifique sua conexão com a internet e recarregue a página.");
      return;
    }

    const numeroLista = els.inputNumeroLista.value.trim();
    const responsavel = els.inputResponsavel.value.trim();
    const destino = els.inputDestino.value.trim();
    const dataHoje = formatarDataCurta();

    const bordaFina = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    };

    const estiloTitulo = {
      font: { name: "Calibri", sz: 18, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const estiloInfoCabecalho = {
      font: { name: "Aptos", sz: 18, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "left", vertical: "center" }
    };

    const estiloHeaderTabela = {
      font: { name: "Aptos", sz: 16, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: bordaFina
    };

    const estiloCod = {
      font: { name: "Aptos", sz: 16, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: bordaFina
    };

    const estiloDescricao = {
      font: { name: "Aptos", sz: 12, bold: false, color: { rgb: "000000" } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      border: bordaFina
    };

    const estiloQtd = {
      font: { name: "Aptos", sz: 16, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: bordaFina
    };

    const estiloTipo = {
      font: { name: "Aptos", sz: 12, bold: false, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: bordaFina
    };

    const estiloConfirmacao = {
      font: { name: "Aptos", sz: 11, bold: false, color: { rgb: "000000" } },
      alignment: { horizontal: "left", vertical: "center" }
    };

    const estiloAssinatura = {
      font: { name: "Aptos", sz: 11, bold: false, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const ws = {};
    const merges = [
      { s: { r: 6, c: 0 }, e: { r: 6, c: 3 } }
    ];

    const rowHeights = [];
    for (let r = 0; r < 6; r++) {
      rowHeights[r] = { hpt: 18 };
    }

    const tituloCautela = numeroLista ? `CAUTELA DE SAIDA - ${numeroLista.toUpperCase()}` : "CAUTELA DE SAIDA";
    ws["A7"] = { v: tituloCautela, t: "s", s: estiloTitulo };
    ws["B7"] = { v: "", t: "s", s: estiloTitulo };
    ws["C7"] = { v: "", t: "s", s: estiloTitulo };
    ws["D7"] = { v: "", t: "s", s: estiloTitulo };
    rowHeights[6] = { hpt: 23.25 };

    rowHeights[7] = { hpt: 24 };

    const textoData = `DATA DE SEPARAÇÃO    ${dataHoje}`;
    ws["B9"] = { v: textoData, t: "s", s: estiloInfoCabecalho };
    rowHeights[8] = { hpt: 24 };

    const textoResp = responsavel
      ? `RESPONSÁVEL DA SEPARAÇÃO   ${responsavel.toUpperCase()}`
      : "RESPONSÁVEL DA SEPARAÇÃO   __________________ ";
    ws["B10"] = { v: textoResp, t: "s", s: estiloInfoCabecalho };
    rowHeights[9] = { hpt: 24 };

    if (destino) {
      ws["B11"] = { v: `DESTINO / OBS:   ${destino.toUpperCase()}`, t: "s", s: estiloInfoCabecalho };
    }
    rowHeights[10] = { hpt: 24 };

    rowHeights[11] = { hpt: 18 };

    ws["B13"] = { v: "Cód", t: "s", s: estiloHeaderTabela };
    ws["C13"] = { v: "DESCRICÃO ", t: "s", s: estiloHeaderTabela };
    ws["D13"] = { v: "QTD", t: "s", s: estiloHeaderTabela };
    ws["E13"] = { v: "TIPO", t: "s", s: estiloHeaderTabela };
    rowHeights[12] = { hpt: 21 };

    let linhaAtual = 14;
    listaAtual.forEach((item) => {
      const codNum = Number(item.codigo);
      const isCodNumerico = Number.isFinite(codNum) && String(codNum) === String(item.codigo).trim();

      ws[`B${linhaAtual}`] = {
        v: isCodNumerico ? codNum : String(item.codigo),
        t: isCodNumerico ? "n" : "s",
        s: estiloCod
      };
      ws[`C${linhaAtual}`] = {
        v: String(item.descricao).toUpperCase(),
        t: "s",
        s: estiloDescricao
      };
      ws[`D${linhaAtual}`] = {
        v: formatarQtdComUnidade(item.quantidade, item.unidade),
        t: "s",
        s: estiloQtd
      };

      const infoTipo = [item.motivo, item.obs].filter(Boolean).join(" - ");
      ws[`E${linhaAtual}`] = {
        v: infoTipo,
        t: "s",
        s: estiloTipo
      };

      rowHeights[linhaAtual - 1] = { hpt: 21 };
      linhaAtual += 1;
    });

    rowHeights[linhaAtual - 1] = { hpt: 21 };
    linhaAtual += 1;
    rowHeights[linhaAtual - 1] = { hpt: 21 };
    linhaAtual += 1;

    ws[`B${linhaAtual}`] = {
      v: "E_______________________ Confirmo a (s) saida (s) da (s) mercadoria (s) acima descrita (s)",
      t: "s",
      s: estiloConfirmacao
    };
    rowHeights[linhaAtual - 1] = { hpt: 21 };
    linhaAtual += 1;

    rowHeights[linhaAtual - 1] = { hpt: 21 };
    linhaAtual += 1;

    ws[`B${linhaAtual}`] = {
      v: "___________________________________________________________________________",
      t: "s",
      s: estiloAssinatura
    };
    ws[`C${linhaAtual}`] = { v: "", t: "s", s: estiloAssinatura };
    merges.push({ s: { r: linhaAtual - 1, c: 1 }, e: { r: linhaAtual - 1, c: 2 } });
    rowHeights[linhaAtual - 1] = { hpt: 21 };
    linhaAtual += 1;

    ws[`B${linhaAtual}`] = {
      v: "RESPONSÁVEL",
      t: "s",
      s: estiloAssinatura
    };
    ws[`C${linhaAtual}`] = { v: "", t: "s", s: estiloAssinatura };
    merges.push({ s: { r: linhaAtual - 1, c: 1 }, e: { r: linhaAtual - 1, c: 2 } });
    rowHeights[linhaAtual - 1] = { hpt: 21 };

    ws["!ref"] = `A1:E${linhaAtual}`;
    ws["!merges"] = merges;
    ws["!rows"] = rowHeights;
    ws["!cols"] = [
      { wch: 3.5 },
      { wch: 14 },
      { wch: 56 },
      { wch: 15 },
      { wch: 30 }
    ];

    ws["!views"] = [{ showGridLines: false }];
    ws["!pageSetup"] = {
      orientation: "portrait",
      paperSize: 9,
      fitToWidth: 1,
      fitToHeight: 0
    };
    ws["!pageMargins"] = {
      left: 0.25,
      right: 0.25,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cautela de Saida");

    const nomeArquivoBase = (numeroLista || `cautela_saida_${new Date().toISOString().slice(0, 10)}`)
      .replace(/[^a-zA-Z0-9_-]+/g, "_");
    XLSX.writeFile(wb, `${nomeArquivoBase}.xlsx`);
  }

  function limparCamposFormulario() {
    els.inputCod.value = "";
    els.inputQtd.value = "1";
    els.selectUnidade.value = "cx";
    els.selectMotivo.selectedIndex = 0;
    els.inputObsItem.value = "";
    atualizarPreviewProduto();
    els.inputCod.focus();
  }

  function iniciarNovaLista() {
    if (listaAtual.length > 0) {
      const confirmar = window.confirm("Deseja limpar todos os itens da lista atual para iniciar uma nova?");
      if (!confirmar) return;
    }

    listaAtual = [];
    els.inputNumeroLista.value = "";
    els.inputResponsavel.value = "";
    els.inputDestino.value = "";
    salvarEstadoAtual();
    renderizarListaAtual();
    els.inputCod.focus();
  }

  function limparHistoricoCompleto() {
    if (historicoListas.length === 0) return;
    const confirmar = window.confirm("Tem certeza que deseja apagar todo o histórico de listas salvas?");
    if (!confirmar) return;

    historicoListas = [];
    salvarHistoricoStorage();
    renderizarHistorico();
  }

  function registrarEventos() {
    els.inputCod.addEventListener("input", atualizarPreviewProduto);
    els.inputCod.addEventListener("change", atualizarPreviewProduto);

    els.formSaida.addEventListener("submit", adicionarItemNaLista);
    els.btnLimparCampos.addEventListener("click", limparCamposFormulario);

    els.tbodyItens.addEventListener("click", (evento) => {
      const alvo = evento.target;
      if (!(alvo instanceof HTMLElement)) return;

      const idRemover = alvo.getAttribute("data-remover-id");
      if (idRemover) {
        listaAtual = listaAtual.filter((item) => item.id !== idRemover);
        salvarEstadoAtual();
        renderizarListaAtual();
      }
    });

    [els.inputNumeroLista, els.inputResponsavel, els.inputDestino].forEach((campo) => {
      campo.addEventListener("input", renderizarListaAtual);
    });

    els.btnSalvarLista.addEventListener("click", salvarListaNoHistorico);
    els.btnExportarExcel.addEventListener("click", exportarExcel);
    els.btnImprimir.addEventListener("click", () => window.print());
    els.btnNovaLista.addEventListener("click", iniciarNovaLista);
    els.btnLimparHistorico.addEventListener("click", limparHistoricoCompleto);
  }

  function init() {
    carregarBaseEmbutida();
    carregarEstadoStorage();
    registrarEventos();
    atualizarPreviewProduto();
    renderizarListaAtual();
    renderizarHistorico();
  }

  init();
})();
