// ==========================================
// 🌵 CONFIGURAÇÕES E ESTADOS GLOBAIS
// ==========================================
const URL_BACKEND = "https://onrender.com";
const URL_API_ADMIN = URL_BACKEND + "/api/admin/pratos";
const URL_BACKEND_WS = (window.location.protocol === "https:" ? "wss://" : "ws://") + window.location.host;

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
let audioCtxCompartilhado = null;

// ==========================================
// 🔐 FLUXO DE AUTENTICAÇÃO SEGURO
// ==========================================
function autenticarAdmin() {
    const campoUsuario = document.getElementById("usuario-login");
    const campoSenha = document.getElementById("senha-login");

    if (!campoUsuario || !campoSenha) {
        console.error("Campos de login nao encontrados.");
        return;
    }

    const u = campoUsuario.value.trim();
    const s = campoSenha.value.trim();
    
    if (u === "admin" && s === "sabor123") {
        localStorage.setItem("adminAutenticado", "true");
        document.getElementById("container-login-view").style.display = "none";
        document.getElementById("painel-adm-wrapper").style.display = "flex";
        
        if (typeof carregarItensAdmin === "function") carregarItensAdmin();
        if (typeof inicializarControlePedidos === "function") inicializarControlePedidos();
        if (typeof configurarFormularioCadastro === "function") configurarFormularioCadastro();
        if (typeof exibirBannerAtivacaoAudio === "function") exibirBannerAtivacaoAudio();
    } else {
        alert("Usuario ou senha incorretos!");
    }
}

window.addEventListener('DOMContentLoaded', function() {
    const botaoLogin = document.getElementById("btn-submeter-login");
    if (botaoLogin) {
        botaoLogin.addEventListener('click', autenticarAdmin);
    }
});

function alternarAbasAdmin(abaAlvo) {
    document.querySelectorAll('.nav-link').forEach(function(link) { link.classList.remove('active'); });
    document.querySelectorAll('.section-view').forEach(function(view) { view.classList.remove('active'); });
    
    document.getElementById("tab-" + abaAlvo).classList.add('active');
    document.getElementById("sec-" + abaAlvo).classList.add('active');
    
    if (abaAlvo === 'ativos' || abaAlvo === 'historico') {
        carregarPedidosAtivos();
    }
}

