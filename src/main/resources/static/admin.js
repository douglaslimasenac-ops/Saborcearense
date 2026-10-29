// ==========================================
// 🌵 CONFIGURAÇÕES E ESTADOS GLOBAIS
// ==========================================
const URL_BACKEND = window.location.origin
const URL_API_ADMIN = URL_BACKEND + "/api/admin/pratos";
const CLOUDINARY_CLOUD_NAME = "sn5pijok";
const CLOUDINARY_UPLOAD_PRESET = "sabor_cearense_imagens";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const backendUrl = new URL(URL_BACKEND);
const URL_BACKEND_WS = (backendUrl.protocol === "https:" ? "wss://" : "ws://") + backendUrl.host;

const dicionarioCategorias = {
    "PRATOS_DO_DIA": "🌹 Prato do Dia",
    "FRANGO": "🐔 Frango",
    "CARNE": "🥩 Carne",
    "OUTROS": "🐟 Outros Pratos",
    "SOBREMESA": "😋 Sobremesa",
    "BEBIDA": "🥤 Bebida Gelada"
};

let listaPratosLocal = [];
let carregandoPedidosAtivos = false;
let socketAdmin = null;
let pingTimerAdmin = null;
let pedidosTimerAdmin = null;
let audioCtxCompartilhado = null;
let somNovoPedido = null;
let idsPedidosConhecidos = new Set();
let idsPedidosAlertados = new Set();
let primeiraCargaPedidos = true;
let termoBuscaProdutos = "";
let ultimoSnapshotPedidosAtivos = null;
let ultimoSnapshotPedidosHistorico = null;
let pedidosHistoricoLocal = [];
let pedidosAtivosLocal = [];
const pedidosFinalizadosLocal = new Set();
const pedidosAtivosMinimizados = new Set();
const pedidosHistoricoExpandidos = new Set();
let paginaHistorico = 1;
const pedidosPorPaginaHistorico = 10;
let itensPedidoBalcao = [];
let produtosBalcao = [];
let acompanhamentosBalcao = [];
let mensagensChatAdmin = [];
let numeroChatAdminSelecionado = null;
let totalMensagensChatAdmin = 0;
const chaveValoresFinanceirosOcultos = "valoresFinanceirosOcultosSaborCearense";
let valoresFinanceirosOcultos = localStorage.getItem(chaveValoresFinanceirosOcultos) === "true";
const resumosFinanceiros = new Map();

async function fetchAdmin(url, options = {}) {
    const token = localStorage.getItem("adminToken");
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        localStorage.removeItem("adminToken");
        alert("Sua sessao administrativa nao e mais valida. Faca login novamente.");
        window.location.reload();
    }
    return response;
}

// ==========================================
// 🔐 FLUXO DE AUTENTICAÇÃO SEGURO
// ==========================================

window.addEventListener('DOMContentLoaded', function() {
    atualizarBotoesValoresFinanceiros();
    const botaoLogin = document.getElementById("btn-submeter-login");
    if (botaoLogin) {
        botaoLogin.addEventListener('click', autenticarAdmin);
    }
    const buscaProdutos = document.getElementById("busca-produtos-admin");
    if (buscaProdutos) {
        buscaProdutos.addEventListener("input", () => {
            termoBuscaProdutos = buscaProdutos.value.trim().toLocaleLowerCase("pt-BR");
            renderizarItensAdmin();
        });
    }
    const formBairro = document.getElementById("form-bairro-entrega");
    if (formBairro) formBairro.addEventListener("submit", salvarBairroAdmin);
    ["filtro-historico-busca", "filtro-historico-status", "filtro-historico-inicio", "filtro-historico-fim"]
        .forEach(id => document.getElementById(id)?.addEventListener("input", () => {
            paginaHistorico = 1;
            renderizarHistoricoFiltrado();
        }));
    document.getElementById("filtro-ativos-busca")?.addEventListener("input", renderizarAtivosFiltrados);
});

function alternarAbasAdmin(abaAlvo) {
    document.querySelectorAll('.nav-link').forEach(function(link) { link.classList.remove('active'); });
    document.querySelectorAll('.section-view').forEach(function(view) { view.classList.remove('active'); });
    
    document.getElementById("tab-" + abaAlvo).classList.add('active');
    document.getElementById("sec-" + abaAlvo).classList.add('active');
    
    if (abaAlvo === 'ativos' || abaAlvo === 'historico') {
        carregarPedidosAtivos();
    }
    if (abaAlvo === 'balcao') {
        carregarProdutosBalcao();
    }
    if (abaAlvo === 'chat') {
        carregarChatsAdmin();
    }
    if (abaAlvo === 'acompanhamentos') {
        carregarAcompanhamentosAdmin();
    }
    if (abaAlvo === 'bairros') {
        carregarBairrosAdmin();
    }
}

async function carregarBairrosAdmin() {
    const container = document.getElementById("lista-bairros-admin");
    if (!container) return;

    try {
        const resposta = await fetchAdmin(`${URL_BACKEND}/api/admin/bairros`);
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const bairros = await resposta.json();
        container.innerHTML = bairros.length ? "" : "<p>Nenhum bairro cadastrado.</p>";
        bairros.forEach(bairro => {
            const card = document.createElement("div");
            card.className = "card-produto";
            card.innerHTML = `
                <div class="info-prod">
                    <h4>${escaparHtml(bairro.nome)}</h4>
                    <small style="color: var(--text-muted);">Taxa atual: R$ ${Number(bairro.taxa || 0).toFixed(2).replace(".", ",")}</small>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
                    <button type="button" class="btn-status-toggle ativo" onclick="editarBairroAdmin(${bairro.id}, '${encodeURIComponent(bairro.nome)}', ${Number(bairro.taxa || 0)})">Alterar</button>
                    <button type="button" class="btn-status-toggle inativo" onclick="excluirBairroAdmin(${bairro.id}, '${encodeURIComponent(bairro.nome)}')">Excluir</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (erro) {
        console.error("Erro ao carregar bairros:", erro);
        container.innerHTML = '<p style="color: var(--danger);">Não foi possível carregar os bairros.</p>';
    }
}

async function salvarBairroAdmin(event) {
    event.preventDefault();
    const nome = document.getElementById("bairro-admin-nome").value.trim();
    const taxa = Number(document.getElementById("bairro-admin-taxa").value);
    if (!nome || !Number.isFinite(taxa) || taxa < 0) {
        alert("Informe um nome e uma taxa válida.");
        return;
    }

    try {
        const resposta = await fetchAdmin(`${URL_BACKEND}/api/admin/bairros`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, taxa })
        });
        if (!resposta.ok) {
            if (resposta.status === 409) throw new Error("Esse bairro já está cadastrado.");
            throw new Error(`HTTP ${resposta.status}`);
        }
        event.target.reset();
        await carregarBairrosAdmin();
    } catch (erro) {
        console.error("Erro ao adicionar bairro:", erro);
        alert(erro.message || "Não foi possível adicionar o bairro.");
    }
}

async function editarBairroAdmin(id, nomeCodificado, taxaAtual) {
    const nome = prompt("Nome do bairro:", decodeURIComponent(nomeCodificado));
    if (nome === null) return;
    const taxaTexto = prompt("Taxa de entrega (R$):", Number(taxaAtual).toFixed(2));
    if (taxaTexto === null) return;
    const taxa = Number(taxaTexto.replace(",", "."));
    if (!nome.trim() || !Number.isFinite(taxa) || taxa < 0) {
        alert("Informe um nome e uma taxa válida.");
        return;
    }

    try {
        const resposta = await fetchAdmin(`${URL_BACKEND}/api/admin/bairros/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome: nome.trim(), taxa })
        });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        await carregarBairrosAdmin();
    } catch (erro) {
        console.error("Erro ao alterar bairro:", erro);
        alert("Não foi possível alterar o bairro.");
    }
}

async function excluirBairroAdmin(id, nomeCodificado) {
    const nome = decodeURIComponent(nomeCodificado);
    if (!confirm(`Excluir o bairro "${nome}"?`)) return;
    try {
        const resposta = await fetchAdmin(`${URL_BACKEND}/api/admin/bairros/${id}`, { method: "DELETE" });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        await carregarBairrosAdmin();
    } catch (erro) {
        console.error("Erro ao excluir bairro:", erro);
        alert("Não foi possível excluir o bairro.");
    }
}

async function carregarAcompanhamentosAdmin() {
    const container = document.getElementById("lista-acompanhamentos-admin");
    if (!container) return;

    try {
        const resposta = await fetchAdmin(URL_BACKEND + "/api/admin/acompanhamentos");
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const acompanhamentos = await resposta.json();
        container.innerHTML = "";

        acompanhamentos.forEach(acompanhamento => {
            const card = document.createElement("div");
            card.className = `card-produto ${acompanhamento.disponivel ? "disponivel-style" : "esgotado-style"}`;
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.8rem;" aria-hidden="true">${escaparHtml(acompanhamento.icone)}</span>
                    <div class="info-prod">
                        <h4>${escaparHtml(acompanhamento.nome)}</h4>
                        <small style="color: var(--text-muted);">${acompanhamento.disponivel ? "Disponível para os clientes" : "Marcado como esgotado"}</small>
                    </div>
                </div>
                <button type="button" class="btn-status-toggle ${acompanhamento.disponivel ? "inativo" : "ativo"}"
                        onclick="alternarDisponibilidadeAcompanhamento(${acompanhamento.id}, ${acompanhamento.disponivel})">
                    ${acompanhamento.disponivel ? "Marcar esgotado" : "Reativar"}
                </button>
            `;
            container.appendChild(card);
        });
    } catch (erro) {
        console.error("Erro ao carregar acompanhamentos:", erro);
        container.innerHTML = `<p style="color: var(--danger);">Não foi possível carregar os acompanhamentos.</p>`;
    }
}

async function alternarDisponibilidadeAcompanhamento(id, disponibilidadeAtual) {
    try {
        const resposta = await fetchAdmin(`${URL_BACKEND}/api/admin/acompanhamentos/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ disponivel: !disponibilidadeAtual })
        });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        await carregarAcompanhamentosAdmin();
    } catch (erro) {
        console.error("Erro ao atualizar acompanhamento:", erro);
        alert("Não foi possível atualizar a disponibilidade do acompanhamento.");
    }
}

