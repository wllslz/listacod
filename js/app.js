const STORAGE_LISTA_ATUAL_KEY = "listacod_lista_atual_v1";
const STORAGE_HISTORICO_KEY = "listacod_historico_v1";

let baseProdutos = new Map(); // COD -> { codigo, descricao }
let listaAtual = [];
let itemSelecionado = null;

const el = {
  codInput: document.getElementById("codInput"),
  sugestoesCod: document.getElementById("sugestoesCod"),
  btnLimparBusca: document.getElementById("btnLimparBusca"),
  feedbackMsg: document.getElementById("feedbackMsg"),
  itemPreview: document.getElementById("itemPreview"),
  prevCodigo: document.getElementById("prevCodigo"),
  prevDescricao: document.getElementById("prevDescricao"),
  formSaida: document.getElementById("formSaida"),
  qtdSaida: document.getElementById("qtdSaida"),
  unidadeSaida: document.getElementById("unidadeSaida"),
  formaSaida: document.getElementById("formaSaida"),
  obsItem: document.getElementById("obsItem"),
  opNumero: document.getElementById("opNumero"),
  opResponsavel: document.getElementById("opResponsavel"),
  opDestino: document.getElementById("opDestino"),
  resumoLista: document.getElementById("resumoLista"),
  tabelaSaidasBody: document.getElementById("tabelaSaidasBody"),
  btnSalvarLista: document.getElementById("btnSalvarLista"),
  btnExportXlsx: document.getElementById("btnExportXlsx"),
  btnImprimir: document.getElementById("btnImprimir"),
  btnLimparLista: document.getElementById("btnLimparLista"),
  historicoContainer: document.getElementById("historicoContainer"),
};

function normalizarCodigo(val) {
  return String(val ?? "").trim();
}

function normalizarUnidade(un) {
  const u = String(un ?? "un").trim().toLowerCase();
  if (u === "cx" || u === "caixa" || u === "caixas") return "cx";
  if (u === "kg" || u === "quilo" || u === "quilos") return "kg";
  return "un";
}