function configurarFormularioCadastro() {
    const form = document.getElementById("form-novo-prato");
    if (!form) return;
    form.onsubmit = async function(e) {
        e.preventDefault();
        const nome = document.getElementById("nome").value;
        const preco = parseFloat(document.getElementById("preco").value);
        const categoria = document.getElementById("categoria").value;
        const imagemUrl = document.getElementById("imagem").value;

        try {
            const res = await fetch(URL_BACKEND + "/api/admin/pratos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome, preco, category: categoria, imagemUrl, descricao: "Item profissional.", disponivel: true })
            });
            if(res.ok) {
                form.reset();
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
        container.innerHTML = "";
        
        itens.forEach(item => {
            const div = document.createElement("div");
            const esgotado = !item.disponivel;
            div.className = `card-produto ${esgotado ? 'esgotado-style' : 'disponivel-style'}`;
            
            const nomeCategoria = dicionarioCategorias[item.categoria] || item.categoria || "Geral";

            div.innerHTML = `
                <div style="display: flex; gap: 15px; align-items: center;">
                    <img src="${item.imagemUrl || 'https://unsplash.com'}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc;">
                    <div class="info-prod">
                        <h4>${item.nome} <span class="badge-cat">${nomeCategoria}</span></h4>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.9rem; color: #4a5568;">
                            <span>Preço: R$</span>
                            <input type="number" step="0.01" value="${Number(item.preco || 0).toFixed(2)}" 
                                class="input-preco-rapido" 
                                onchange="atualizarPrecoRapido(${item.id}, this.value)">
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
    } catch(e) { container.innerHTML = `<p style="text-align: center; color: var(--danger);">Erro ao carregar o cardápio.</p>`; }
}

async function atualizarPrecoRapido(id, novoPreco) {
    const valorFormatado = parseFloat(novoPreco);
    if (isNaN(valorFormatado) || valorFormatado < 0) return;

    const pratoAntigo = listaPratosLocal.find(p => p.id === id) || {};

    try {
        const res = await fetch(`${URL_API_ADMIN}/${id}`, { 
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                id: id,
                nome: pratoAntigo.nome || "",
                descricao: pratoAntigo.descricao || "",
                categoria: pratoAntigo.categoria || "",
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
        
        const res = await fetch(`${URL_API_ADMIN}/${id}`, { 
            method: "PUT", 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                id: id,
                nome: pratoAntigo.nome || "",
                descricao: pratoAntigo.descricao || "",
                categoria: pratoAntigo.categoria || "",
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
        const res = await fetch(`${URL_API_ADMIN}/${id}`, { method: "DELETE" });
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
}

function conectarWebSocketAdmin() {
    if (socketAdmin && socketAdmin.readyState === WebSocket.OPEN) return;

    try {
        socketAdmin = new WebSocket(`${URL_BACKEND_WS}/ws-status`);
        
        socketAdmin.onopen = () => {
            console.log("Conectado ao WebSocket do Render.");
            iniciarHeartbeatAdmin();
        };

        socketAdmin.onmessage = (event) => {
            try {
                const dados = JSON.parse(event.data);
                if (dados.tipo === "PONG") return; 
            } catch(e){}
            
            carregarPedidosAtivos();
            tocarAlertaSonoro();
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
        banner.remove();
        if (typeof iniciarTurnoAdmin === "function") iniciarTurnoAdmin();
    });

    document.body.prepend(banner);
}

function inicializarAudioContext() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtxCompartilhado = new AudioContextClass();
        console.log("Contexto de áudio inicializado via clique administrativo.");
    } catch (e) {
        console.error("Falha ao inicializar o AudioContext:", e);
    }
}

function tocarAlertaSonoro() {
    if (!audioCtxCompartilhado) return;
    
    if (audioCtxCompartilhado.state === "suspended") {
        audioCtxCompartilhado.resume();
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
async function carregarPedidosAtivos() {
    if (carregandoPedidosAtivos) return;
    carregandoPedidosAtivos = true;

    const containerAtivos = document.getElementById("lista-pedidos-ativos");
    const containerHistorico = document.getElementById("lista-pedidos-finalizados");
    
    if (containerAtivos) containerAtivos.innerHTML = "";
    if (containerHistorico) containerHistorico.innerHTML = "";

    try {
        const resAtivos = await fetch(URL_BACKEND + "/api/pedidos/ativos");
        if (resAtivos.ok) {
            const pedidosAtivos = await resAtivos.json();
            let temAtivos = false;

            pedidosAtivos.forEach(pedido => {
                if (pedido.status === 'ENTREGUE') return;
                temAtivos = true;

                const card = document.createElement("div");
                card.className = "card-pedido";
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h4 style="margin: 0 0 6px 0; color: #1e293b;">📋 Pedido #${pedido.id} - Cliente: ${pedido.clienteNome || pedido.nomeCliente || 'Não informado'}</h4>
                            <small style="color: var(--text-muted); display: block; margin-bottom: 4px; font-size: 0.9rem;">📍 Endereço: ${pedido.endereco}</small>
                            <small style="color: #0f766e; font-weight: 700; font-size: 0.9rem;">💳 Forma de Pagamento: ${pedido.formaPagamento}</small>
                        </div>
                        <span class="badge-cat" style="background: #fffbeb; color: #b45309; border-color: #fde68a;">Status: ${pedido.status}</span>
                    </div>
                    <div class="acoes-pedido-bloco" style="border-top: 1px solid #f1f5f9; padding-top: 14px; display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn-status-toggle ativo" style="background: #eff6ff; color: #1e40af; border-color: #bfdbfe;" onclick="mudarStatusPedido(${pedido.id}, 'PREPARO')">👨‍🍳 Preparar</button>
                        <button class="btn-status-toggle ativo" style="background: #f0fdf4; color: #166534; border-color: #bbf7d0;" onclick="mudarStatusPedido(${pedido.id}, 'ENTREGA')">🛵 Despachar</button>
                        <button class="btn-status-toggle inativo" style="background: #f8fafc; color: #1e293b; border-color: #cbd5e1;" onclick="mudarStatusPedido(${pedido.id}, 'ENTREGUE')">✅ Finalizar</button>
                    </div>
                `;

                // Acoplagem cirúrgica e estável via DOM real para evitar vazamentos na tela de login
                const btnImprimir = document.createElement("button");
                btnImprimir.className = "btn-status-toggle ativo";
                btnImprimir.style.cssText = "background: #fff5f5; color: #c53030; border-color: #feb2b2; font-weight: bold;";
                btnImprimir.textContent = "🖨️ Imprimir Cupom";
                btnImprimir.addEventListener("click", () => {
                    imprimirCupomIFood(pedido);
                });

                card.querySelector(".acoes-pedido-bloco").prepend(btnImprimir);

                if (containerAtivos) containerAtivos.appendChild(card);
            });

            if (!temAtivos && containerAtivos) {
                containerAtivos.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 30px; background: #f8fafc; border-radius: 10px; border: 2px dashed #e2e8f0; margin: 0;">Nenhum pedido em andamento.</p>`;
            }
        }
    } catch (e) { console.log("Erro ao carregar pedidos ativos:", e); }

    try {
        const resTodos = await fetch(URL_BACKEND + "/api/pedidos");
        if (resTodos.ok) {
            const todosPedidos = await resTodos.json();
            let temFinalizados = false;

            todosPedidos.forEach(pedido => {
                if (pedido.status !== 'ENTREGUE') return;
                temFinalizados = true;

                const card = document.createElement("div");
                card.className = "card-pedido";
                card.style.borderLeft = "5px solid var(--success)";
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h4 style="margin: 0 0 6px 0; color: #1e293b;">✅ Pedido #${pedido.id} - Cliente: ${pedido.clienteNome || pedido.nomeCliente || 'Não informado'}</h4>
                            <small style="color: var(--text-muted); display: block; margin-bottom: 4px; font-size: 0.9rem;">📍 Endereço: ${pedido.endereco}</small>
                            <small style="color: #475569; font-size: 0.9rem;">💳 Pago via: ${pedido.formaPagamento}</small>
                        </div>
                        <span class="badge-cat" style="background: #e6f4ea; color: #137333; border-color: #ceead6;">Status: ENTREGUE</span>
                    </div>
                `;
                if (containerHistorico) containerHistorico.appendChild(card);
            });

            if (!temFinalizados && containerHistorico) {
                containerHistorico.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 30px; background: #f8fafc; border-radius: 10px; border: 2px dashed #e2e8f0; margin: 0;">Nenhum pedido finalizado no histórico.</p>`;
            }
        }
    } catch (e) { console.log("Erro ao carregar histórico de finalizados:", e); }

    carregandoPedidosAtivos = false;
}

async function mudarStatusPedido(id, novoStatus) {
    try {
        const res = await fetch(`${URL_BACKEND}/api/pedidos/${id}/status?status=${novoStatus}`, { method: "PUT" });
        if (res.ok) {
            carregarPedidosAtivos();
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
// ==========================================
// 🖨️ IMPRESSÃO TÉRMICA COMPLEMENTAR (ZERO VAZAMENTO)
// ==========================================
function imprimirCupomIFood(pedido) {
    var larguraJanela = 320;
    var alturaJanela = 600;
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

    // Inicialização segura do ambiente do documento sem strings textuais complexas
    janelaImpressao.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Cupom</title></head><body></body></html>");
    janelaImpressao.document.close();

    // 1. Criação e Injeção de Estilos de forma modular
    var elEstilo = janelaImpressao.document.createElement("style");
    var regrasCSS = "body { font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.4; margin: 10px; color: #000; background: #fff; }";
    regrasCSS += " .text-center { text-align: center; }";
    regrasCSS += " .divider { border-top: 1px dashed #000; margin: 8px 0; }";
    regrasCSS += " .negrito { font-weight: bold; }";
    regrasCSS += " .bloco-obs { background: #f0f0f0; padding: 6px; border-left: 3px solid #000; margin-top: 5px; white-space: pre-wrap; }";
    elEstilo.textContent = regrasCSS;
    janelaImpressao.document.head.appendChild(elEstilo);

    // 2. Resgate seguro de dados estruturados
    var nomeClienteFinal = pedido.clienteNome || pedido.nomeCliente || "Nao informado";
    var telefoneFinal = pedido.telefone || "Nao informado";
    var enderecoFinal = pedido.endereco || "Retirada no Estabelecimento";
    var pagamentoFinal = pedido.formaPagamento || "Nao informado";
    var observacaoFinal = pedido.observacao || "Nenhuma.";
    var horaFinal = new Date().toLocaleTimeString("pt-BR", {hour: "2-digit", minute:"2-digit"});

    // 3. Montagem do esqueleto utilizando nós de texto do DOM (Isola e impede vazamento de aspas)
    var containerPrincipal = janelaImpressao.document.createElement("div");

    var elCabecalho = janelaImpressao.document.createElement("div");
    elCabecalho.className = "text-center";
    var elTitulo = janelaImpressao.document.createElement("h2");
    elTitulo.style.margin = "0";
    elTitulo.style.fontSize = "16px";
    elTitulo.textContent = "SABOR & CIA";
    var elSubtitulo = janelaImpressao.document.createElement("p");
    elSubtitulo.style.fontSize = "11px";
    elSubtitulo.style.margin = "2px 0 8px 0";
    elSubtitulo.textContent = "PAINEL OPERACIONAL";
    elCabecalho.appendChild(elTitulo);
    elCabecalho.appendChild(elSubtitulo);
    containerPrincipal.appendChild(elCabecalho);

    var divLinha1 = janelaImpressao.document.createElement("div");
    divLinha1.className = "divider";
    containerPrincipal.appendChild(divLinha1);

    var elNumPedido = janelaImpressao.document.createElement("div");
    elNumPedido.className = "negrito";
    elNumPedido.style.fontSize = "14px";
    elNumPedido.textContent = "PEDIDO: #" + pedido.id;
    containerPrincipal.appendChild(elNumPedido);

    var elDataHora = janelaImpressao.document.createElement("div");
    elDataHora.innerHTML = "DATA/HORA: <span class='negrito'>" + horaFinal + "</span>";
    containerPrincipal.appendChild(elDataHora);

    var divLinha2 = janelaImpressao.document.createElement("div");
    divLinha2.className = "divider";
    containerPrincipal.appendChild(divLinha2);

    var elDadosCliente = janelaImpressao.document.createElement("div");
    elDadosCliente.innerHTML = "<div><span class='negrito'>CLIENTE:</span> " + nomeClienteFinal + "</div>" +
                               "<div><span class='negrito'>CONTATO:</span> " + telefoneFinal + "</div>";
    containerPrincipal.appendChild(elDadosCliente);

    var divLinha3 = janelaImpressao.document.createElement("div");
    divLinha3.className = "divider";
    containerPrincipal.appendChild(divLinha3);

    var elEnderecoTitulo = janelaImpressao.document.createElement("div");
    elEnderecoTitulo.className = "negrito";
    elEnderecoTitulo.textContent = "ENDERECO DE ENTREGA:";
    containerPrincipal.appendChild(elEnderecoTitulo);

    var elEnderecoValor = janelaImpressao.document.createElement("div");
    elEnderecoValor.textContent = enderecoFinal;
    containerPrincipal.appendChild(elEnderecoValor);

    var divLinha4 = janelaImpressao.document.createElement("div");
    divLinha4.className = "divider";
    containerPrincipal.appendChild(divLinha4);

    var elPagamentoTitulo = janelaImpressao.document.createElement("div");
    elPagamentoTitulo.className = "negrito";
    elPagamentoTitulo.textContent = "FORMA DE PAGAMENTO:";
    containerPrincipal.appendChild(elPagamentoTitulo);

    var elPagamentoValor = janelaImpressao.document.createElement("div");
    elPagamentoValor.textContent = pagamentoFinal;
    containerPrincipal.appendChild(elPagamentoValor);

    var divLinha5 = janelaImpressao.document.createElement("div");
    divLinha5.className = "divider";
    containerPrincipal.appendChild(divLinha5);

    var elObsTitulo = janelaImpressao.document.createElement("div");
    elObsTitulo.className = "negrito";
    elObsTitulo.textContent = "OBSERVACOES DO PEDIDO:";
    containerPrincipal.appendChild(elObsTitulo);

    var elObsBloco = janelaImpressao.document.createElement("div");
    elObsBloco.className = "bloco-obs";
    elObsBloco.textContent = observacaoFinal;
    containerPrincipal.appendChild(elObsBloco);

    var divLinha6 = janelaImpressao.document.createElement("div");
    divLinha6.className = "divider";
    containerPrincipal.appendChild(divLinha6);

    var elRodape = janelaImpressao.document.createElement("div");
    elRodape.className = "text-center";
    elRodape.style.marginTop = "25px";
    elRodape.style.fontSize = "11px";
    var elRodapeL1 = janelaImpressao.document.createElement("p");
    elRodapeL1.className = "negrito";
    elRodapeL1.textContent = "Documento auxiliar de producao.";
    var elRodapeL2 = janelaImpressao.document.createElement("p");
    elRodapeL2.textContent = "Obrigado pela preferencia!";
    elRodape.appendChild(elRodapeL1);
    elRodape.appendChild(elRodapeL2);
    containerPrincipal.appendChild(elRodape);

    // 4. Injeção segura e disparo do hardware de impressão
    janelaImpressao.document.body.appendChild(containerPrincipal);
    janelaImpressao.focus();
    
    setTimeout(function() {
        janelaImpressao.print();
        janelaImpressao.close();
    }, 300);
}