function configurarFormularioCadastro() {
    const form = document.getElementById("form-novo-prato");
    if (!form) return;
    const campoImagem = document.getElementById("imagem");
    const previewImagem = document.getElementById("preview-imagem-prato");
    const previewImagemEl = document.getElementById("preview-imagem-prato-img");

    const atualizarPreviewImagem = () => {
        const valor = campoImagem.value.trim();
        if (!valor) {
            previewImagem.hidden = true;
            previewImagemEl.removeAttribute("src");
            return;
        }

        try {
            new URL(valor);
            previewImagemEl.src = valor;
            previewImagem.hidden = false;
        } catch {
            previewImagem.hidden = true;
        }
    };

    campoImagem.addEventListener("input", atualizarPreviewImagem);
    const seletorImagem = document.getElementById("imagem-arquivo");
    if (seletorImagem) {
        seletorImagem.addEventListener("change", async () => {
            const arquivo = seletorImagem.files && seletorImagem.files[0];
            if (!arquivo) return;
            try {
                campoImagem.value = await enviarImagemCloudinary(arquivo);
                atualizarPreviewImagem();
            } catch (erro) {
                console.error("Erro ao enviar imagem do novo prato:", erro);
                seletorImagem.value = "";
                alert(erro.message || "Não foi possível enviar a imagem.");
            }
        });
    }
    previewImagemEl.addEventListener("error", () => {
        previewImagem.hidden = true;
        alert("Não foi possível carregar essa imagem. Use o endereço direto do arquivo.");
    });

    form.onsubmit = async function(e) {
        e.preventDefault();
        const nome = document.getElementById("nome").value;
        const preco = parseFloat(document.getElementById("preco").value);
        const categoria = document.getElementById("categoria").value;
        const diaSemana = document.getElementById("diaSemana").value;
        const imagemUrl = campoImagem.value.trim();

        if (imagemUrl) {
            try {
                const urlImagem = new URL(imagemUrl);
                if (!["http:", "https:"].includes(urlImagem.protocol)) {
                    throw new Error("Protocolo de imagem inválido");
                }
            } catch {
                alert("Informe uma URL válida para a imagem, começando com https://.");
                campoImagem.focus();
                return;
            }
        }

        try {
            const res = await fetchAdmin(URL_BACKEND + "/api/admin/pratos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome, preco, categoria, diaSemana, imagemUrl, descricao: "Item profissional.", disponivel: true })
            });
            if(res.ok) {
                form.reset();
                atualizarPreviewImagem();
                carregarItensAdmin();
            } else { alert("Erro ao criar novo produto."); }
        } catch(err) { alert("Erro de conexao ao salvar."); }
    };
}

async function carregarItensAdmin() {
    const container = document.getElementById("lista-itens-admin");
    if (!container) return;
    try {
        const res = await fetch(URL_BACKEND + "/api/cardapio");
        const itens = await res.json();
        
        listaPratosLocal = itens;
        renderizarItensAdmin();
    } catch(e) { container.innerHTML = `<p style="text-align: center; color: var(--danger);">Erro ao carregar o cardápio.</p>`; }
}

function renderizarItensAdmin() {
    const container = document.getElementById("lista-itens-admin");
    if (!container) return;
    container.innerHTML = "";
    const itensFiltrados = listaPratosLocal.filter(item => {
        const texto = `${item.nome || ""} ${item.categoria || ""} ${item.diaSemana || ""}`.toLocaleLowerCase("pt-BR");
        return texto.includes(termoBuscaProdutos);
    });

    if (!itensFiltrados.length) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">Nenhum item encontrado.</p>`;
        return;
    }

    itensFiltrados.forEach(item => {
            const div = document.createElement("div");
            const esgotado = !item.disponivel;
            div.className = `card-produto ${esgotado ? 'esgotado-style' : 'disponivel-style'}`;
            
            const nomeCategoria = dicionarioCategorias[item.categoria] || item.categoria || "Geral";
            const diaLabel = item.diaSemana ? ` · ${item.diaSemana}` : "";

            div.innerHTML = `
                <div style="display: flex; gap: 15px; align-items: center;">
                    <img src="${item.imagemUrl || 'https://unsplash.com'}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc;">
                    <div class="info-prod">
                        <h4>${item.nome} <span class="badge-cat">${nomeCategoria}${diaLabel}</span></h4>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.9rem; color: #4a5568;">
                            <span>Preço: R$</span>
                            <input type="number" step="0.01" value="${Number(item.preco || 0).toFixed(2)}" 
                                class="input-preco-rapido" 
                                onchange="atualizarPrecoRapido(${item.id}, this.value)">
                        </div>
                        <div class="imagem-produto-edicao">
                            <input type="file" id="arquivo-produto-${item.id}" accept="image/*"
                                onchange="enviarImagemProdutoExistente(${item.id}, this.files[0])"
                                aria-label="Escolher imagem do computador">
                            <input type="url" id="imagem-produto-${item.id}"
                                value="${escaparHtml(item.imagemUrl || "")}"
                                placeholder="Cole aqui a URL da imagem">
                            <button type="button" onclick="atualizarImagemRapido(${item.id})">Salvar imagem</button>
                        </div>
                    </div>
                </div>
                <div class="controles-prod">
                    <button class="btn-status-toggle ${esgotado ? 'inativo' : 'ativo'}" 
                        onclick="alternarDisponibilidade(${item.id}, ${item.disponivel})">
                        ${esgotado ? '🔴 Esgotado' : '🟢 Disponível'}
                    </button>
                    <button class="btn-mini-deletar" onclick="deletarItem(${item.id})">🗑️</button>
                </div>
            `;
            container.appendChild(div);
    });
}

async function enviarImagemCloudinary(arquivo) {
    if (!arquivo || !arquivo.type.startsWith("image/")) {
        throw new Error("Escolha um arquivo de imagem válido.");
    }
    if (arquivo.size > 10 * 1024 * 1024) {
        throw new Error("A imagem deve ter no máximo 10 MB.");
    }

    const dados = new FormData();
    dados.append("file", arquivo);
    dados.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const resposta = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: dados
    });
    const resultado = await resposta.json();
    if (!resposta.ok || !resultado.secure_url) {
        throw new Error(resultado.error?.message || "O Cloudinary recusou a imagem.");
    }
    return resultado.secure_url;
}

async function enviarImagemProdutoExistente(id, arquivo) {
    const campo = document.getElementById(`imagem-produto-${id}`);
    const seletor = document.getElementById(`arquivo-produto-${id}`);
    if (!arquivo) return;

    try {
        campo.value = await enviarImagemCloudinary(arquivo);
        await atualizarImagemRapido(id);
    } catch (erro) {
        console.error("Erro ao enviar imagem do produto:", erro);
        if (seletor) seletor.value = "";
        alert(erro.message || "Não foi possível enviar a imagem.");
    }
}

async function atualizarImagemRapido(id) {
    const campo = document.getElementById(`imagem-produto-${id}`);
    const imagemUrl = campo ? campo.value.trim() : "";
    const pratoAntigo = listaPratosLocal.find(p => p.id === id);
    if (!pratoAntigo) {
        alert("Não foi possível localizar este prato.");
        return;
    }

    if (imagemUrl) {
        try {
            const urlImagem = new URL(imagemUrl);
            if (!["http:", "https:"].includes(urlImagem.protocol)) throw new Error();
        } catch {
            alert("Informe uma URL válida começando com https://.");
            campo.focus();
            return;
        }
    }

    try {
        const res = await fetchAdmin(`${URL_API_ADMIN}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id,
                nome: pratoAntigo.nome || "",
                descricao: pratoAntigo.descricao || "",
                categoria: pratoAntigo.categoria || "",
                diaSemana: pratoAntigo.diaSemana || "",
                imagemUrl,
                disponivel: pratoAntigo.disponivel !== undefined ? pratoAntigo.disponivel : true,
                preco: pratoAntigo.preco || 0
            })
        });
        if (!res.ok) {
            alert("Não foi possível salvar a imagem.");
            return;
        }
        await carregarItensAdmin();
    } catch (erro) {
        console.error("Erro ao atualizar imagem do prato:", erro);
        alert("Erro de conexão ao salvar a imagem.");
    }
}

async function atualizarPrecoRapido(id, novoPreco) {
    const valorFormatado = parseFloat(novoPreco);
    if (isNaN(valorFormatado) || valorFormatado < 0) return;

    const pratoAntigo = listaPratosLocal.find(p => p.id === id) || {};

    try {
        const res = await fetchAdmin(`${URL_API_ADMIN}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                id: id,
                nome: pratoAntigo.nome || "",
                descricao: pratoAntigo.descricao || "",
                categoria: pratoAntigo.categoria || "",
                diaSemana: pratoAntigo.diaSemana || "",
                imagemUrl: pratoAntigo.imagemUrl || "",
                disponivel: pratoAntigo.disponivel !== undefined ? pratoAntigo.disponivel : true,
                preco: valorFormatado
            })
        });
        
        if (res.ok) {
            carregarItensAdmin();
        } else {
            console.error(`Erro ${res.status} ao atualizar preço.`);
            alert("Erro ao salvar o novo preço no servidor.");
        }
    } catch(err) { alert("Erro de conexão ao alterar preço."); }
}

async function alternarDisponibilidade(id, statusAtual) {
    try {
        const novoStatus = !statusAtual;
        const pratoAntigo = listaPratosLocal.find(p => p.id === id) || {};
        
        const res = await fetchAdmin(`${URL_API_ADMIN}/${id}`, {
            method: "PUT", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                id: id,
                nome: pratoAntigo.nome || "",
                descricao: pratoAntigo.descricao || "",
                categoria: pratoAntigo.categoria || "",
                diaSemana: pratoAntigo.diaSemana || "",
                imagemUrl: pratoAntigo.imagemUrl || "",
                preco: pratoAntigo.preco || 0,
                disponivel: novoStatus
            })
        });
        
        if (res.ok) {
            carregarItensAdmin();
        } else {
            console.error(`Erro ${res.status} ao mudar disponibilidade.`);
            alert("Erro ao atualizar a disponibilidade no servidor.");
        }
    } catch(e) { alert("Erro ao mudar disponibilidade."); }
}