function formatarNumero(num) {
  return Number(num || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}

function setFeedback(msg, tipo = "") {
  el.feedbackMsg.textContent = msg;
  el.feedbackMsg.className = `feedback ${tipo}`.trim();
}

function salvarEstadoLocal() {
  localStorage.setItem(STORAGE_LISTA_ATUAL_KEY, JSON.stringify(listaAtual));
}

function carregarBaseEmbutida() {
  baseProdutos.clear();
  const fragment = document.createDocumentFragment();
  let count = 0;

  const fonte = typeof BASE_PRODUTOS_FIXA === "object" && BASE_PRODUTOS_FIXA !== null
    ? BASE_PRODUTOS_FIXA
    : {};

  for (const [rawCod, rawDesc] of Object.entries(fonte)) {
    const cod = normalizarCodigo(rawCod);
    const descricao = String(rawDesc ?? "").trim();
    if (!cod || !descricao) continue;

    baseProdutos.set(cod, { codigo: cod, descricao });
    count++;

    if (count <= 2000) {
      const opt = document.createElement("option");
      opt.value = cod;
      opt.label = `${cod} — ${descricao}`;
      fragment.appendChild(opt);
    }
  }

  el.sugestoesCod.innerHTML = "";
  el.sugestoesCod.appendChild(fragment);
}

function carregarEstadoLocal() {
  carregarBaseEmbutida();

  const listaSalva = localStorage.getItem(STORAGE_LISTA_ATUAL_KEY);
  if (listaSalva) {
    try {
      listaAtual = (JSON.parse(listaSalva) || []).map((it) => ({
        ...it,
        unidade: normalizarUnidade(it.unidade),
      }));
    } catch {
      listaAtual = [];
    }
  }

  renderListaAtual();
  renderHistorico();
}

function buscarPorCodigoOuTexto(termo) {
  const q = normalizarCodigo(termo);
  if (!q) {
    itemSelecionado = null;
    el.itemPreview.classList.add("hidden");
    setFeedback("");
    return;
  }

  if (baseProdutos.has(q)) {
    selecionarItem(baseProdutos.get(q));
    return;
  }

  const lower = q.toLowerCase();
  for (const item of baseProdutos.values()) {
    if (
      item.codigo.toLowerCase().startsWith(lower) ||
      item.descricao.toLowerCase().includes(lower)
    ) {
      selecionarItem(item);
      setFeedback(`Correspondência: COD ${item.codigo}`, "ok");
      return;
    }
  }

  itemSelecionado = null;
  el.itemPreview.classList.add("hidden");
  setFeedback("COD não encontrado na base.", "err");
}

function selecionarItem(item) {
  itemSelecionado = item;
  el.prevCodigo.textContent = `COD: ${item.codigo}`;
  el.prevDescricao.textContent = item.descricao;
  el.itemPreview.classList.remove("hidden");
  setFeedback("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function calcularTotaisPorUnidade(itens) {
  const totais = { cx: 0, un: 0, kg: 0 };
  for (const it of itens) {
    const un = normalizarUnidade(it.unidade);
    totais[un] += Number(it.quantidade || 0);
  }
  return totais;
}

function montarResumoTotais(itens) {
  const totais = calcularTotaisPorUnidade(itens);
  const partes = [];
  for (const un of ["cx", "un", "kg"]) {
    if (totais[un] > 0) {
      partes.push(`${formatarNumero(totais[un])} ${un}`);
    }
  }
  return partes.length > 0 ? partes.join(" • ") : "0";
}

function renderListaAtual() {
  if (listaAtual.length === 0) {
    el.tabelaSaidasBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">Nenhum item adicionado. Informe um COD ao lado para começar.</td>
      </tr>`;
    el.resumoLista.textContent = "0 itens • Total saída: 0";
    return;
  }

  const resumoQtd = montarResumoTotais(listaAtual);
  el.resumoLista.textContent = `${listaAtual.length} item(ns) • Total saída: ${resumoQtd}`;

  el.tabelaSaidasBody.innerHTML = listaAtual
    .map((it, idx) => {
      const un = normalizarUnidade(it.unidade);
      return `
      <tr>
        <td><strong>${escapeHtml(it.codigo)}</strong></td>
        <td>${escapeHtml(it.descricao)}</td>
        <td><strong>${escapeHtml(`${formatarNumero(it.quantidade)} ${un}`)}</strong></td>
        <td>${escapeHtml(it.formaSaida)}</td>
        <td>${escapeHtml(it.observacao || "—")}</td>
        <td class="no-print">
          <button type="button" class="btn btn-danger btn-sm" onclick="removerItemLista(${idx})">
            Remover
          </button>
        </td>
      </tr>`;
    })
    .join("");
}

window.removerItemLista = function (index) {
  listaAtual.splice(index, 1);
  salvarEstadoLocal();
  renderListaAtual();
};

function exportarExcel() {
  if (listaAtual.length === 0) {
    setFeedback("Adicione pelo menos um item antes de exportar.", "err");
    return;
  }

  const listaId = el.opNumero.value.trim() || "SEM-NUMERO";
  const responsavel = el.opResponsavel.value.trim() || "Não informado";
  const destino = el.opDestino.value.trim() || "Não informado";
  const dataHora = new Date().toLocaleString("pt-BR");
  const totais = calcularTotaisPorUnidade(listaAtual);

  const bordaFina = {
    top: { style: "thin", color: { rgb: "CBD5E1" } },
    bottom: { style: "thin", color: { rgb: "CBD5E1" } },
    left: { style: "thin", color: { rgb: "CBD5E1" } },
    right: { style: "thin", color: { rgb: "CBD5E1" } },
  };

  const estiloTitulo = {
    font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1E3A8A" } },
    alignment: { horizontal: "left", vertical: "center" },
  };

  const estiloSubtitulo = {
    font: { name: "Calibri", sz: 10, italic: true, color: { rgb: "DBEAFE" } },
    fill: { fgColor: { rgb: "1E3A8A" } },
    alignment: { horizontal: "left", vertical: "center" },
  };

  const estiloMetaLabel = {
    font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "334155" } },
    fill: { fgColor: { rgb: "F1F5F9" } },
    border: bordaFina,
    alignment: { horizontal: "left", vertical: "center" },
  };

  const estiloMetaValor = {
    font: { name: "Calibri", sz: 10, color: { rgb: "0F172A" } },
    fill: { fgColor: { rgb: "FFFFFF" } },
    border: bordaFina,
    alignment: { horizontal: "left", vertical: "center" },
  };

  const estiloHeaderTabela = {
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1D4ED8" } },
    border: bordaFina,
    alignment: { horizontal: "center", vertical: "center" },
  };

  const estiloHeaderTabelaEsq = {
    ...estiloHeaderTabela,
    alignment: { horizontal: "left", vertical: "center" },
  };

  const estiloTotalLabel = {
    font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "1E3A8A" } },
    fill: { fgColor: { rgb: "EFF6FF" } },
    border: bordaFina,
    alignment: { horizontal: "right", vertical: "center" },
  };

  const estiloTotalValor = {
    font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "0F172A" } },
    fill: { fgColor: { rgb: "EFF6FF" } },
    border: bordaFina,
    alignment: { horizontal: "center", vertical: "center" },
  };

  const ws = {};
  const setCell = (r, c, value, style, numFmt) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = { v: value, t: typeof value === "number" ? "n" : "s", s: style };
    if (numFmt) cell.z = numFmt;
    ws[addr] = cell;
  };

  // Linha 0 e 1: Banner Superior (colunas A..G)
  for (let c = 0; c < 7; c++) {
    setCell(0, c, c === 0 ? "LISTACOD — RELATÓRIO DE SAÍDA DE MATERIAIS" : "", estiloTitulo);
    setCell(1, c, c === 0 ? `Gerado em ${dataHora}` : "", estiloSubtitulo);
  }

  // Linha 3 e 4: Metadados da Operação
  setCell(3, 0, "Lista:", estiloMetaLabel);
  setCell(3, 1, listaId, estiloMetaValor);
  setCell(3, 2, "", estiloMetaValor);
  setCell(3, 3, "Data / Hora:", estiloMetaLabel);
  setCell(3, 4, dataHora, estiloMetaValor);
  setCell(3, 5, "", estiloMetaValor);
  setCell(3, 6, "", estiloMetaValor);

  setCell(4, 0, "Responsável:", estiloMetaLabel);
  setCell(4, 1, responsavel, estiloMetaValor);
  setCell(4, 2, "", estiloMetaValor);
  setCell(4, 3, "Destino / Obs.:", estiloMetaLabel);
  setCell(4, 4, destino, estiloMetaValor);
  setCell(4, 5, "", estiloMetaValor);
  setCell(4, 6, "", estiloMetaValor);

  // Linha 6: Cabeçalho da Tabela
  const headers = [
    { text: "#", style: estiloHeaderTabela },
    { text: "COD", style: estiloHeaderTabela },
    { text: "Descrição do Item", style: estiloHeaderTabelaEsq },
    { text: "Quantidade", style: estiloHeaderTabela },
    { text: "Unidade", style: estiloHeaderTabela },
    { text: "Forma de Saída", style: estiloHeaderTabela },
    { text: "Observação", style: estiloHeaderTabelaEsq },
  ];
  headers.forEach((h, idx) => setCell(6, idx, h.text, h.style));

  // Linhas de Itens (a partir da linha 7)
  let maxDescLen = 28;
  let maxObsLen = 18;

  listaAtual.forEach((it, idx) => {
    const r = 7 + idx;
    const zebra = idx % 2 === 1 ? "F8FAFC" : "FFFFFF";
    const un = normalizarUnidade(it.unidade);
    const desc = String(it.descricao || "");
    const obs = String(it.observacao || "—");

    if (desc.length > maxDescLen) maxDescLen = Math.min(desc.length + 4, 58);
    if (obs.length > maxObsLen) maxObsLen = Math.min(obs.length + 4, 36);

    const baseCell = {
      font: { name: "Calibri", sz: 10, color: { rgb: "1E293B" } },
      fill: { fgColor: { rgb: zebra } },
      border: bordaFina,
      alignment: { vertical: "center" },
    };

    setCell(r, 0, idx + 1, { ...baseCell, alignment: { horizontal: "center", vertical: "center" } });
    setCell(r, 1, String(it.codigo), {
      ...baseCell,
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "0F172A" } },
      alignment: { horizontal: "center", vertical: "center" },
    });
    setCell(r, 2, desc, {
      ...baseCell,
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
    });
    setCell(
      r,
      3,
      Number(it.quantidade),
      {
        ...baseCell,
        font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "0F172A" } },
        alignment: { horizontal: "right", vertical: "center" },
      },
      "#,##0.###"
    );
    setCell(r, 4, un, {
      ...baseCell,
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "1D4ED8" } },
      alignment: { horizontal: "center", vertical: "center" },
    });
    setCell(r, 5, String(it.formaSaida || ""), {
      ...baseCell,
      alignment: { horizontal: "center", vertical: "center" },
    });
    setCell(r, 6, obs, {
      ...baseCell,
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
    });
  });

  // Bloco de Resumo / Totais ao final
  const rResumo = 7 + listaAtual.length + 1;
  const linhasResumo = [
    ["Total de Itens Registrados:", listaAtual.length, "item(ns)"],
    ["Total em Caixas (cx):", totais.cx, "cx"],
    ["Total em Unidades (un):", totais.un, "un"],
    ["Total em Quilos (kg):", totais.kg, "kg"],
  ];

  linhasResumo.forEach(([rotulo, valor, sufixo], i) => {
    const r = rResumo + i;
    setCell(r, 0, "", estiloTotalLabel);
    setCell(r, 1, "", estiloTotalLabel);
    setCell(r, 2, rotulo, estiloTotalLabel);
    setCell(r, 3, Number(valor), { ...estiloTotalValor, alignment: { horizontal: "right", vertical: "center" } }, "#,##0.###");
    setCell(r, 4, sufixo, estiloTotalValor);
  });

  const ultimaLinha = rResumo + linhasResumo.length - 1;
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: ultimaLinha, c: 6 } });

  // Mesclagens de células
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },
    { s: { r: 3, c: 4 }, e: { r: 3, c: 6 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } },
    { s: { r: 4, c: 4 }, e: { r: 4, c: 6 } },
    ...linhasResumo.map((_, i) => ({
      s: { r: rResumo + i, c: 0 },
      e: { r: rResumo + i, c: 2 },
    })),
  ];

  // Largura das colunas e altura das linhas
  ws["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: maxDescLen },
    { wch: 14 },
    { wch: 11 },
    { wch: 20 },
    { wch: maxObsLen },
  ];

  ws["!rows"] = [
    { hpt: 26 },
    { hpt: 18 },
    { hpt: 8 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 10 },
    { hpt: 24 },
    ...listaAtual.map(() => ({ hpt: 21 })),
    { hpt: 10 },
    ...linhasResumo.map(() => ({ hpt: 20 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Saidas");

  const nomeSeguro = (el.opNumero.value.trim() || "lista_saidas").replace(/[\\/:*?"<>|]/g, "-");
  XLSX.writeFile(wb, `${nomeSeguro}.xlsx`);
  setFeedback(`Planilha "${nomeSeguro}.xlsx" exportada com sucesso.`, "ok");
}

function salvarNoHistorico() {
  if (listaAtual.length === 0) {
    setFeedback("Não há itens na lista para salvar.", "err");
    return;
  }

  const hist = JSON.parse(localStorage.getItem(STORAGE_HISTORICO_KEY) || "[]");
  hist.unshift({
    id: Date.now(),
    numero: el.opNumero.value.trim() || `LISTA-${hist.length + 1}`,
    responsavel: el.opResponsavel.value.trim() || "—",
    destino: el.opDestino.value.trim() || "—",
    dataHora: new Date().toLocaleString("pt-BR"),
    itens: structuredClone(listaAtual),
  });

  localStorage.setItem(STORAGE_HISTORICO_KEY, JSON.stringify(hist.slice(0, 50)));
  renderHistorico();
  setFeedback("Lista salva no histórico.", "ok");
}

window.carregarListaHistorico = function (id) {
  const hist = JSON.parse(localStorage.getItem(STORAGE_HISTORICO_KEY) || "[]");
  const encontrada = hist.find((h) => h.id === id);
  if (!encontrada) return;

  listaAtual = structuredClone(encontrada.itens || []).map((it) => ({
    ...it,
    unidade: normalizarUnidade(it.unidade),
  }));
  el.opNumero.value = encontrada.numero || "";
  el.opResponsavel.value = encontrada.responsavel === "—" ? "" : encontrada.responsavel;
  el.opDestino.value = encontrada.destino === "—" ? "" : encontrada.destino;
  salvarEstadoLocal();
  renderListaAtual();
  setFeedback(`Lista "${encontrada.numero}" carregada.`, "ok");
};

function renderHistorico() {
  const hist = JSON.parse(localStorage.getItem(STORAGE_HISTORICO_KEY) || "[]");
  if (hist.length === 0) {
    el.historicoContainer.innerHTML = `<p class="muted">Nenhuma lista salva até o momento.</p>`;
    return;
  }

  el.historicoContainer.innerHTML = hist
    .map(
      (h) => `
      <div class="historico-item">
        <div>
          <strong>${escapeHtml(h.numero)}</strong> • ${escapeHtml(h.dataHora)}
          <div class="muted">
            Responsável: ${escapeHtml(h.responsavel)} • Destino: ${escapeHtml(h.destino)} • ${h.itens.length} item(ns) (${escapeHtml(montarResumoTotais(h.itens || []))})
          </div>
        </div>
        <button type="button" class="btn btn-outline btn-sm" onclick="carregarListaHistorico(${h.id})">
          Abrir Lista
        </button>
      </div>`
    )
    .join("");
}

el.codInput.addEventListener("input", (e) => {
  buscarPorCodigoOuTexto(e.target.value);
});

el.btnLimparBusca.addEventListener("click", () => {
  el.codInput.value = "";
  itemSelecionado = null;
  el.itemPreview.classList.add("hidden");
  setFeedback("");
  el.codInput.focus();
});

el.formSaida.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!itemSelecionado) {
    setFeedback("Informe um COD válido antes de adicionar.", "err");
    el.codInput.focus();
    return;
  }

  const qtd = Number(el.qtdSaida.value);
  if (!qtd || qtd <= 0) {
    setFeedback("Informe uma quantidade maior que zero.", "err");
    el.qtdSaida.focus();
    return;
  }

  listaAtual.push({
    codigo: itemSelecionado.codigo,
    descricao: itemSelecionado.descricao,
    quantidade: qtd,
    unidade: normalizarUnidade(el.unidadeSaida.value),
    formaSaida: el.formaSaida.value,
    observacao: el.obsItem.value.trim(),
  });

  salvarEstadoLocal();
  renderListaAtual();

  el.codInput.value = "";
  el.qtdSaida.value = "";
  el.obsItem.value = "";
  itemSelecionado = null;
  el.itemPreview.classList.add("hidden");
  setFeedback("Item adicionado.", "ok");
  el.codInput.focus();
});

el.btnSalvarLista.addEventListener("click", salvarNoHistorico);
el.btnExportXlsx.addEventListener("click", exportarExcel);
el.btnImprimir.addEventListener("click", () => window.print());

el.btnLimparLista.addEventListener("click", () => {
  if (listaAtual.length === 0) return;
  listaAtual = [];
  salvarEstadoLocal();
  renderListaAtual();
  setFeedback("Lista limpa.", "ok");
});

carregarEstadoLocal();
