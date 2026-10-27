 const URL_BACKEND = "https://saborcearense-5.onrender.com";
        let carrinho = {}
        let dadosSacola = carrinho; 
        let estabelecimentoAberto = true;
        let rastreioTimerAutomatizado = null;

        document.addEventListener("DOMContentLoaded", () => {
            carregarCardapio();
            verificarHorarioFuncionamento();
        });
        const DIAS_SEMANA = ["DOMINGO", "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO"];
        async function carregarCardapio() {
            try {
                const res = await fetch(URL_BACKEND + "/api/cardapio");
                if (!res.ok) throw new Error(`Servidor respondeu com status ${res.status}`);
                const itens = await res.json();
                
                if (!Array.isArray(itens)) return;
                
                // 1. DICIONÁRIO PADRONIZADO DE IMAGENS RESIDENCIAIS
                const IMAGENS_COMPLETAS_SABOR = {
                    "frangocomquiabo": "https://unsplash.com",
                    "carneassada": "https://unsplash.com",
                    "costelacombatata": "https://unsplash.com",
                    "frangoassado": "https://unsplash.com",
                    "dobradinha": "https://unsplash.com",
                    "pernilassado": "https://unsplash.com",
                    "frangogrelhado": "https://unsplash.com",
                    "bifeacebolado": "https://unsplash.com",
                    "tilapiacombaiao": "https://unsplash.com",
                    "omelete": "https://unsplash.com",
                    "cocacomum": "https://unsplash.com",
                    "cocazero": "https://unsplash.com",
                    "guaranacomum": "https://unsplash.com",
                    "sucolaranjacopo": "https://unsplash.com",
                    "sucolimaocopo": "https://unsplash.com"
                };

                const secoesMap = {
                    "PRATOS_DO_DIA": "", "FRANGO": "", "CARNE": "", "OUTROS": "", "SOBREMESA": "", "BEBIDA": ""
                };

                const diaAtual = DIAS_SEMANA[new Date().getDay()];
                itens
                .filter(item => item.categoria?.toUpperCase() !== "PRATOS_DO_DIA" || item.diaSemana === diaAtual)
                .forEach(item => {
                    const esgotado = !item.disponivel;
                    
                    const nomeNormalizado = item.nome
                        .toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
                        .replace(/\s+/g, "") 
                        .replace("c/", "com"); 
                    
                    let fotoFinal = item.imagemUrl;
                    if (!fotoFinal || fotoFinal === "" || fotoFinal.includes("://unsplash.com") || fotoFinal === "https://unsplash.com") {
                        fotoFinal = IMAGENS_COMPLETAS_SABOR[nomeNormalizado] || "https://unsplash.com";
                    }
                    
                    let controleHtml = `
                        <div class="seletor-quantidade">
                            <button class="btn-qtd" onclick="mudarQuantidade(${item.id}, -1, '${item.nome}', ${item.preco})">-</button>
                            <span class="qtd-numero" id="qtd-${item.id}">0</span>
                            <button class="btn-qtd" onclick="mudarQuantidade(${item.id}, 1, '${item.nome}', ${item.preco})">+</button>
                        </div>
                    `;

                    if (esgotado) {
                        controleHtml = `<span class="badge-esgotado">Esgotado</span>`;
                    }

                    const itemHtml = `
                        <div id="item-${item.id}" class="menu-item ${esgotado ? 'item-esgotado' : ''}">
                            <div style="display: flex; gap: 12px; align-items: center; flex: 1;">
                                <div class="foto-produto-container">
                                    <img src="${fotoFinal}" alt="${item.nome}" loading="lazy" onerror="this.onerror=null; this.src='https://unsplash.com';">
                                </div>
                                <div class="item-info">
                                    <h4>${item.nome}</h4>
                                    <span class="preco">R$ ${Number(item.preco).toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
                            <div class="controles">${controleHtml}</div>
                        </div>
                    `;

                    const cat = item.categoria ? item.categoria.toUpperCase() : "PRATOS_DO_DIA";
                    if (secoesMap[cat] !== undefined) {
                        secoesMap[cat] += itemHtml;
                    } else {
                        secoesMap["PRATOS_DO_DIA"] += itemHtml;
                    }
                });

                Object.keys(secoesMap).forEach(categoria => {
                    const el = document.getElementById("section-" + categoria);
                    if (el) el.innerHTML = secoesMap[categoria];
                });

                if (!estabelecimentoAberto) aplicarBloqueioInterfaceFechado();

            } catch(e) { 
                console.error("Erro ao carregar cardápio:", e); 
            }
        }
        

        function alternarAba(nomeAba) {
            if (nomeAba !== 'RASTREIO' && rastreioTimerAutomatizado) {
                clearInterval(rastreioTimerAutomatizado);
                rastreioTimerAutomatizado = null;
                console.log("Sabor Cearense: Cliente mudou de aba. Monitoramento pausado.");
            }

            const todasAbas = ['PRATOS_DO_DIA', 'PRINCIPAIS', 'SOBREMESA', 'BEBIDA', 'RASTREIO'];
            todasAbas.forEach(aba => {
                const elementoAba = document.getElementById('aba-' + aba);
                if (elementoAba) elementoAba.style.display = 'none';
            });
            
            const abaAtiva = document.getElementById('aba-' + nomeAba);
            if (abaAtiva) abaAtiva.style.display = 'block';
            
            document.querySelectorAll('.btn-aba').forEach(btn => {
                btn.classList.remove('ativo');
            });
            if (typeof event !== "undefined" && event.currentTarget) {
                event.currentTarget.classList.add('ativo');
            }

            const barraFlutuante = document.getElementById("barra-flutuante");
            if(barraFlutuante) {
                barraFlutuante.style.display = (nomeAba === 'RASTREIO') ? 'none' : 'flex';
            }
        }

        function abrirAbaRastreioOculta() {
            alternarAba('RASTREIO');
            const input = document.getElementById("input-rastreio-index");
            if (input) {
                window.setTimeout(() => input.focus(), 100);
            }
            const btnRastreio = document.getElementById("btn-rodape-rastreio");
            if (btnRastreio) {
                btnRastreio.innerHTML = "📋 Voltar ao Cardápio";
                btnRastreio.setAttribute("onclick", "restaurarCardapioOriginal()");
                btnRastreio.style.background = "#fff3cd";
                btnRastreio.style.borderColor = "#f5a623";
            }
        }

        function restaurarCardapioOriginal() {
            if (typeof desativarTemporizadorEInterface === "function") {
                desativarTemporizadorEInterface();
            }

            const btnRastreio = document.getElementById("btn-rodape-rastreio");
            if (btnRastreio) {
                btnRastreio.innerHTML = "🔍 Rastrear Pedido";
                btnRastreio.setAttribute("onclick", "abrirAbaRastreioOculta()");
                btnRastreio.style.background = "#f1f5f9";
                btnRastreio.style.borderColor = "#cbd5e1";
            }
            alternarAba('PRATOS_DO_DIA');
        }

        function desativarTemporizadorEInterface() {
            if (rastreioTimerAutomatizado) {
                clearInterval(rastreioTimerAutomatizado);
                rastreioTimerAutomatizado = null;
            }
            ["RECEBIDO", "PREPARO", "ENTREGA"].forEach(st => {
                const el = document.getElementById("p-" + st);
                if(el) el.classList.remove("concluido", "atual");
            });
        }

        // 🌵 FORÇA O VÍNCULO GLOBAL COM O HTML PARA ELIMINAR O ERRO "NOT DEFINED"

        function abrirSacola() {
    document.getElementById('painel-sacola-modal').classList.add('open');
    renderizarItensSacola(); // <-- Essa linha garante a atualização imediata da descrição
}

        function fecharSacola() {
            document.getElementById('painel-sacola-modal').classList.remove('open');
        }

        function renderizarItensSacola() {
    const containerLista = document.getElementById('lista-produtos-sacola');
    if (!containerLista) return;
    
    containerLista.innerHTML = '';
    
    // Obtém os dados atualizados diretamente do objeto de controle ou do LocalStorage
    const carrinhoAtual = carrinho && Object.keys(carrinho).length > 0 
        ? carrinho 
        : JSON.parse(localStorage.getItem("carrinhoSaborCearense")) || {};
        
    const itens = Object.entries(carrinhoAtual);

    if (itens.length === 0) {
        containerLista.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">Sua sacola está vazia.</p>`;
        atualizarPrecosBarraFlutuante();
        return;
    }

    itens.forEach(([chaveId, item]) => {
        // Separa o ID estável original para os seletores visuais do cardápio
        const idBaseOriginal = String(chaveId).split("-")[0];
        const nomePratoExibir = item.nome || "Prato";
        const precoItem = item.preco || 0;
        const qtdItem = item.quantidade || 0;
        
        containerLista.innerHTML += `
            <div class="item-sacola-linha" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                <div style="flex: 1; padding-right: 10px; text-align: left;">
                    <div style="font-weight: 600; font-size:14px; color: #1e293b; line-height: 1.3;">${nomePratoExibir}</div>
                    <div style="font-size: 13px; color: #27ae60; font-weight: 700; margin-top: 2px;">R$ ${(precoItem * qtdItem).toFixed(2).replace('.', ',')}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button onclick="executarMudarQuantidadeReal('${chaveId}', -1, '${nomePratoExibir}', ${precoItem}, '${idBaseOriginal}');" style="padding:2px 8px; font-weight:bold; cursor:pointer;">-</button>
                    <span style="font-weight:bold; min-width: 15px; text-align:center;">${qtdItem}</span>
                    <button onclick="executarMudarQuantidadeReal('${chaveId}', 1, '${nomePratoExibir}', ${precoItem}, '${idBaseOriginal}');" style="padding:2px 8px; font-weight:bold; cursor:pointer;">+</button>
                </div>
            </div>
        `;
    });

    atualizarPrecosBarraFlutuante();
}

        function executarBuscaRastreio() {
            const input = document.getElementById('input-rastreio-index');
            if (!input) return;
            const pedidoId = input.value.trim().replace(/^#/, '');
            if (!pedidoId) {
                alert('Por favor, digite o número do pedido.');
                return;
            }
            if (!/^\d+$/.test(pedidoId)) {
                alert('Digite apenas o número do pedido.');
                input.focus();
                return;
            }
            window.location.href = `acompanhar.html?id=${encodeURIComponent(pedidoId)}`;
        }

        function verificarHorarioFuncionamento() {
            const agora = new Date();
            const diaSemana = agora.getDay(); 
            const hora = agora.getHours();
            const minuto = agora.getMinutes();
            
            const minutosAtuais = (hora * 60) + minuto;
            const aberturaMinutos = (11 * 60) + 30; 
            const fechamentoMinutos = (15 * 60) + 0;  

            const statusLoja = document.getElementById("status-loja");
            const isAdmin = Boolean(localStorage.getItem("adminToken"));

            if (diaSemana === 0 || minutosAtuais < aberturaMinutos || minutosAtuais > fechamentoMinutos) {
                if (isAdmin) {
                    estabelecimentoAberto = true;
                    if(statusLoja) statusLoja.innerHTML = `<span class="status-dot status-aberto"></span> ABERTO AGORA <small style="color: #f5a623; margin-left: 5px; font-weight: bold;">(Modo Admin Ativo)</small>`;
                    return;
                }
                estabelecimentoAberto = false;
                if(statusLoja) statusLoja.innerHTML = `<span class="status-dot status-fechado"></span> FECHADO NO MOMENTO`;
                aplicarBloqueioInterfaceFechado();
            } else {
                estabelecimentoAberto = true;
                if(statusLoja) statusLoja.innerHTML = `<span class="status-dot status-aberto"></span> ABERTO AGORA`;
            }
        }

        function aplicarBloqueioInterfaceFechado() {
            document.querySelectorAll(".btn-qtd").forEach(btn => {
                btn.disabled = true;
                btn.style.cursor = "not-allowed";
                btn.style.opacity = "0.3";
            });
            const btnAvancar = document.getElementById("botao-avancar-checkout");
            if(btnAvancar) {
                btnAvancar.disabled = true;
                btnAvancar.style.setProperty("background-color", "#94a3b8", "important");
                btnAvancar.style.setProperty("color", "#ffffff", "important");
                btnAvancar.style.cursor = "not-allowed";
                btnAvancar.innerText = "Fechado no Momento 🔒";
            }
        }
        
    function irParaCheckout() {
    if (Object.keys(carrinho).length === 0) {
        alert("Adicione pelo menos um item à sacola!");
        return;
    }
    // Codifica o carrinho atual e redireciona para a página de checkout
    const dadosCarrinho = encodeURIComponent(JSON.stringify(carrinho));
    window.location.href = `carrinho.html?carrinho=${dadosCarrinho}`;
}

    // =========================================================================
// 🌵 SISTEMA INTEGRADO DE ACOMPANHAMENTOS - SABOR CEARENSE (CORRIGIDO)
// =========================================================================

// =========================================================================
// 🌵 SISTEMA INTEGRADO DE ACOMPANHAMENTOS - SABOR CEARENSE (DEFINITIVO)
// =========================================================================

// LIMPEZA DE SEGURANÇA: Limpa dados antigos/corrompidos do localStorage ao carregar a página
// LIMPEZA DE SEGURANÇA: Limpa dados antigos/corrompidos do localStorage ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    // Se houver lixo de versões anteriores que travavam o script, removemos
    if (localStorage.getItem("carrinho") && !localStorage.getItem("carrinhoSaborCearense")) {
        localStorage.removeItem("carrinho");
        localStorage.removeItem("cart");
    }
});         