async function deletarItem(id) {
    if (!confirm("Deseja apagar esse item permanentemente?")) return;
    try {
        const res = await fetchAdmin(`${URL_API_ADMIN}/${id}`, { method: "DELETE" });
        if (res.ok || res.status === 204) {
            carregarItensAdmin();
        } else {
            console.error(`Erro ${res.status} ao deletar.`);
            alert("Erro ao excluir o item. Verifique se ele não está em algum pedido.");
        }
    } catch(e) { alert("Erro ao deletar."); }
}
// ==========================================
// 📡 CONTROLE DE PEDIDOS & WEBSOCKET ANTI-TIMEOUT
// ==========================================
function inicializarControlePedidos() {
    conectarWebSocketAdmin();
    carregarPedidosAtivos();
    if (pedidosTimerAdmin) clearInterval(pedidosTimerAdmin);
    pedidosTimerAdmin = setInterval(() => {
        carregarPedidosAtivos();
        carregarChatsAdmin();
    }, 5000);
    carregarChatsAdmin();
}

function conectarWebSocketAdmin() {
    if (socketAdmin && socketAdmin.readyState === WebSocket.OPEN) return;

    try {
        const token = encodeURIComponent(localStorage.getItem("adminToken") || "");
        socketAdmin = new WebSocket(`${URL_BACKEND_WS}/ws-status?token=${token}`);
        
        socketAdmin.onopen = () => {
            console.log("Conectado ao WebSocket do Render.");
            iniciarHeartbeatAdmin();
        };

        socketAdmin.onmessage = (event) => {
            let dados;
            try {
                dados = JSON.parse(event.data);
                if (dados.tipo === "PING" || dados.tipo === "PONG") return;
            } catch(e) {
                console.error("Mensagem inválida recebida no WebSocket:", e);
                return;
            }
            
            carregarPedidosAtivos();
            if (dados.tipo === "CHAT_MENSAGEM" || dados.tipo === "CHAT_ENCERRADO") {
                carregarChatsAdmin();
            }
            if (dados.status === "RECEBIDO" && dados.clienteNome && dados.id) {
                idsPedidosAlertados.add(dados.id);
                tocarSomNovoPedido();
            }

        };
        
        socketAdmin.onclose = () => { 
            console.warn("Conexão WebSocket perdida. Tentando reconectar em 5 segundos...");
            interromperHeartbeatAdmin();
            setTimeout(conectarWebSocketAdmin, 5000); 
        };
        
        socketAdmin.onerror = (e) => {
            console.error("Erro no canal WebSocket:", e);
            socketAdmin.close();
        };
    } catch (e) { 
        console.error("Falha ao abrir canal WebSocket:", e); 
    }
}

async function carregarChatsAdmin() {
    try {
        const resposta = await fetchAdmin(`${URL_BACKEND}/api/chat/admin`);
        if (!resposta.ok) return;
        const mensagens = await resposta.json();
        const mensagensNovas = mensagens.length > totalMensagensChatAdmin;
        totalMensagensChatAdmin = mensagens.length;
        mensagensChatAdmin = mensagens;
        if (mensagensNovas && !document.getElementById("sec-chat")?.classList.contains("active")) {
            tocarAlertaSonoro();
        }
        const grupos = [...new Set(mensagens.map(mensagem => mensagem.numeroPedido))];
        const lista = document.getElementById("lista-chats-admin");
        if (lista) {
            lista.innerHTML = grupos.length
                ? grupos.map(numero => {
                    const doPedido = mensagens.filter(mensagem => mensagem.numeroPedido === numero);
                    const ultima = doPedido[doPedido.length - 1];
                    return `<button type="button" class="btn-acao" style="justify-content:space-between; width:100%;" onclick="selecionarChatAdmin(${numero})">
                        <span>Pedido #${numero}</span><span>${ultima.remetente === "CLIENTE" ? "🔴" : "✅"} ${doPedido.length} mensagem(ns)</span>
                    </button>`;
                }).join("")
                : "<p style='color:var(--text-muted);'>Nenhuma conversa aberta.</p>";
        }
        const badge = document.getElementById("badge-chat-admin");
        if (badge) {
            badge.textContent = grupos.length;
            badge.style.display = grupos.length ? "inline-block" : "none";
        }
        if (numeroChatAdminSelecionado && !grupos.includes(numeroChatAdminSelecionado)) {
            numeroChatAdminSelecionado = null;
            document.getElementById("chat-admin-painel").style.display = "none";
        }
        if (numeroChatAdminSelecionado) renderizarChatAdmin();
    } catch (erro) {
        console.error("Erro ao carregar chats:", erro);
    }
}

function selecionarChatAdmin(numeroPedido) {
    numeroChatAdminSelecionado = numeroPedido;
    renderizarChatAdmin();
}

function renderizarChatAdmin() {
    const painel = document.getElementById("chat-admin-painel");
    const lista = document.getElementById("chat-admin-mensagens");
    if (!painel || !lista || !numeroChatAdminSelecionado) return;
    const mensagens = mensagensChatAdmin.filter(mensagem => mensagem.numeroPedido === numeroChatAdminSelecionado);
    painel.style.display = "block";
    document.getElementById("chat-admin-titulo").textContent = `Conversa do pedido #${numeroChatAdminSelecionado}`;
    lista.innerHTML = mensagens.map(mensagem => `
        <div style="align-self:${mensagem.remetente === "RESTAURANTE" ? "flex-end" : "flex-start"}; max-width:85%; padding:8px 10px; border-radius:9px; background:${mensagem.remetente === "RESTAURANTE" ? "#dcfce7" : "#f1f5f9"};">
            <strong>${mensagem.remetente === "RESTAURANTE" ? "Restaurante" : "Cliente"}</strong>
            <div>${escaparHtml(mensagem.mensagem)}</div>
        </div>`).join("");
    lista.scrollTop = lista.scrollHeight;
}

async function enviarMensagemChatAdmin() {
    const campo = document.getElementById("chat-admin-input");
    const mensagem = campo ? campo.value.trim() : "";
    if (!mensagem || !numeroChatAdminSelecionado) return;
    const resposta = await fetchAdmin(`${URL_BACKEND}/api/chat/admin/${numeroChatAdminSelecionado}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ mensagem })
    });
    if (!resposta.ok) {
        alert("Não foi possível enviar a resposta.");
        return;
    }
    campo.value = "";
}

async function encerrarChatAdmin() {
    if (!numeroChatAdminSelecionado || !confirm("Encerrar e apagar esta conversa?")) return;
    const resposta = await fetchAdmin(`${URL_BACKEND}/api/chat/admin/${numeroChatAdminSelecionado}`, { method: "DELETE" });
    if (!resposta.ok) {
        alert("Não foi possível encerrar a conversa.");
        return;
    }
    numeroChatAdminSelecionado = null;
    document.getElementById("chat-admin-painel").style.display = "none";
    await carregarChatsAdmin();
}

function iniciarHeartbeatAdmin() {
    interromperHeartbeatAdmin();
    pingTimerAdmin = setInterval(() => {
        if (socketAdmin && socketAdmin.readyState === WebSocket.OPEN) {
            socketAdmin.send(JSON.stringify({ tipo: "PING" }));
        }
    }, 40000); // 40s mantém o canal aberto no Render
}

function interromperHeartbeatAdmin() {
    if (pingTimerAdmin) {
        clearInterval(pingTimerAdmin);
        pingTimerAdmin = null;
    }
}

// ==========================================
// 🔊 BANNER INTERMEDIÁRIO E GERENCIADOR DE ÁUDIO
// ==========================================
function exibirBannerAtivacaoAudio() {
    const bannerId = "banner-ativacao-audio";
    if (document.getElementById(bannerId)) return;

    const banner = document.createElement("div");
    banner.id = bannerId;
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; 
        background: #111; color: #fff; text-align: center; 
        padding: 15px; z-index: 9999; font-weight: bold;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5); cursor: pointer;
    `;
    banner.innerHTML = '🔔 Clique aqui para ativar as notificações sonoras dos novos pedidos.';

    banner.addEventListener("click", () => {
        inicializarAudioContext();
        if (audioCtxCompartilhado) somNovoPedido = carregarSomNovoPedido(audioCtxCompartilhado);
        banner.remove();
        if (typeof iniciarTurnoAdmin === "function") iniciarTurnoAdmin();
    });

    document.body.prepend(banner);
}

function inicializarAudioContext() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            console.error("Este navegador não oferece suporte a notificações sonoras.");
            return;
        }
        audioCtxCompartilhado = new AudioContextClass();
        audioCtxCompartilhado.resume().catch((erro) => {
            console.error("Não foi possível ativar o áudio:", erro);
        });
        console.log("Contexto de áudio inicializado via clique administrativo.");
    } catch (e) {
        console.error("Falha ao inicializar o AudioContext:", e);
    }
}

async function carregarSomNovoPedido(contexto) {
    try {
        const resposta = await fetch("som-novo-pedido.mp3");
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        return await contexto.decodeAudioData(await resposta.arrayBuffer());
    } catch (erro) {
        console.error("Não foi possível carregar o som de novos pedidos:", erro);
        alert("Não foi possível carregar o novo som de pedidos. O alerta sonoro original será usado.");
        return null;
    }
}

async function tocarSomNovoPedido() {
    const contexto = audioCtxCompartilhado;
    if (!contexto || !somNovoPedido) return;
    const som = await somNovoPedido;
    if (!som) {
        tocarAlertaSonoro();
        return;
    }
    try {
        if (contexto.state === "suspended") await contexto.resume();
        const fonte = contexto.createBufferSource();
        fonte.buffer = som;
        fonte.connect(contexto.destination);
        fonte.start();
    } catch (erro) {
        console.error("Não foi possível reproduzir o som de novo pedido:", erro);
        alert("Não foi possível reproduzir o som de novo pedido. Verifique o áudio do navegador.");
    }
}

function tocarAlertaSonoro() {
    if (!audioCtxCompartilhado) return;
    
    if (audioCtxCompartilhado.state === "suspended") {
        audioCtxCompartilhado.resume().catch((erro) => {
            console.error("Não foi possível reativar o áudio:", erro);
        });
    }

    const osc = audioCtxCompartilhado.createOscillator();
    const gain = audioCtxCompartilhado.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtxCompartilhado.currentTime); 
    osc.frequency.setValueAtTime(880.00, audioCtxCompartilhado.currentTime + 0.15); 

    gain.gain.setValueAtTime(0.3, audioCtxCompartilhado.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxCompartilhado.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(audioCtxCompartilhado.destination);

    osc.start();
    osc.stop(audioCtxCompartilhado.currentTime + 0.4);
}

