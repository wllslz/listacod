const STORAGE_BASE_KEY = "listacod_base_simples_v1";
const STORAGE_LISTA_ATUAL_KEY = "listacod_lista_atual_v1";
const STORAGE_HISTORICO_KEY = "listacod_historico_v1";

let baseProdutos = new Map(); // COD -> { codigo, descricao }
let listaAtual = [];
let itemSelecionado = null;

const el = {
  statusBase: document.getElementById("statusBase"),
  inputBaseFile: document.getElementById("inputBaseFile"),
  codInput: document.getElementById("codInput"),
  sugestoesCod: document.getElementById("sugestoesCod"),
  btnLimparBusca: document.getElementById("btnLimparBusca"),
  feedbackMsg: document.getElementById("feedbackMsg"),
  itemPreview: document.getElementById("itemPreview"),
  prevCodigo: document.getElementById("prevCodigo"),
  prevDescricao: document.getElementById("prevDescricao"),
  formSaida: document.getElementById("formSaida"),
  qtdSaida: document.getElementById("qtdSaida"),
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

function setFeedback(msg, tipo = "") {
  el.feedbackMsg.textContent = msg;
  el.feedbackMsg.className = `feedback ${tipo}`.trim();
}

function salvarEstadoLocal() {
  localStorage.setItem(STORAGE_LISTA_ATUAL_KEY, JSON.stringify(listaAtual));
}

function carregarEstadoLocal() {
  const baseSalva = localStorage.getItem(STORAGE_BASE_KEY);
  if (baseSalva) {
    try {
      hidratarBase(JSON.parse(baseSalva));
    } catch {
      localStorage.removeItem(STORAGE_BASE_KEY);
    }
  }

  const listaSalva = localStorage.getItem(STORAGE_LISTA_ATUAL_KEY);
  if (listaSalva) {
    try {
      listaAtual = JSON.parse(listaSalva) || [];
    } catch {
      listaAtual = [];
    }
  }

  renderListaAtual();
  renderHistorico();
}

function hidratarBase(linhas) {
  baseProdutos.clear();
  const fragment = document.createDocumentFragment();
  let count = 0;

  for (const row of linhas) {
    const cod = normalizarCodigo(row["Código"] ?? row["codigo"] ?? row["COD"] ?? row["cod"]);
    const descricao = String(row["Descrição"] ?? row["descricao"] ?? "").trim();
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

  if (count > 0) {
    el.statusBase.textContent = `Base carregada: ${count.toLocaleString("pt-BR")} itens`;
    el.statusBase.className = "badge badge-ok";
  } else {
    el.statusBase.textContent = "Base vazia";
    el.statusBase.className = "badge badge-neutral";
  }
}

async function importarArquivoBase(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  hidratarBase(json);

  // Salva apenas COD e Descrição no localStorage (bem leve: ~400KB para 7.349 itens)
  localStorage.setItem(STORAGE_BASE_KEY, JSON.stringify(Array.from(baseProdutos.values())));
  setFeedback(`Planilha "${file.name}" carregada com ${baseProdutos.size} itens.`, "ok");
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

function renderListaAtual() {
  if (listaAtual.length === 0) {
    el.tabelaSaidasBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">Nenhum item adicionado. Informe um COD ao lado para começar.</td>
      </tr>`;
    el.resumoLista.textContent = "0 itens • Total saída: 0";
    return;
  }

  const totalQtd = listaAtual.reduce((acc, it) => acc + Number(it.quantidade || 0), 0);
  el.resumoLista.textContent = `${listaAtual.length} item(ns) • Total saída: ${totalQtd}`;

  el.tabelaSaidasBody.innerHTML = listaAtual
    .map(
      (it, idx) => `
      <tr>
        <td><strong>${escapeHtml(it.codigo)}</strong></td>
        <td>${escapeHtml(it.descricao)}</td>
        <td><strong>${escapeHtml(String(it.quantidade))}</strong></td>
        <td>${escapeHtml(it.formaSaida)}</td>
        <td>${escapeHtml(it.observacao || "—")}</td>
        <td class="no-print">
          <button type="button" class="btn btn-danger btn-sm" onclick="removerItemLista(${idx})">
            Remover
          </button>
        </td>
      </tr>`
    )
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

  const dataHora = new Date().toLocaleString("pt-BR");
  const linhas = listaAtual.map((it) => ({
    Lista: el.opNumero.value.trim() || "SEM-NUMERO",
    Data_Hora: dataHora,
    Responsavel: el.opResponsavel.value.trim(),
    Destino: el.opDestino.value.trim(),
    COD: it.codigo,
    Descricao: it.descricao,
    Quantidade: it.quantidade,
    Forma_Saida: it.formaSaida,
    Observacao: it.observacao,
  }));

  const ws = XLSX.utils.json_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Saidas");

  const nomeArquivo = `${el.opNumero.value.trim() || "lista_saidas"}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
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

  listaAtual = structuredClone(encontrada.itens || []);
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
            Responsável: ${escapeHtml(h.responsavel)} • Destino: ${escapeHtml(h.destino)} • ${h.itens.length} item(ns)
          </div>
        </div>
        <button type="button" class="btn btn-outline btn-sm" onclick="carregarListaHistorico(${h.id})">
          Abrir Lista
        </button>
      </div>`
    )
    .join("");
}

el.inputBaseFile.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) importarArquivoBase(file);
});

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