/// Substitua o bloco de código a partir da linha 311 por isto:
carrinho = JSON.parse(localStorage.getItem("carrinhoSaborCearense")) || {};

// Função disparada pelos botões (+) do cardápio principal
function mudarQuantidade(id, valor, nome, preco) {
    if (valor < 0) {
        executarMudarQuantidadeReal(id, valor, nome, preco);
        return;
    }

    // Pula o modal para acompanhamentos óbvios como bebidas e sobremesas
    const nomeMinusculo = nome.toLowerCase();
    const termosPular = ["coca", "suco", "guarana", "fanta", "agua", "bebida", "pudim", "doce", "sobremesa", "cerveja"];
    if (termosPular.some(termo => nomeMinusculo.includes(termo))) {
        executarMudarQuantidadeReal(id, valor, nome, preco);
        return;
    }

    // Criar caixa de diálogo do modal de acompanhamento do zero
    const modalAcomp = document.createElement("div");
    modalAcomp.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 999999; font-family: sans-serif; padding: 15px; box-sizing: border-box;";
    
    modalAcomp.innerHTML = `
        <div style="background: #fff; padding: 20px; border-radius: 12px; max-width: 360px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            <h3 style="margin-top: 0; color: #141414; font-size: 1.1rem; border-bottom: 2px solid #e76f51; padding-bottom: 8px; font-weight: bold;">🌵 Acompanhamentos</h3>
            <p style="font-size: 0.9rem; color: #555; margin-bottom: 15px;">Escolha até 2 opções para o seu <strong>${nome}</strong>:</p>
            <div id="lista-opcoes-acomp" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;"><input type="checkbox" value="Maionese" style="width: 18px; height: 18px;"> Maionese</label>
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;"><input type="checkbox" value="Macarronese" style="width: 18px; height: 18px;"> Macarronese</label>
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;"><input type="checkbox" value="Salada de Legumes" style="width: 18px; height: 18px;"> Salada de Legumes</label>
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;"><input type="checkbox" value="Purê" style="width: 18px; height: 18px;"> Purê</label>
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;"><input type="checkbox" value="Espaguete" style="width: 18px; height: 18px;"> Espaguete</label>
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;"><input type="checkbox" value="Fritas" style="width: 18px; height: 18px;"> Fritas</label>
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="btn-cancelar-acomp" style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; font-weight: bold; cursor: pointer;">Cancelar</button>
                <button id="btn-confirmar-acomp" style="flex: 1; padding: 10px; border: none; background: #22c55e; color: #fff; border-radius: 6px; font-weight: bold; cursor: pointer;">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalAcomp);

    const checkboxes = modalAcomp.querySelectorAll("#lista-opcoes-acomp input");
    checkboxes.forEach(cb => {
        cb.addEventListener("change", () => {
            if (modalAcomp.querySelectorAll("#lista-opcoes-acomp input:checked").length > 2) {
                cb.checked = false;
                alert("⚠️ Escolha no máximo 2 acompanhamentos!");
            }
        });
    });

    modalAcomp.querySelector("#btn-cancelar-acomp").onclick = () => modalAcomp.remove();
    modalAcomp.querySelector("#btn-confirmar-acomp").onclick = () => {
        const marcados = [];
        modalAcomp.querySelectorAll("#lista-opcoes-acomp input:checked").forEach(cb => marcados.push(cb.value));
        
        let nomeFinal = nome;
        if (marcados.length > 0) nomeFinal += " (" + marcados.join(", ") + ")";

        const sufixoId = marcados.map(m => m.substring(0,3).toLowerCase()).join("-");
        const idChaveUnica = sufixoId ? `${id}-${sufixoId}` : id;

        modalAcomp.remove();
        executarMudarQuantidadeReal(idChaveUnica, valor, nomeFinal, preco, id);
    };
}

// Persistência interna do carrinho de compras
function ejecutarMudarQuantidadeReal(idChave, valor, nome, preco, idOriginal) {
    const idContadorVisual = idOriginal || idChave;

    if (!carrinho[idChave]) {
        if (valor <= 0) return;
        carrinho[idChave] = { id: idChave, nome: nome, preco: parseFloat(preco), quantidade: 0 };
    }

    carrinho[idChave].quantidade += valor;
    if (carrinho[idChave].quantidade <= 0) delete carrinho[idChave];

    // Sincroniza o contador numérico individual do cardápio principal
    const elQtd = document.getElementById(`qtd-${idContadorVisual}`);
    if (elQtd) {
        let totalDestePrato = 0;
        Object.values(carrinho).forEach(item => {
            if (item.id == idContadorVisual || String(item.id).startsWith(idContadorVisual + "-")) {
                totalDestePrato += item.quantidade;
            }
        });
        elQtd.innerText = totalDestePrato;
    }

    localStorage.setItem("carrinhoSaborCearense", JSON.stringify(carrinho));
    atualizarValoresBarraFixo();
    renderizarItensSacola();
}
// =========================================================================
// 🌵 SISTEMA GERAL DE CONTROLE DE SACOLA - PARTE 2 (FINAL)
// =========================================================================

// Injeção limpa da descrição e dos itens na sacola
function renderizarItensSacola() {
    const container = document.getElementById('lista-produtos-sacola');
    if (!container) return;

    container.innerHTML = '';
    const itens = Object.entries(carrinho);

    if (itens.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px;">Sua sacola está vazia.</p>`;
        return;
    }

    itens.forEach(([chaveId, item]) => {
        const idBaseOriginal = String(chaveId).split("-");
        
        container.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f1f5f9;">
                <div style="flex: 1; padding-right: 12px; text-align: left;">
                    <div style="font-weight: 600; font-size: 14px; color: #1e293b; line-height: 1.3;">${item.nome}</div>
                    <div style="font-size: 13px; color: #27ae60; font-weight: 700; margin-top: 2px;">R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button onclick="executarMudarQuantidadeReal('${chaveId}', -1, '${item.nome}', ${item.preco}, '${idBaseOriginal}')" style="padding: 2px 8px; font-weight: bold; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px;">-</button>
                    <span style="font-weight: bold; min-width: 15px; text-align: center;">${item.quantidade}</span>
                    <button onclick="executarMudarQuantidadeReal('${chaveId}', 1, '${item.nome}', ${item.preco}, '${idBaseOriginal}')" style="padding: 2px 8px; font-weight: bold; cursor: pointer; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px;">+</button>
                </div>
            </div>
        `;
    });
}

// Atualização de preços em lote na barra flutuante inferior
function atualizarValoresBarraFixo() {
    const arrayItens = Object.values(carrinho);
    let totalQtd = 0;
    let totalPreco = 0;

    arrayItens.forEach(item => {
        totalQtd += item.quantidade;
        totalPreco += (item.preco * item.quantidade);
    });

    const elQtdItens = document.getElementById("txt-qtd-itens");
    if (elQtdItens) elQtdItens.innerText = `${totalQtd} itens`;

    const elValorTotal = document.getElementById("txt-valor-total");
    if (elValorTotal) elValorTotal.innerText = `R$ ${totalPreco.toFixed(2).replace('.', ',')}`;

    const elModalSubtotal = document.getElementById("txt-modal-subtotal");
    if (elModalSubtotal) elModalSubtotal.innerText = `R$ ${totalPreco.toFixed(2).replace('.', ',')}`;
}

// Lógica inteligente de abertura responsiva (Computador vs Celular)
function abrirSacola() {
    const modal = document.getElementById('painel-sacola-modal');
    const gaveta = document.getElementById('conteudo-gaveta-sacola');
    if (!modal || !gaveta) return;

    modal.classList.add("open");

    renderizarItensSacola();

    // 🌵 ORGANIZAÇÃO RESPONSIVA DO LAYOUT (PC vs CELULAR)
    if (window.innerWidth > 768) {
        // Alinhamento centralizado perfeito para Computadores (Formato Caixa Central)
        gaveta.style.position = "fixed";
        gaveta.style.top = "50%";
        gaveta.style.left = "50%";
        gaveta.style.transform = "translate(-50%, -50%)";
        gaveta.style.width = "100%";
        gaveta.style.maxWidth = "450px";
        gaveta.style.height = "auto";
        gaveta.style.maxHeight = "85vh";
        gaveta.style.borderRadius = "16px";
        gaveta.style.bottom = "auto";
    } else {
        // Alinhamento fluido de baixo para cima para Celulares (Formato Gaveta App)
        gaveta.style.position = "absolute";
        gaveta.style.width = "100%";
        gaveta.style.maxHeight = "75vh";
        gaveta.style.bottom = "0";
        gaveta.style.left = "0";
        gaveta.style.top = "auto";
        gaveta.style.transform = "none";
        gaveta.style.borderRadius = "20px 20px 0 0";
    }
}

function fecharSacola() {
    const modal = document.getElementById('painel-sacola-modal');
    if (modal) modal.classList.remove("open");
}

function irParaCheckout() {
    const listaItens = Object.values(carrinho);
    if (listaItens.length === 0) {
        alert("Sua sacola está vazia! Escolha um prato do cardápio.");
        return;
    }
    window.location.href = `carrinho.html?carrinho=${encodeURIComponent(JSON.stringify(listaItens))}`;
}

document.addEventListener("DOMContentLoaded", () => {
    atualizarValoresBarraFixo();
});