function iniciarTurnoAdmin() {
    console.log("Turno iniciado operacionalmente.");
}
// ==========================================
// 📋 RENDERIZAÇÃO DA VISÃO DE PEDIDOS
// ==========================================
function escaparHtml(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[caractere]));
}

function obterItensPedido(pedido) {
    if (!pedido.itens) return [];
    try {
        const itens = typeof pedido.itens === "string" ? JSON.parse(pedido.itens) : pedido.itens;
        if (Array.isArray(itens)) return itens;
        if (itens && typeof itens === "object") return Object.values(itens);
    } catch (erro) {
        console.error(`Itens inválidos no pedido #${pedido.id}:`, erro);
    }
    return [];
}

function obterPrecoItem(item) {
    return Number(item.preco ?? item.valor ?? item.precoUnitario ?? 0);
}

function renderizarItensPedido(pedido) {
    const itens = obterItensPedido(pedido);
    if (!itens.length) {
        return `<div class="itens-pedido"><strong>Itens:</strong><span>Não informado</span></div>`;
    }

    return `
        <div class="itens-pedido">
            <strong>Itens do pedido</strong>
            ${itens.map(item => {
                const quantidade = Number(item.quantidade || 1);
                const preco = obterPrecoItem(item);
                const subtotal = quantidade * preco;
                return `<div class="item-pedido-linha">
                    <span><b>${quantidade}x</b> ${escaparHtml(item.nome || "Item")}</span>
                    <strong>R$ ${subtotal.toFixed(2).replace(".", ",")}</strong>
                </div>`;
            }).join("")}
        </div>
    `;
}

function obterTaxaEntregaPedido(pedido) {
    const subtotal = calcularTotalItensPedido(pedido);
    const total = obterTotalPedido(pedido);
    return Math.max(0, total - subtotal);
}

function calcularTotalItensPedido(pedido) {
    return obterItensPedido(pedido).reduce((total, item) => {
        return total + (Number(item.quantidade || item.qtd || 1) * obterPrecoItem(item));
    }, 0);
}

function obterTotalPedido(pedido) {
    const totalRegistrado = Number(pedido.valorTotal ?? pedido.total ?? 0);
    return totalRegistrado > 0 ? totalRegistrado : calcularTotalItensPedido(pedido);
}

function pedidoEDeRetirada(pedido) {
    return String(pedido?.endereco || "").trim().toUpperCase().startsWith("RETIRADA");
}

function numeroExibicaoPedido(pedido) {
    return pedido.numeroPedido || pedido.id;
}

function textoStatusPedido(pedido) {
    const status = {
        RECEBIDO: "Recebido",
        PREPARO: "Preparando",
        PREPARANDO: "Preparando",
        ENTREGA: pedidoEDeRetirada(pedido) ? "Pronto para retirada" : "Saiu para entrega",
        SAIU_ENTREGA: "Saiu para entrega",
        ENTREGUE: pedidoEDeRetirada(pedido) ? "Retirado" : "Entregue",
        CANCELADO: "Cancelado"
    };
    return status[pedido.status] || pedido.status || "Não informado";
}

function obterLocalPedido(pedido) {
    return pedidoEDeRetirada(pedido)
        ? "🏪 RETIRADA NO ESTABELECIMENTO"
        : `📍 Endereço: ${escaparHtml(pedido.endereco || "Não informado")}`;
}

function textoTrocoPedido(pedido) {
    if (pedido.trocoPara == null) return "";
    const valor = Number(pedido.trocoPara);
    const troco = Math.max(0, valor - obterTotalPedido(pedido));
    return `Troco para R$ ${valor.toFixed(2).replace(".", ",")} (troco: R$ ${troco.toFixed(2).replace(".", ",")})`;
}

function atualizarResumoFinanceiro(pedidos, elementoId) {
    const validos = pedidos.filter(pedido => pedido.status !== "CANCELADO");
    const total = validos.reduce((soma, pedido) => soma + obterTotalPedido(pedido), 0);
    const ticketMedio = validos.length ? total / validos.length : 0;
    const quantidade = resumosFinanceiros.get(elementoId)?.quantidade ?? 0;
    resumosFinanceiros.set(elementoId, { quantidade, total, ticketMedio });
    renderizarResumoFinanceiro(elementoId);
}

function atualizarContagemPedidos(elementoId, quantidade) {
    const resumo = resumosFinanceiros.get(elementoId);
    if (!resumo || resumo.quantidade === quantidade) return;
    resumo.quantidade = quantidade;
    renderizarResumoFinanceiro(elementoId);
}

function renderizarResumoFinanceiro(elementoId) {
    const elemento = document.getElementById(elementoId);
    const resumo = resumosFinanceiros.get(elementoId);
    if (!elemento || !resumo) return;
    const formatarValor = valor => valoresFinanceirosOcultos
        ? '<strong aria-label="Valor oculto">••••</strong>'
        : `<strong>R$ ${valor.toFixed(2).replace(".", ",")}</strong>`;
    elemento.innerHTML = `
        <div class="resumo-card"><span>Pedidos</span><strong>${resumo.quantidade}</strong></div>
        <div class="resumo-card"><span>Saldo geral</span>${formatarValor(resumo.total)}</div>
        <div class="resumo-card"><span>Ticket médio</span>${formatarValor(resumo.ticketMedio)}</div>
    `;
}

function atualizarBotoesValoresFinanceiros() {
    document.querySelectorAll(".botao-valores-financeiros").forEach(botao => {
        botao.textContent = valoresFinanceirosOcultos ? "Mostrar valores" : "Ocultar valores";
        botao.setAttribute("aria-pressed", String(valoresFinanceirosOcultos));
    });
}

function alternarValoresFinanceiros() {
    valoresFinanceirosOcultos = !valoresFinanceirosOcultos;
    localStorage.setItem(chaveValoresFinanceirosOcultos, String(valoresFinanceirosOcultos));
    atualizarBotoesValoresFinanceiros();
    resumosFinanceiros.forEach((_, elementoId) => renderizarResumoFinanceiro(elementoId));
}

function serializarPedidos(pedidos) {
    return (pedidos || [])
        .map(pedido => `${numeroExibicaoPedido(pedido)}|${pedido.status}|${Number(pedido.valorTotal ?? pedido.total ?? 0).toFixed(2)}|${Array.isArray(pedido.itens) ? pedido.itens.map(item => `${item.nome || ""}:${item.quantidade || item.qtd || 1}:${Number(item.preco ?? item.valor ?? item.precoUnitario ?? 0).toFixed(2)}`).join(";") : ""}`)
        .join("~");
}

function organizarCardPedido(card, pedido, tipo) {
    const chave = String(pedido.id ?? numeroExibicaoPedido(pedido));
    const historico = tipo === "historico";
    if (!historico) pedidosHistoricoExpandidos.delete(chave);
    const detalhes = document.createElement("details");
    detalhes.className = "detalhes-pedido";
    detalhes.open = historico ? pedidosHistoricoExpandidos.has(chave) : !pedidosAtivosMinimizados.has(chave);

    const resumo = document.createElement("summary");
    resumo.className = "resumo-pedido";
    const titulo = document.createElement("span");
    titulo.className = "resumo-pedido-titulo";
    titulo.textContent = `Pedido #${numeroExibicaoPedido(pedido)} - ${pedido.clienteNome || pedido.nomeCliente || "Não informado"}`;
    const info = document.createElement("span");
    info.className = "resumo-pedido-info";
    info.textContent = `${pedidoEDeRetirada(pedido) ? "Retirada" : "Entrega"} · ${textoStatusPedido(pedido)} · R$ ${obterTotalPedido(pedido).toFixed(2).replace(".", ",")}`;
    const acao = document.createElement("span");
    acao.className = "resumo-pedido-acao";
    acao.textContent = detalhes.open ? "Minimizar ▲" : "Ver detalhes ▼";
    resumo.append(titulo, info, acao);

    const cabecalho = card.firstElementChild;
    cabecalho.querySelector("h4").remove();
    cabecalho.querySelector(".badge-cat").textContent = `Status: ${textoStatusPedido(pedido)}`;
    detalhes.appendChild(resumo);
    while (card.firstChild) detalhes.appendChild(card.firstChild);
    card.appendChild(detalhes);

    detalhes.addEventListener("toggle", () => {
        const estado = historico ? pedidosHistoricoExpandidos : pedidosAtivosMinimizados;
        const guardar = historico ? detalhes.open : !detalhes.open;
        if (guardar) estado.add(chave);
        else estado.delete(chave);
        acao.textContent = detalhes.open ? "Minimizar ▲" : "Ver detalhes ▼";
    });
    return card;
}

