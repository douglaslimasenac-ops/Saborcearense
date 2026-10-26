// ==========================================
// 🌵 CONFIGURAÇÕES E ESTADOS GLOBAIS
// ==========================================
const URL_BACKEND = "https://saborcearense-5.onrender.com"
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

function criarDivDivisora(janela, dupla) {
    var div = janela.document.createElement("div");
    div.className = dupla ? "divider-double" : "divider-dashed";
    return div;
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

    janelaImpressao.document.write("<!DOCTYPE html><html><head><meta charset='UTF-8'><title>iFood Cupom #" + pedido.id + "</title></head><body></body></html>");
    janelaImpressao.document.close();

    var elEstilo = janelaImpressao.document.createElement("style");
    var regrasCSS = "body { font-family: 'Courier New', Courier, monospace; font-size: 13px; line-height: 1.4; margin: 0; padding: 4px; color: #000; background: #fff; } .text-center { text-align: center; } .text-right { text-align: right; } .negrito { font-weight: bold; } .divider-dashed { border-top: 1px dashed #000; margin: 6px 0; } .divider-double { border-top: 3px double #000; margin: 8px 0; } .tag-tipo-entrega { font-size: 22px; font-weight: bold; text-align: center; border: 2px solid #000; padding: 4px; margin-bottom: 8px; letter-spacing: 1px; } .titulo-loja { font-size: 15px; margin: 0; font-weight: bold; text-transform: uppercase; } .subtitulo-loja { font-size: 11px; margin: 2px 0; } .id-pedido { font-size: 18px; font-weight: bold; margin: 4px 0; } .secao-titulo { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; } .bloco-conteudo { margin-bottom: 6px; } .tabela-itens { width: 100%; border-collapse: collapse; margin: 5px 0; } .tabela-itens td { vertical-align: top; padding: 2px 0; } .col-qtd { width: 12%; font-weight: bold; } .col-nome { width: 63%; } .col-preco { width: 25%; text-align: right; } .linha-financeiro { display: flex; justify-content: space-between; margin: 2px 0; } .linha-total { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 5px; padding-top: 4px; border-top: 1px dashed #000; } .bloco-obs { border-left: 4px solid #000; padding-left: 8px; margin: 5px 0; white-space: pre-wrap; font-size: 12px; font-weight: bold; } @media print { @page { size: 80mm auto; margin: 0; } body { padding: 5mm 4mm; } }";
    
    elEstilo.textContent = regrasCSS;
    janelaImpressao.document.head.appendChild(elEstilo);

    // Captura fiel do Nome do Cliente baseado na sua lógica do card
    var nomeClienteFinal = (pedido.clienteNome || pedido.nomeCliente || "Não informado").toUpperCase();
    var enderecoBruto = pedido.endereco || "RETIRADA NO ESTABELECIMENTO";
    var telefoneFinal = "Não informado";
    var referenciaFinal = "Não informada";
    
    // ==========================================
    // 🌵 CORREÇÃO CRÍTICA: TRATAMENTO DE STRING (Regex)
    // ==========================================
    // 1. Localiza e isola o telefone do padrão (Tel: XXXXXX)
    var matchTel = enderecoBruto.match(/\(Tel:\s*([^)]+)\)/);
    if (matchTel) {
        telefoneFinal = matchTel[1].trim();
        enderecoBruto = enderecoBruto.replace(matchTel[0], ""); 
    }

    // 2. Localiza e isola a referência do padrão (Ref: XXXXXX)
    var matchRef = enderecoBruto.match(/\(Ref:\s*([^)]+)\)/);
    if (matchRef) {
        referenciaFinal = matchRef[1].trim();
        enderecoBruto = enderecoBruto.replace(matchRef[0], ""); 
    }

    // 3. Limpeza final de resíduos de vírgulas ou espaços duplos
    enderecoBruto = enderecoBruto.replace(/,\s*$/, "").replace(/\s+/g, " ").trim();

    var tipoServico = pedido.endereco ? "ENTREGA" : "RETIRADA";
    var pagamentoFinal = (pedido.formaPagamento || "Não informado").toUpperCase();
    var observacaoFinal = pedido.observacao || "";
    var totalPedidoFinal = Number(pedido.total || pedido.valorTotal || 0);
    
    var dataAgora = new Date();
    var dataFinal = dataAgora.toLocaleDateString("pt-BR");
    var horaFinal = dataAgora.toLocaleTimeString("pt-BR", {hour: "2-digit", minute:"2-digit"});

    var containerPrincipal = janelaImpressao.document.createElement("div");
    // 1. Tag de Orientação de Fluxo
    var elTagServico = janelaImpressao.document.createElement("div");
    elTagServico.className = "tag-tipo-entrega";
    elTagServico.textContent = tipoServico;
    containerPrincipal.appendChild(elTagServico);

    // 2. Cabeçalho da Loja
    var elCabecalho = janelaImpressao.document.createElement("div");
    elCabecalho.className = "text-center";
    elCabecalho.innerHTML = "<div class='titulo-loja'>🌵 SABOR CEARENSE 🌵</div><div class='subtitulo-loja'>Comida Caseira Legítima</div><div class='divider-dashed'></div><div class='subtitulo-loja'>Não vale como nota fiscal</div><div class='id-pedido'>PEDIDO #" + pedido.id + "</div><div class='subtitulo-loja'>Data: " + dataFinal + " - Hora: " + horaFinal + "</div>";
    containerPrincipal.appendChild(elCabecalho);
    containerPrincipal.appendChild(criarDivDivisora(janelaImpressao, true));

    // 3. Bloco do Cliente (Exibe Nome, Telefone isolado e a Referência mapeada)
    var elDadosCliente = janelaImpressao.document.createElement("div");
    elDadosCliente.className = "bloco-conteudo";
    elDadosCliente.innerHTML = "<div class='secao-titulo'>Cliente</div><div class='negrito' style='font-size: 14px;'>" + nomeClienteFinal + "</div><div>Telefone: " + telefoneFinal + "</div><div>Referência: " + referenciaFinal + "</div>";
    containerPrincipal.appendChild(elDadosCliente);
    containerPrincipal.appendChild(criarDivDivisora(janelaImpressao, false));

    // 4. Bloco de Endereço Limpo sem as tags (Tel:) e (Ref:)
    var elEnderecoBloco = janelaImpressao.document.createElement("div");
    elEnderecoBloco.className = "bloco-conteudo";
    elEnderecoBloco.innerHTML = "<div class='secao-titulo'>Endereço de Entrega</div><div style='white-space: pre-wrap; font-size: 13px;'>" + enderecoBruto + "</div>";
    containerPrincipal.appendChild(elEnderecoBloco);
    containerPrincipal.appendChild(criarDivDivisora(janelaImpressao, true));

    // 5. Seção de Itens baseada em pedido.descricao ou pedido.textoPedido
    var elItensTitulo = janelaImpressao.document.createElement("div");
    elItensTitulo.className = "secao-titulo";
    elItensTitulo.textContent = "Itens do Pedido";
    containerPrincipal.appendChild(elItensTitulo);

    var tabelaItens = janelaImpressao.document.createElement("table");
    tabelaItens.className = "tabela-itens";
    
    // Captura as duas possíveis propriedades de texto corrido trafegadas pelo seu Backend Java
    var textoDosPratos = pedido.descricao || pedido.textoPedido || "";

    if (textoDosPratos.trim() !== "") {
        var linhas = textoDosPratos.split("\n");
        linhas.forEach(function(linha) {
            if (linha.trim() !== "") {
                var tr = janelaImpressao.document.createElement("tr");
                var qtdItem = "1";
                var nomeItem = linha.trim();
                
                if (linha.toLowerCase().indexOf("x") !== -1) {
                    var quebra = linha.split(/[xX]/);
                    var possivelQtd = quebra[0].trim();
                    if (possivelQtd !== "" && !isNaN(possivelQtd)) {
                        qtdItem = possivelQtd;
                        nomeItem = quebra.slice(1).join("x").trim();
                    }
                }

                tr.innerHTML = "<td class='col-qtd'>" + qtdItem + "x</td><td class='col-nome'>" + nomeItem.toUpperCase() + "</td><td class='col-preco'>--</td>";
                tabelaItens.appendChild(tr);
            }
        });
        containerPrincipal.appendChild(tabelaItens);
    } else {
        var elFallback = janelaImpressao.document.createElement("div");
        elFallback.style.padding = "5px 0";
        elFallback.className = "negrito";
        elFallback.textContent = "Nenhum prato listado na descrição deste pedido.";
        containerPrincipal.appendChild(elFallback);
    }

    containerPrincipal.appendChild(criarDivDivisora(janelaImpressao, true));

    // 6. Bloco de Fechamento Financeiro e Pagamento
    var elFinanceiro = janelaImpressao.document.createElement("div");
    elFinanceiro.className = "bloco-conteudo";
    elFinanceiro.innerHTML = `
        <div class='linha-financeiro'><span>Subtotal</span><span>R$ ${totalPedidoFinal.toFixed(2).replace('.', ',')}</span></div>
        <div class='linha-financeiro'><span>Forma Pagto.</span><span>${pagamentoFinal}</span></div>
        <div class='linha-total'><span>TOTAL</span><span>R$ ${totalPedidoFinal.toFixed(2).replace('.', ',')}</span></div>
    `;
    containerPrincipal.appendChild(elFinanceiro);

    if (observacaoFinal.trim() !== "") {
        containerPrincipal.appendChild(criarDivDivisora(janelaImpressao, false));
        var elObs = janelaImpressao.document.createElement("div");
        elObs.className = "bloco-obs";
        elObs.textContent = "OBSERVAÇÃO:\n" + observacaoFinal;
        containerPrincipal.appendChild(elObs);
    }

    // 7. Rodapé de Produção
    containerPrincipal.appendChild(criarDivDivisora(janelaImpressao, true));
    var elRodape = janelaImpressao.document.createElement("div");
    elRodape.className = "text-center negrito";
    elRodape.style.fontSize = "11px";
    elRodape.innerHTML = "* COMPROVANTE DE PRODUÇÃO *<br>Agradecemos a preferência!";
    containerPrincipal.appendChild(elRodape);

    janelaImpressao.document.body.appendChild(containerPrincipal);
    
    // Dispara o comando nativo de impressão térmica
    setTimeout(function() {
        janelaImpressao.print();
    }, 250);
}

// Função auxiliar interna do seu script para as divisórias
function criarDivDivisora(janela, dupla) {
    var div = janela.document.createElement("div");
    div.className = dupla ? "divider-double" : "divider-dashed";
    return div;
}