function atualizarListaPedidos(container, pedidos, tipo) {
    if (!container) return;

    const containerScroll = document.getElementById("conteudo-painel");
    const scrollAnterior = containerScroll ? containerScroll.scrollTop : 0;
    const snapshot = serializarPedidos(pedidos);
    const ultimoSnapshot = tipo === "ativos" ? ultimoSnapshotPedidosAtivos : ultimoSnapshotPedidosHistorico;

    if (snapshot === ultimoSnapshot && container.children.length > 0) {
        return;
    }

    if (tipo === "ativos") {
        ultimoSnapshotPedidosAtivos = snapshot;
    } else {
        ultimoSnapshotPedidosHistorico = snapshot;
    }

    const cards = pedidos
        .filter(pedido => tipo === "ativos" ? pedido.status !== 'ENTREGUE' && pedido.status !== 'CANCELADO' : pedido.status === 'ENTREGUE' || pedido.status === 'CANCELADO')
        .map(pedido => {
            if (tipo === "ativos") {
                const retirada = pedidoEDeRetirada(pedido);
                const card = document.createElement("div");
                card.className = "card-pedido";
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h4 style="margin: 0 0 6px 0; color: #1e293b;">📋 Pedido #${numeroExibicaoPedido(pedido)} - Cliente: ${pedido.clienteNome || pedido.nomeCliente || 'Não informado'}</h4>
                            <small style="color: ${retirada ? "#92400e" : "var(--text-muted)"}; display: block; margin-bottom: 4px; font-size: 0.9rem; font-weight: ${retirada ? "800" : "400"};">${obterLocalPedido(pedido)}</small>
                            <small style="color: #0f766e; font-weight: 700; font-size: 0.9rem;">💳 Forma de Pagamento: ${pedido.formaPagamento}</small>
                            ${pedido.trocoPara != null ? `<small style="display: block; margin-top: 6px; color: #92400e; font-weight: 700;">💵 ${textoTrocoPedido(pedido)}</small>` : ""}
                            <small style="display: block; margin-top: 6px; color: #766b5f; font-weight: 700;">🧾 Subtotal: R$ ${calcularTotalItensPedido(pedido).toFixed(2).replace(".", ",")} · Taxa: R$ ${obterTaxaEntregaPedido(pedido).toFixed(2).replace(".", ",")}</small>
                            <small style="display: block; margin-top: 4px; color: #b45309; font-weight: 800;">💰 Total: R$ ${obterTotalPedido(pedido).toFixed(2).replace(".", ",")}</small>
                            ${pedido.comprovantePixDisponivel ? `<small style="display: block; margin-top: 6px;"><button type="button" class="btn-status-toggle ativo" style="background: #eff6ff; color: #1e40af; border-color: #bfdbfe;" onclick="abrirComprovantePix(${pedido.id})">🧾 Ver comprovante Pix</button></small>` : ""}
                            ${pedido.observacao ? `<small style="color: #92400e; display: block; margin-top: 6px; font-weight: 700;">📝 Observação: ${pedido.observacao}</small>` : ""}
                        </div>
                        <span class="badge-cat" style="background: #fffbeb; color: #b45309; border-color: #fde68a;">Status: ${pedido.status}</span>
                    </div>
                    ${renderizarItensPedido(pedido)}
                    <div class="acoes-pedido-bloco" style="border-top: 1px solid #f1f5f9; padding-top: 14px; display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn-status-toggle ativo" style="background: #eff6ff; color: #1e40af; border-color: #bfdbfe;" onclick="mudarStatusPedido(${pedido.id}, 'PREPARO')">👨‍🍳 Preparar</button>
                        <button class="btn-status-toggle ativo" style="background: ${retirada ? "#fff7ed" : "#f0fdf4"}; color: ${retirada ? "#9a3412" : "#166534"}; border-color: ${retirada ? "#fed7aa" : "#bbf7d0"};" onclick="mudarStatusPedido(${pedido.id}, 'ENTREGA')">${retirada ? "📦 Disponibilizar retirada" : "🛵 Despachar"}</button>
                        <button class="btn-status-toggle inativo" style="background: #f8fafc; color: #1e293b; border-color: #cbd5e1;" onclick="mudarStatusPedido(${pedido.id}, 'ENTREGUE')">${retirada ? "✅ Confirmar retirada" : "✅ Finalizar"}</button>
                        <button class="btn-status-toggle inativo" style="background: #fff1f2; color: #be123c; border-color: #fecdd3;" onclick="cancelarPedido(${pedido.id})">✕ Cancelar</button>
                    </div>
                `;

                const btnImprimir = document.createElement("button");
                btnImprimir.className = "btn-status-toggle ativo";
                btnImprimir.style.cssText = "background: #fff5f5; color: #c53030; border-color: #feb2b2; font-weight: bold;";
                btnImprimir.textContent = "🖨️ Imprimir Cupom";
                btnImprimir.addEventListener("click", () => {
                    imprimirCupomIFood(pedido);
                });
                card.querySelector(".acoes-pedido-bloco").prepend(btnImprimir);
                return organizarCardPedido(card, pedido, tipo);
            }

            const card = document.createElement("div");
            const retirada = pedidoEDeRetirada(pedido);
            card.className = "card-pedido";
            card.style.borderLeft = pedido.status === "CANCELADO" ? "5px solid #e11d48" : "5px solid var(--success)";
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="margin: 0 0 6px 0; color: #1e293b;">${pedido.status === "CANCELADO" ? "✕" : "✅"} Pedido #${numeroExibicaoPedido(pedido)} - Cliente: ${pedido.clienteNome || pedido.nomeCliente || 'Não informado'}</h4>
                        <small style="color: ${retirada ? "#92400e" : "var(--text-muted)"}; display: block; margin-bottom: 4px; font-size: 0.9rem; font-weight: ${retirada ? "800" : "400"};">${obterLocalPedido(pedido)}</small>
                        <small style="color: #475569; font-size: 0.9rem;">💳 Forma de pagamento: ${pedido.formaPagamento}</small>
                        ${pedido.trocoPara != null ? `<small style="display: block; margin-top: 6px; color: #92400e; font-weight: 700;">💵 ${textoTrocoPedido(pedido)}</small>` : ""}
                        <small style="display: block; margin-top: 4px; color: #766b5f; font-weight: 700;">🧾 Subtotal: R$ ${calcularTotalItensPedido(pedido).toFixed(2).replace(".", ",")} · Taxa: R$ ${obterTaxaEntregaPedido(pedido).toFixed(2).replace(".", ",")}</small>
                        <small style="display: block; margin-top: 4px; color: #b45309; font-weight: 800;">💰 Total: R$ ${obterTotalPedido(pedido).toFixed(2).replace(".", ",")}</small>
                        ${pedido.comprovantePixDisponivel ? `<small style="display: block; margin-top: 6px;"><button type="button" class="btn-status-toggle ativo" style="background: #eff6ff; color: #1e40af; border-color: #bfdbfe;" onclick="abrirComprovantePix(${pedido.id})">🧾 Ver comprovante Pix</button></small>` : ""}
                        ${pedido.observacao ? `<small style="color: #92400e; display: block; margin-top: 6px; font-weight: 700;">📝 Observação: ${pedido.observacao}</small>` : ""}
                    </div>
                    <span class="badge-cat" style="background: ${pedido.status === "CANCELADO" ? "#fff1f2" : "#e6f4ea"}; color: ${pedido.status === "CANCELADO" ? "#be123c" : "#137333"}; border-color: ${pedido.status === "CANCELADO" ? "#fecdd3" : "#ceead6"};">Status: ${pedido.status}</span>
                </div>
                ${renderizarItensPedido(pedido)}
            `;
            const btnImprimirHistorico = document.createElement("button");
            btnImprimirHistorico.className = "btn-status-toggle ativo";
            btnImprimirHistorico.style.cssText = "margin-top: 12px; background: #fff5f5; color: #c53030; border-color: #feb2b2; font-weight: bold;";
            btnImprimirHistorico.textContent = "🖨️ Imprimir Cupom";
            btnImprimirHistorico.addEventListener("click", () => imprimirCupomIFood(pedido));
            card.appendChild(btnImprimirHistorico);
            return organizarCardPedido(card, pedido, tipo);
        });

    container.innerHTML = "";
    cards.forEach(card => container.appendChild(card));

    if (tipo === "ativos" && !cards.length) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 30px; background: #f8fafc; border-radius: 10px; border: 2px dashed #e2e8f0; margin: 0;">Nenhum pedido em andamento.</p>`;
    }

    if (tipo === "historico" && !cards.length) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 30px; background: #f8fafc; border-radius: 10px; border: 2px dashed #e2e8f0; margin: 0;">Nenhum pedido finalizado no histórico.</p>`;
    }

    if (containerScroll) {
        containerScroll.scrollTop = scrollAnterior;
    }
}

async function abrirComprovantePix(pedidoId) {
    const resposta = await fetchAdmin(`${URL_BACKEND}/api/pedidos/${pedidoId}/comprovante`);
    if (!resposta.ok) {
        alert("Não foi possível abrir o comprovante Pix.");
        return;
    }
    const arquivo = await resposta.blob();
    const url = URL.createObjectURL(arquivo);
    const janela = window.open(url, "_blank");
    if (!janela) {
        URL.revokeObjectURL(url);
        alert("Permita pop-ups para visualizar o comprovante.");
        return;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function renderizarHistoricoFiltrado() {
    const busca = (document.getElementById("filtro-historico-busca")?.value || "").trim().toLocaleLowerCase("pt-BR");
    const status = document.getElementById("filtro-historico-status")?.value || "";
    const inicio = document.getElementById("filtro-historico-inicio")?.value || "";
    const fim = document.getElementById("filtro-historico-fim")?.value || "";
    const filtrados = pedidosHistoricoLocal.filter(pedido => {
        const texto = `${numeroExibicaoPedido(pedido)} ${pedido.clienteNome || ""} ${pedido.telefone || ""}`.toLocaleLowerCase("pt-BR");
        const data = String(pedido.dataCriacao || "").slice(0, 10);
        return (!busca || texto.includes(busca))
            && (!status || pedido.status === status)
            && (!inicio || data >= inicio)
            && (!fim || data <= fim);
    });
    atualizarContagemPedidos("resumo-historico", filtrados.length);
    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / pedidosPorPaginaHistorico));
    paginaHistorico = Math.min(paginaHistorico, totalPaginas);
    const inicioPagina = (paginaHistorico - 1) * pedidosPorPaginaHistorico;
    ultimoSnapshotPedidosHistorico = null;
    atualizarListaPedidos(
        document.getElementById("lista-pedidos-finalizados"),
        filtrados.slice(inicioPagina, inicioPagina + pedidosPorPaginaHistorico),
        "historico"
    );
    const paginacao = document.getElementById("paginacao-historico");
    if (paginacao) {
        paginacao.innerHTML = `
            <button class="btn-acao" type="button" ${paginaHistorico === 1 ? "disabled" : ""} onclick="mudarPaginaHistorico(-1)">Anterior</button>
            <span>Página ${paginaHistorico} de ${totalPaginas} (${filtrados.length} pedidos)</span>
            <button class="btn-acao" type="button" ${paginaHistorico === totalPaginas ? "disabled" : ""} onclick="mudarPaginaHistorico(1)">Próxima</button>
        `;
    }
}

function limparFiltrosHistorico() {
    ["filtro-historico-busca", "filtro-historico-status", "filtro-historico-inicio", "filtro-historico-fim"]
        .forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.value = "";
        });
    paginaHistorico = 1;
    renderizarHistoricoFiltrado();
}

function renderizarAtivosFiltrados() {
    const busca = (document.getElementById("filtro-ativos-busca")?.value || "").trim().toLocaleLowerCase("pt-BR");
    const filtrados = pedidosAtivosLocal.filter(pedido => {
        const texto = `${numeroExibicaoPedido(pedido)} ${pedido.clienteNome || ""} ${pedido.telefone || ""}`.toLocaleLowerCase("pt-BR");
        return !busca || texto.includes(busca);
    }).sort((a, b) => String(b.dataCriacao || "").localeCompare(String(a.dataCriacao || ""))
        || Number(b.id || 0) - Number(a.id || 0));
    atualizarContagemPedidos("resumo-financeiro", filtrados.length);
    ultimoSnapshotPedidosAtivos = null;
    atualizarListaPedidos(document.getElementById("lista-pedidos-ativos"), filtrados, "ativos");
}

function limparBuscaAtivos() {
    const busca = document.getElementById("filtro-ativos-busca");
    if (busca) busca.value = "";
    renderizarAtivosFiltrados();
}

function mudarPaginaHistorico(direcao) {
    paginaHistorico += direcao;
    renderizarHistoricoFiltrado();
}

async function carregarProdutosBalcao() {
    const busca = document.getElementById("balcao-busca");
    if (!busca) return;
    try {
        const [resProdutos, resAcompanhamentos] = await Promise.all([
            fetch(URL_BACKEND + "/api/cardapio"),
            fetch(URL_BACKEND + "/api/acompanhamentos")
        ]);
        if (!resProdutos.ok) throw new Error(`Produtos: HTTP ${resProdutos.status}`);
        produtosBalcao = await resProdutos.json();
        acompanhamentosBalcao = (resAcompanhamentos.ok ? await resAcompanhamentos.json() : [])
            .filter(item => item.disponivel);
        busca.oninput = renderizarResultadosBuscaBalcao;
        renderizarResultadosBuscaBalcao();
    } catch (erro) {
        console.error("Erro ao carregar produtos do balcão:", erro);
        busca.placeholder = "Não foi possível carregar o cardápio";
    }
}

function renderizarResultadosBuscaBalcao() {
    const busca = document.getElementById("balcao-busca");
    const resultados = document.getElementById("resultados-busca-balcao");
    if (!busca || !resultados) return;
    const termo = busca.value.trim().toLocaleLowerCase("pt-BR");
    const itens = produtosBalcao
        .filter(item => item.disponivel !== false)
        .filter(item => !termo || String(item.nome).toLocaleLowerCase("pt-BR").includes(termo))
        .slice(0, 8);
    resultados.innerHTML = itens.length
        ? itens.map(item => `
            <button type="button" class="btn-status-toggle ativo"
                    onclick="adicionarItemBalcao(${item.id})"
                    style="display: flex; justify-content: space-between; width: 100%; text-align: left;">
                <span>${escaparHtml(item.nome)}</span>
                <strong>R$ ${Number(item.preco || 0).toFixed(2).replace(".", ",")}</strong>
            </button>`).join("")
        : `<small style="color: var(--text-muted);">Nenhum item encontrado.</small>`;
}

function adicionarItemBalcao(idSelecionado) {
    const id = Number(idSelecionado);
    const quantidade = Math.max(1, Number(document.getElementById("balcao-quantidade")?.value || 1));
    const produto = produtosBalcao.find(item => item.id === id);
    if (!produto) {
        return;
    }
    itensPedidoBalcao.push({
        id: produto.id,
        nome: produto.nome,
        categoria: produto.categoria,
        preco: Number(produto.preco || 0),
        quantidade,
        acompanhamentos: [],
        observacao: ""
    });
    const busca = document.getElementById("balcao-busca");
    if (busca) {
        busca.value = "";
        renderizarResultadosBuscaBalcao();
        busca.focus();
    }
    renderizarPedidoBalcao();
}

function removerItemBalcao(indice) {
    itensPedidoBalcao.splice(indice, 1);
    renderizarPedidoBalcao();
}

function limparPedidoBalcao() {
    itensPedidoBalcao = [];
    const busca = document.getElementById("balcao-busca");
    if (busca) {
        busca.value = "";
        renderizarResultadosBuscaBalcao();
    }
    renderizarPedidoBalcao();
}

function atualizarAcompanhamentosItemBalcao(indice, checkbox) {
    const item = itensPedidoBalcao[indice];
    if (!item) return;
    const selecionados = Array.from(document.querySelectorAll(
        `.acompanhamentos-item-balcao[data-item-index="${indice}"] input[type='checkbox']:checked`
    ));
    if (selecionados.length > 2) {
        checkbox.checked = false;
        alert("Escolha no máximo 2 acompanhamentos para este prato.");
        return;
    }
    item.acompanhamentos = selecionados.map(opcao => opcao.value);
    renderizarPedidoBalcao();
}

function atualizarObservacaoItemBalcao(indice, valor) {
    if (itensPedidoBalcao[indice]) itensPedidoBalcao[indice].observacao = valor;
}

function renderizarPedidoBalcao() {
    const lista = document.getElementById("lista-itens-balcao");
    const total = itensPedidoBalcao.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
    const categoriasComAcompanhamentos = new Set(["PRATOS_DO_DIA", "FRANGO", "CARNE", "OUTROS"]);
    if (lista) {
        lista.innerHTML = itensPedidoBalcao.length
            ? itensPedidoBalcao.map((item, indice) => `
                <div class="card-balcao-prato" style="padding:16px; margin-bottom:12px; border:1px solid #e2e8f0; border-radius:14px; background:#fff;">
                    <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
                        <div>
                            <strong style="font-size:1.05rem;">${indice + 1}. ${item.quantidade}x ${escaparHtml(item.nome)}</strong>
                            <div style="color:#64748b; margin-top:4px;">R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</div>
                        </div>
                        <button type="button" class="btn-status-toggle inativo" onclick="removerItemBalcao(${indice})">Remover</button>
                    </div>
                    ${categoriasComAcompanhamentos.has(String(item.categoria || "").trim().toUpperCase()) ? `
                    <div class="acompanhamentos-item-balcao" data-item-index="${indice}" style="margin-top:12px; padding-top:12px; border-top:1px dashed #e2e8f0;">
                        <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:8px;">
                            <strong>Acompanhamentos deste prato</strong>
                            <span style="color:#64748b; font-size:.85rem;">${item.acompanhamentos.length}/2</span>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:7px;">
                            ${acompanhamentosBalcao.map(acompanhamento => `
                                <label class="opcao-acompanhamento-balcao ${item.acompanhamentos.includes(acompanhamento.nome) ? "selecionado" : ""}">
                                    <input type="checkbox" value="${escaparHtml(acompanhamento.nome)}"
                                        ${item.acompanhamentos.includes(acompanhamento.nome) ? "checked" : ""}
                                        onchange="atualizarAcompanhamentosItemBalcao(${indice}, this)">
                                    <span>${escaparHtml(acompanhamento.nome)}</span>
                                </label>`).join("")}
                        </div>
                    </div>` : ""}
                    <input type="text" value="${escaparHtml(item.observacao)}" placeholder="Observação deste item (opcional)"
                        oninput="atualizarObservacaoItemBalcao(${indice}, this.value)"
                        style="width:100%; box-sizing:border-box; margin-top:12px; padding:9px; border:1px solid #cbd5e1; border-radius:8px;">
                </div>`).join("")
            : "<p style='margin: 0; color: var(--text-muted);'>Nenhum item adicionado.</p>";
    }
    const totalEl = document.getElementById("total-pedido-balcao");
    if (totalEl) totalEl.textContent = `Total: R$ ${total.toFixed(2).replace(".", ",")}`;
}

function imprimirPedidoBalcao() {
    if (!itensPedidoBalcao.length) {
        alert("Adicione pelo menos um item antes de imprimir.");
        return;
    }
    const pagamento = document.getElementById("balcao-pagamento").value;
    const total = itensPedidoBalcao.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
    const janela = window.open("", "_blank", "width=360,height=650");
    if (!janela) {
        alert("Libere pop-ups para imprimir a comanda.");
        return;
    }
    const linhas = itensPedidoBalcao.map(item =>
        `<div class="item"><div><span>${item.quantidade}x ${escaparHtml(item.nome)}</span>
        ${item.acompanhamentos.length ? `<small>ACOMPANHAMENTOS: ${item.acompanhamentos.map(escaparHtml).join(", ")}</small>` : ""}
        ${item.observacao ? `<small>OBS: ${escaparHtml(item.observacao)}</small>` : ""}</div>
        <b>R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</b></div>`
    ).join("");
    janela.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>Comanda balcão</title>
        <style>
        @page{size:80mm auto;margin:0}body{width:72mm;margin:0 auto;padding:4mm 2mm;font:700 15px Arial,sans-serif;color:#000}
        h1{text-align:center;font-size:20px;margin:0 0 4px}h2{text-align:center;font-size:18px;border:2px solid #000;padding:5px;margin:8px 0}
        .linha{border-top:1px dashed #000;margin:8px 0}.item{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px dotted #777}.item small{display:block;font-size:12px;margin-top:3px}
        .total{display:flex;justify-content:space-between;font-size:20px;margin-top:10px}
        </style></head><body><h1>SABOR CEARENSE</h1><h2>RETIRADA / BALCÃO</h2><div class="linha"></div>${linhas}
        <div class="linha"></div><p>PAGAMENTO: ${escaparHtml(pagamento)}</p><div class="total"><span>TOTAL</span><span>R$ ${total.toFixed(2).replace(".", ",")}</span></div>
        <p style="text-align:center;margin-top:18px">Pedido de balcão</p></body></html>`);
    janela.document.close();
    janela.focus();
    janela.print();
    limparPedidoBalcao();
}

async function carregarPedidosAtivos() {
    if (carregandoPedidosAtivos) return;
    carregandoPedidosAtivos = true;

    const containerAtivos = document.getElementById("lista-pedidos-ativos");
    const containerHistorico = document.getElementById("lista-pedidos-finalizados");

    try {
        const resAtivos = await fetchAdmin(URL_BACKEND + "/api/pedidos/ativos");
        if (resAtivos.ok) {
            const pedidosAtivos = await resAtivos.json();
            atualizarResumoFinanceiro(pedidosAtivos, "resumo-financeiro");

            const novosPedidos = primeiraCargaPedidos
                ? []
                : pedidosAtivos.filter(pedido =>
                    pedido.status === "RECEBIDO" &&
                    pedido.id &&
                    !idsPedidosConhecidos.has(pedido.id) &&
                    !idsPedidosAlertados.has(pedido.id)
                );
            novosPedidos.forEach(pedido => {
                idsPedidosAlertados.add(pedido.id);
                tocarSomNovoPedido();
            });
            pedidosAtivos.forEach(pedido => idsPedidosConhecidos.add(pedido.id));
            primeiraCargaPedidos = false;

            const pedidosVisiveis = pedidosAtivos.filter(pedido =>
                pedido.status !== 'ENTREGUE' &&
                pedido.status !== 'CANCELADO' &&
                !pedidosFinalizadosLocal.has(String(pedido.id))
            );
            pedidosAtivosLocal = pedidosVisiveis;
            renderizarAtivosFiltrados();
        }
    } catch (e) { console.log("Erro ao carregar pedidos ativos:", e); }

    try {
        const resTodos = await fetchAdmin(URL_BACKEND + "/api/pedidos");
        if (resTodos.ok) {
            const todosPedidos = await resTodos.json();
            atualizarResumoFinanceiro(todosPedidos, "resumo-financeiro");
            atualizarResumoFinanceiro(todosPedidos, "resumo-historico");
            const pedidosFinalizados = todosPedidos.filter(pedido => pedido.status === 'ENTREGUE' || pedido.status === 'CANCELADO');
            pedidosHistoricoLocal = pedidosFinalizados;
            renderizarHistoricoFiltrado();
        }
    } catch (e) { console.log("Erro ao carregar histórico de finalizados:", e); }

    carregandoPedidosAtivos = false;
}

async function apagarHistoricoAntigo() {
    const confirmou = confirm(
        "Deseja realmente apagar os pedidos ENTREGUES ou CANCELADOS com mais de 2 dias?\n\n" +
        "Essa ação é permanente e não pode ser desfeita."
    );
    if (!confirmou) return;

    try {
        const res = await fetchAdmin(`${URL_BACKEND}/api/pedidos/historico-antigo`, {
            method: "DELETE"
        });
        if (!res.ok) {
            alert("Não foi possível apagar o histórico antigo.");
            return;
        }

        const resultado = await res.json();
        alert(`${resultado.apagados || 0} pedido(s) antigo(s) foram apagados.`);
        ultimoSnapshotPedidosHistorico = null;
        await carregarPedidosAtivos();
    } catch (erro) {
        console.error("Erro ao apagar histórico antigo:", erro);
        alert("Não foi possível conectar ao servidor para apagar o histórico.");
    }
}

async function mudarStatusPedido(id, novoStatus) {
    try {
        const res = await fetchAdmin(`${URL_BACKEND}/api/pedidos/${id}/status?status=${encodeURIComponent(novoStatus)}`, { method: "PUT" });
        if (res.ok) {
            const pedidoAtualizado = await res.json();
            const statusFinalizado = pedidoAtualizado.status === "ENTREGUE" || pedidoAtualizado.status === "CANCELADO";
            if (statusFinalizado) {
                pedidosFinalizadosLocal.add(String(id));
                pedidosHistoricoLocal = [
                    ...pedidosHistoricoLocal.filter(pedido => pedido.id !== id),
                    pedidoAtualizado
                ];
                ultimoSnapshotPedidosHistorico = null;
                renderizarHistoricoFiltrado();
                await carregarChatsAdmin();
            }
            pedidosAtivosLocal = pedidosAtivosLocal
                .map(pedido => pedido.id === id ? { ...pedido, ...pedidoAtualizado } : pedido)
                .filter(pedido => pedido.status !== "ENTREGUE" && pedido.status !== "CANCELADO");
            ultimoSnapshotPedidosAtivos = null;
            renderizarAtivosFiltrados();
            if (statusFinalizado) carregarChatsAdmin();
            await carregarPedidosAtivos();
            if (socketAdmin && socketAdmin.readyState === WebSocket.OPEN) {
                socketAdmin.send(JSON.stringify({ id, status: novoStatus }));
            }
        } else {
            alert("Não foi possível atualizar o status do pedido.");
        }
    } catch (e) { 
        console.error("Erro ao mudar status do pedido:", e);
    }
}

async function cancelarPedido(id) {
    if (!confirm(`Cancelar o pedido #${id}? Essa ação ficará registrada no histórico.`)) return;
    await mudarStatusPedido(id, "CANCELADO");
}

async function autenticarAdmin() {
    const campoUsuario = document.getElementById("usuario-login");
    const campoSenha = document.getElementById("senha-login");

    if (!campoUsuario || !campoSenha) {
        console.error("Campos de login nao encontrados.");
        return;
    }

    const u = campoUsuario.value.trim();
    const s = campoSenha.value;

    try {
        const resposta = await fetch(URL_BACKEND + "/api/admin/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({ username: u, password: s })
        });
        if (!resposta.ok) {
            alert("Usuario ou senha incorretos!");
            return;
        }
        const dados = await resposta.json();
        localStorage.setItem("adminToken", dados.token);
        document.getElementById("container-login-view").style.display = "none";
        document.getElementById("painel-adm-wrapper").style.display = "flex";
        
        if (typeof carregarItensAdmin === "function") carregarItensAdmin();
        if (typeof carregarAcompanhamentosAdmin === "function") carregarAcompanhamentosAdmin();
        if (typeof inicializarControlePedidos === "function") inicializarControlePedidos();
        if (typeof configurarFormularioCadastro === "function") configurarFormularioCadastro();
        if (typeof exibirBannerAtivacaoAudio === "function") exibirBannerAtivacaoAudio();
    } catch (erro) {
        alert("Nao foi possivel conectar ao servidor de autenticacao.");
    }
}

function criarDivDivisora(janela, dupla) {
    var div = janela.document.createElement("div");
    div.className = dupla ? "divider-double" : "divider-dashed";
    return div;
}

function formatarPrevisaoEntrega(pedido) {
    const padrao = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/;
    const inicio = String(pedido.previsaoEntregaInicio || "").match(padrao);
    const fim = String(pedido.previsaoEntregaFim || "").match(padrao);
    if (!inicio || !fim) return "Não disponível";
    const dataInicio = `${inicio[3]}/${inicio[2]}/${inicio[1]}`;
    const dataFim = `${fim[3]}/${fim[2]}/${fim[1]}`;
    return dataInicio === dataFim
        ? `${dataInicio}, ${inicio[4]} às ${fim[4]}`
        : `${dataInicio} ${inicio[4]} às ${dataFim} ${fim[4]}`;
}

function imprimirCupomIFood(pedido) {
    var larguraJanela = 360;
    var alturaJanela = 700;
    var posicaoEsquerda = (window.screen.width / 2) - (larguraJanela / 2);
    var posicaoTopo = (window.screen.height / 2) - (alturaJanela / 2);

    var janelaImpressao = window.open(
        "", 
        "_blank", 
        "width=" + larguraJanela + ",height=" + alturaJanela + ",top=" + posicaoTopo + ",left=" + posicaoEsquerda + ",scrollbars=yes"
    );

    if (!janelaImpressao) {
        alert("⚠️ O bloqueador de pop-ups impediu a impressão. Por favor, libere pop-ups para este site.");
        return;
    }

    janelaImpressao.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>iFood Cupom #" + numeroExibicaoPedido(pedido) + "</title></head><body></body></html>");
    janelaImpressao.document.close();

    var elEstilo = janelaImpressao.document.createElement("style");
    var regrasCSS = "body { width: 72mm; max-width: 72mm; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; line-height: 1.4; margin: 0 auto; padding: 3mm 2mm; color: #000 !important; background: #fff; overflow-wrap: anywhere; -webkit-print-color-adjust: exact; print-color-adjust: exact; -webkit-font-smoothing: none; } * { color: #000 !important; font-weight: 700; text-shadow: 0 0 0 #000; } .tabela-itens td, .tabela-itens th { font-size: 15px; } .text-center { text-align: center; } .text-right { text-align: right; } .negrito { font-weight: bold; } .divider-dashed { border-top: 1px dashed #000; margin: 7px 0; } .divider-double { border-top: 3px double #000; margin: 9px 0; } .tag-tipo-entrega { font-size: 22px; font-weight: bold; text-align: center; border: 2px solid #000; padding: 5px 4px; margin-bottom: 9px; letter-spacing: 1px; } .titulo-loja { font-size: 20px; margin: 0; font-weight: 900; text-transform: uppercase; } .subtitulo-loja { font-size: 13px; margin: 3px 0; } .id-pedido { font-size: 26px; font-weight: 900; font-weight: bold; margin: 5px 0; } .secao-titulo { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; } .bloco-conteudo { margin-bottom: 8px; } .tabela-itens { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 6px 0; } .tabela-itens th { border-bottom: 1px solid #000; font-size: 12px; padding: 3px 0; text-align: left; } .tabela-itens td { vertical-align: top; padding: 5px 0; border-bottom: 1px dotted #999; overflow-wrap: anywhere; } .col-qtd { width: 13%; font-weight: bold; }     .col-nome { width: 60%; font-style: italic; } .col-preco { width: 27%; text-align: right !important; white-space: nowrap; } .linha-financeiro { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; } .linha-total { display: flex; justify-content: space-between; gap: 8px; font-size: 19px; font-weight: bold; margin-top: 7px; padding-top: 5px; border-top: 1px dashed #000; } .bloco-obs { border-left: 4px solid #000; padding-left: 8px; margin: 6px 0; white-space: pre-wrap; font-size: 14px; font-weight: bold; } @media print { @page { size: 80mm auto; margin: 0; } body { width: 72mm; max-width: 72mm; padding: 4mm 2mm; } }";
    
    elEstilo.textContent = regrasCSS;
    janelaImpressao.document.head.appendChild(elEstilo);

    var nomeClienteFinal = (pedido.clienteNome || pedido.nomeCliente || "Não informado").toUpperCase();
    var enderecoBruto = pedido.endereco || "RETIRADA NO ESTABELECIMENTO";
    var telefoneFinal = (pedido.telefone || pedido.telefoneContato || "").toString().trim() || "Não informado";
    var referenciaFinal = "Não informada";
    
    var matchTel = enderecoBruto.match(/\(Tel:\s*([^)]+)\)/);
    if (matchTel && telefoneFinal === "Não informado") {
        telefoneFinal = matchTel[1].trim();
    }
    if (matchTel) {
        enderecoBruto = enderecoBruto.replace(matchTel[0], ""); 
    }

    var matchRef = enderecoBruto.match(/\(Ref:\s*([^)]+)\)/);
    if (matchRef) {
        referenciaFinal = matchRef[1].trim();
        enderecoBruto = enderecoBruto.replace(matchRef[0], ""); 
    }

    enderecoBruto = enderecoBruto.replace(/,\s*$/, "").replace(/[ \t]+/g, " ").trim();

    var enderecoPedido = (pedido.endereco || "").toString().trim().toUpperCase();
    var tipoServico = enderecoPedido.startsWith("RETIRADA") ? "RETIRADA" : "ENTREGA";
    if (tipoServico === "ENTREGA") {
        var matchBairro = enderecoBruto.match(/Bairro:\s*([^(\r\n]+?)(?:\s*\(|$)/i);
        if (matchBairro) {
            var nomeBairro = matchBairro[1].replace(/\s+-\s+R\$\s*\d+(?:[.,]\d{2})?\s*$/i, "").trim();
            enderecoBruto = enderecoBruto.replace(matchBairro[0], "Bairro: " + nomeBairro);
        }
    }
    var pagamentoFinal = (pedido.formaPagamento || "Não informado").toUpperCase();
    
    var dataAgora = new Date();
    var dataFinal = dataAgora.toLocaleDateString("pt-BR");
    var horaFinal = dataAgora.toLocaleTimeString("pt-BR", {hour: "2-digit", minute:"2-digit"});

    var containerPrincipal = janelaImpressao.document.createElement("div");

    var elTagServico = janelaImpressao.document.createElement("div");
    elTagServico.className = "tag-tipo-entrega";
    elTagServico.textContent = tipoServico;
    containerPrincipal.appendChild(elTagServico);

    var elCabecalho = janelaImpressao.document.createElement("div");
    elCabecalho.className = "text-center";
    elCabecalho.innerHTML = "<div class='titulo-loja'>🌵 SABOR CEARENSE 🌵</div><div class='subtitulo-loja'>Comida Caseira Legítima</div><div class='divider-dashed'></div><div class='subtitulo-loja'>Não vale como nota fiscal</div><div class='id-pedido'>PEDIDO #" + numeroExibicaoPedido(pedido) + "</div><div class='subtitulo-loja'>Data: " + dataFinal + " - Hora: " + horaFinal + "</div>";
    containerPrincipal.appendChild(elCabecalho);

    if (tipoServico === "ENTREGA") {
        var elPrevisao = janelaImpressao.document.createElement("div");
        elPrevisao.className = "text-center bloco-conteudo";
        elPrevisao.textContent = "Previsão de entrega: " + formatarPrevisaoEntrega(pedido);
        containerPrincipal.appendChild(elPrevisao);
    }
    
    var divDivisora1 = janelaImpressao.document.createElement("div");
    divDivisora1.className = "divider-double";
    containerPrincipal.appendChild(divDivisora1);

    var elDadosCliente = janelaImpressao.document.createElement("div");
    elDadosCliente.className = "bloco-conteudo";
    elDadosCliente.innerHTML = "<div class='secao-titulo'>Cliente</div><div class='negrito' style='font-size: 14px;'>" + nomeClienteFinal + "</div><div>Telefone: " + telefoneFinal + "</div>";
    containerPrincipal.appendChild(elDadosCliente);
    
    var divDivisora2 = janelaImpressao.document.createElement("div");
    divDivisora2.className = "divider-dashed";
    containerPrincipal.appendChild(divDivisora2);

    var elEnderecoBloco = janelaImpressao.document.createElement("div");
    elEnderecoBloco.className = "bloco-conteudo";
    var tituloEndereco = tipoServico === "RETIRADA" ? "Local de Retirada" : "Endereço de Entrega";
    var linhasEndereco = tipoServico === "RETIRADA" ? [enderecoBruto] : enderecoBruto.split(/,|\r?\n/).map(linha => linha.trim()).filter(Boolean);
    elEnderecoBloco.innerHTML = "<div class='secao-titulo'>" + tituloEndereco + "</div>" + linhasEndereco.map(linha => "<div>" + escaparHtml(linha) + "</div>").join("") + (tipoServico === "RETIRADA" ? "" : "<div style='margin-top: 4px;'><span class='negrito'>Referência:</span> " + escaparHtml(referenciaFinal) + "</div>");
    containerPrincipal.appendChild(elEnderecoBloco);
    
    var divDivisora3 = janelaImpressao.document.createElement("div");
    divDivisora3.className = "divider-double";
    containerPrincipal.appendChild(divDivisora3);
    // 5. Itens do Pedido
    var elItensTitulo = janelaImpressao.document.createElement("div");
    elItensTitulo.className = "secao-titulo";
    elItensTitulo.textContent = "Itens do Pedido";
    containerPrincipal.appendChild(elItensTitulo);

    var tabelaItens = janelaImpressao.document.createElement("table");
    tabelaItens.className = "tabela-itens";
    tabelaItens.innerHTML = "<thead><tr><th class='col-qtd'>QTD</th><th class='col-nome'>ITEM</th><th class='col-preco'>VALOR</th></tr></thead><tbody></tbody>";
    var corpoTabelaItens = tabelaItens.querySelector("tbody");
    
    var totalProdutosCalculado = 0;
    var listaItensImpressao = [];

    // Os itens ficam persistidos no pedido; o localStorage pertence ao navegador do cliente.
    if (pedido.itens) {
        try {
            var itensDecodificados = typeof pedido.itens === "string"
                ? JSON.parse(pedido.itens)
                : pedido.itens;
            if (Array.isArray(itensDecodificados)) {
                listaItensImpressao = itensDecodificados;
            } else if (itensDecodificados && typeof itensDecodificados === 'object' && 'nome' in itensDecodificados) {
                listaItensImpressao = [itensDecodificados];
            } else if (itensDecodificados && typeof itensDecodificados === 'object') {
                listaItensImpressao = Object.values(itensDecodificados);
            }
        } catch(e) {
            console.error("Erro ao ler dados para a impressão:", e);
        }
    }

    if (listaItensImpressao && listaItensImpressao.length > 0) {
        var ordemImpressao = function(item) {
            var categoria = String(item.categoria || "").trim().toUpperCase();
            if (categoria === "BEBIDA" || categoria === "BEBIDAS") return 1;
            if (categoria === "SOBREMESA" || categoria === "SOBREMESAS") return 2;
            return 0;
        };
        var itensOrdenadosParaImpressao = listaItensImpressao
            .map(function(item, indice) {
                return { item: item, indice: indice, ordem: ordemImpressao(item) };
            })
            .sort(function(a, b) {
                return a.ordem - b.ordem || a.indice - b.indice;
            })
            .map(function(entrada) {
                return entrada.item;
            });

        itensOrdenadosParaImpressao.forEach(function(item) {
            var tr = janelaImpressao.document.createElement("tr");
            
            var nomeTexto = item.nome ? item.nome.toString().toUpperCase() : "PRATO";
            var qtdTexto = item.quantidade || item.qtd || 1;
            var precoItem = obterPrecoItem(item);
            var subtotalItem = qtdTexto * precoItem;
            
            totalProdutosCalculado += subtotalItem;

            tr.innerHTML = "<td class='col-qtd'>" + qtdTexto + "x</td><td class='col-nome'>" + nomeTexto + "</td><td class='col-preco'>R$ " + subtotalItem.toFixed(2).replace(".", ",") + "</td>";
            corpoTabelaItens.appendChild(tr);
        });
        containerPrincipal.appendChild(tabelaItens);
    } else {
        var elFallback = janelaImpressao.document.createElement("div");
        elFallback.style.padding = "5px 0";
        elFallback.className = "negrito";
        elFallback.textContent = "Nenhum prato listado na descrição deste pedido.";
        containerPrincipal.appendChild(elFallback);
    }

    if (pedido.observacao && pedido.observacao.trim()) {
        var elObservacao = janelaImpressao.document.createElement("div");
        elObservacao.className = "bloco-obs";
        elObservacao.textContent = "OBSERVAÇÃO DO PEDIDO: " + pedido.observacao.trim();
        containerPrincipal.appendChild(elObservacao);
    }

    var divDivisora4 = janelaImpressao.document.createElement("div");
    divDivisora4.className = "divider-dashed";
    containerPrincipal.appendChild(divDivisora4);

    // 6. Fechamento Financeiro
    var valorPedido = Number(pedido.valorTotal ?? pedido.total ?? 0);
    var subtotalExibir = totalProdutosCalculado > 0 ? totalProdutosCalculado : valorPedido;
    
    // Captura dinamicamente o valor da taxa do bairro selecionado no formulário
    var selectBairro = document.getElementById("bairro-entrega");
    var taxaEntrega = 0;
    if (selectBairro && selectBairro.value) {
        var partesBairro = selectBairro.value.split("|");
        if (partesBairro.length > 1) {
            taxaEntrega = parseFloat(partesBairro[1]) || 0;
        }
    }
    var totalPedido = Number(pedido.valorTotal);
    var totalGeralExibir = totalPedido > 0 ? totalPedido : subtotalExibir + taxaEntrega;
    if (totalGeralExibir >= subtotalExibir) {
        taxaEntrega = totalGeralExibir - subtotalExibir;
    }

    var elFinanceiro = janelaImpressao.document.createElement("div");
    elFinanceiro.className = "bloco-conteudo";
    elFinanceiro.innerHTML = `
        <div class='linha-financeiro'><span>Subtotal</span><span>R$ ${subtotalExibir.toFixed(2).replace(".", ",")}</span></div>
        <div class='linha-financeiro'><span>Taxa de Entrega</span><span>R$ ${taxaEntrega.toFixed(2).replace(".", ",")}</span></div>
        <div class='linha-financeiro'><span class='negrito'>Forma Pagto.</span><span>${pagamentoFinal}</span></div>
        ${pedido.trocoPara != null ? `<div class='bloco-obs'>${textoTrocoPedido(pedido)}</div>` : ""}
        <div class='linha-total'><span>TOTAL</span><span>R$ ${totalGeralExibir.toFixed(2).replace(".", ",")}</span></div>
    `;
    containerPrincipal.appendChild(elFinanceiro);

    var divDivisora5 = janelaImpressao.document.createElement("div");
    divDivisora5.className = "divider-dashed";
    containerPrincipal.appendChild(divDivisora5);

    // 8. Mensagem de Rodapé
    var elRodape = janelaImpressao.document.createElement("div");
    elRodape.className = "text-center negrito";
    elRodape.style.marginTop = "10px";
    elRodape.innerHTML = "* COMPROVANTE DE PRODUÇÃO *<br>Agradecemos a preferência!";
    containerPrincipal.appendChild(elRodape);

    // Renderiza tudo na janela aberta e executa a impressão
    janelaImpressao.document.body.appendChild(containerPrincipal);
    
    setTimeout(function() {
        janelaImpressao.print();
    }, 250);
}
