 const URL_BACKEND = "https://saborcearense-5.onrender.com";
        let carrinho = {};
        let dadosSacola = carrinho; 
        let estabelecimentoAberto = true;
        let rastreioTimerAutomatizado = null;

        document.addEventListener("DOMContentLoaded", () => {
            carregarCardapio();
            verificarHorarioFuncionamento();
        });
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

                itens.forEach(item => {
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
            if(event && event.currentTarget) event.currentTarget.classList.add('ativo');

            const barraFlutuante = document.getElementById("barra-flutuante");
            if(barraFlutuante) {
                barraFlutuante.style.display = (nomeAba === 'RASTREIO') ? 'none' : 'flex';
            }
        }

        function abrirAbaRastreioOculta() {
            alternarAba('RASTREIO');
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

        function ejecutarBuscaRastreio() {
            const input = document.getElementById('input-rastreio-index');
            if (!input) return;
            const pedidoId = input.value.trim().replace('#', '');
            if (!pedidoId) {
                alert('Por favor, digite o número do pedido.');
                return;
            }
            window.location.href = `acompanhar.html?id=${pedidoId}`;
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
            const parametrosUrl = new URLSearchParams(window.location.search);
            const modoAdminSecreto = parametrosUrl.get("admin") === "1";
            const adminStorage = localStorage.getItem("adminAutenticado");
            const isAdmin = modoAdminSecreto || (adminStorage && adminStorage.trim() === "true");

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
    window.location.href = `checkout.html?carrinho=${dadosCarrinho}`;
}

    // =========================================================================
// 🌵 SISTEMA INTEGRADO DE ACOMPANHAMENTOS - SABOR CEARENSE (CORRIGIDO)
// =========================================================================

// =========================================================================
// 🌵 SISTEMA INTEGRADO DE ACOMPANHAMENTOS - SABOR CEARENSE (DEFINITIVO)
// =========================================================================

// LIMPEZA DE SEGURANÇA: Limpa dados antigos/corrompidos do localStorage ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    // Se houver lixo de versões anteriores que travavam o script, removemos
    if (localStorage.getItem("carrinho") && !localStorage.getItem("carrinhoSaborCearense")) {
        localStorage.removeItem("carrinho");
        localStorage.removeItem("cart");
    }
});         


function mudarQuantidade(id, valor, nome, preco) {
    if (valor < 0) {
        executarMudarQuantidadeReal(id, valor, nome, preco);
        return;
    }

    const nomeMinusculo = nome.toLowerCase();
    const termosPular = ["coca", "suco", "guarana", "fanta", "agua", "bebida", "pudim", "doce", "sobremesa", "cerveja"];
    const devePular = termosPular.some(termo => nomeMinusculo.includes(termo));

    if (devePular) {
        executarMudarQuantidadeReal(id, valor, nome, preco);
        return;
    }

    const modal = document.createElement("div");
    modal.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 99999; font-family: sans-serif; padding: 15px; box-sizing: border-box;";
    
    modal.innerHTML = `
        <div style="background: #fff; padding: 20px; border-radius: 12px; max-width: 360px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            <h3 style="margin-top: 0; color: #141414; font-size: 1.1rem; border-bottom: 2px solid #e76f51; padding-bottom: 8px; font-weight: bold;">🌵 Acompanhamentos do Prato</h3>
            <p style="font-size: 0.9rem; color: #555; margin-bottom: 15px;">Escolha até 2 opções para o seu <strong>${nome}</strong>:</p>
            
            <div id="lista-opcoes-acomp" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 500; font-size: 0.95rem; color: #141414;"><input type="checkbox" value="Maionese" style="width: 18px; height: 18px;"> Maionese</label>
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 500; font-size: 0.95rem; color: #141414;"><input type="checkbox" value="Macarronese" style="width: 18px; height: 18px;"> Macarronese</label>
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 500; font-size: 0.95rem; color: #141414;"><input type="checkbox" value="Salada de Legumes" style="width: 18px; height: 18px;"> Salada de Legumes</label>
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 500; font-size: 0.95rem; color: #141414;"><input type="checkbox" value="Purê" style="width: 18px; height: 18px;"> Purê</label>
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 500; font-size: 0.95rem; color: #141414;"><input type="checkbox" value="Espaguete" style="width: 18px; height: 18px;"> Espaguete</label>
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 500; font-size: 0.95rem; color: #141414;"><input type="checkbox" value="Fritas" style="width: 18px; height: 18px;"> Fritas</label>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button id="btn-cancelar-acomp" style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px; font-weight: bold; cursor: pointer; color: #475569;">Cancelar</button>
                <button id="btn-confirmar-acomp" style="flex: 1; padding: 10px; border: none; background: #22c55e; color: #fff; border-radius: 6px; font-weight: bold; cursor: pointer;">Confirmar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    const checkboxes = modal.querySelectorAll("#lista-opcoes-acomp input");
    checkboxes.forEach(cb => {
        cb.addEventListener("change", () => {
            const marcados = modal.querySelectorAll("#lista-opcoes-acomp input:checked");
            if (marcados.length > 2) {
                cb.checked = false;
                alert("⚠️ Você pode escolher no máximo 2 acompanhamentos!");
            }
        });
    });

    modal.querySelector("#btn-cancelar-acomp").onclick = () => { modal.remove(); };

    modal.querySelector("#btn-confirmar-acomp").onclick = () => {
        const marcados = modal.querySelectorAll("#lista-opcoes-acomp input:checked");
        const acompanhamentos = [];
        marcados.forEach(cb => acompanhamentos.push(cb.value));

        let nomeItemComAcomp = nome;
        if (acompanhamentos.length > 0) {
            nomeItemComAcomp += " (" + acompanhamentos.join(", ") + ")";
        }

        const sufixo = acompanhamentos.map(a => a.substring(0,3).toLowerCase()).join("-");
        const idCombinacao = sufixo ? `${id}-${sufixo}` : id;

        modal.remove();
        executarMudarQuantidadeReal(idCombinacao, valor, nomeItemComAcomp, preco, id);
    };
}

// =========================================================================
// 🌵 SISTEMA DE RENDERIZAÇÃO BLINDADO CONTRA ERROS - SABOR CEARENSE
// =========================================================================

function executarMudarQuantidadeReal(idChave, valor, nome, preco, idOriginal) {
    const idContadorVisual = idOriginal || idChave;

    if (!carrinho[idChave]) {
        if (valor <= 0) return;
        carrinho[idChave] = {
            id: idChave,
            nome: nome,
            preco: parseFloat(preco),
            quantidade: 0
        };
    }

    carrinho[idChave].quantidade += valor;

    if (carrinho[idChave].quantidade <= 0) {
        delete carrinho[idChave];
    }

    dadosSacola = carrinho;

    // Atualiza o número "0" para "1" ao lado do prato no cardápio
    const elementoQtd = document.getElementById(`qtd-${idContadorVisual}`);
    if (elementoQtd) {
        let totalAcumulado = 0;
        Object.values(carrinho).forEach(item => {
            if (item.id == idContadorVisual || String(item.id).startsWith(idContadorVisual + "-")) {
                totalAcumulado += item.quantidade;
            }
        });
        elementoQtd.innerText = totalAcumulado;
    }

    localStorage.setItem("carrinhoSaborCearense", JSON.stringify(carrinho));
    
    // Roda as atualizações de tela protegidas contra erros
    atualizarPrecosBarraFlutuante();
    renderizarItensSacola();
}

function renderizarItensSacola() {
    const containerLista = document.getElementById('lista-produtos-sacola');
    if (!containerLista) {
        console.warn("Aviso: A div 'lista-produtos-sacola' não foi encontrada no HTML.");
        return;
    }
    
    containerLista.innerHTML = '';
    const itens = Object.entries(carrinho);

    if (itens.length === 0) {
        containerLista.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">Sua sacola está vazia.</p>`;
        return;
    }

    itens.forEach(([chaveId, item]) => {
        const idBaseOriginal = String(chaveId).split("-")[0];
        
        // Criamos o HTML usando estruturas inline simples para não quebrar com classes CSS ausentes
        const divItem = document.createElement("div");
        divItem.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left;";
        
        divItem.innerHTML = `
            <div style="flex: 1; padding-right: 10px;">
                <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${item.nome}</div>
                <div style="font-size: 13px; color: #27ae60; font-weight: 700; margin-top: 2px;">R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button onclick="executarMudarQuantidadeReal('${chaveId}', -1, '${item.nome}', ${item.preco}, '${idBaseOriginal}');" style="padding: 2px 8px; font-weight: bold; cursor: pointer;">-</button>
                <span style="font-weight: bold; min-width: 15px; text-align: center;">${item.quantidade}</span>
                <button onclick="executarMudarQuantidadeReal('${chaveId}', 1, '${item.nome}', ${item.preco}, '${idBaseOriginal}');" style="padding: 2px 8px; font-weight: bold; cursor: pointer;">+</button>
            </div>
        `;
        
        containerLista.appendChild(divItem);
    });
}

function atualizarPrecosBarraFlutuante() {
    const listaItens = Object.values(carrinho);
    let totalQtd = 0;
    let totalDinheiro = 0;

    listaItens.forEach(item => {
        totalQtd += item.quantidade;
        totalDinheiro += (item.preco * item.quantidade);
    });

    // Atualiza os elementos verificando se eles realmente existem na tela antes de aplicar o texto
    const txtItens = document.getElementById("txt-qtd-itens");
    if (txtItens) txtItens.innerText = `${totalQtd} itens`;

    const txtPreco = document.getElementById("txt-valor-total");
    if (txtPreco) txtPreco.innerText = `R$ ${totalDinheiro.toFixed(2).replace('.', ',')}`;

    const txtModalSubtotal = document.getElementById("txt-modal-subtotal");
    if (txtModalSubtotal) txtModalSubtotal.innerText = `R$ ${totalDinheiro.toFixed(2).replace('.', ',')}`;
}

// Garante que a gaveta mude de estilo CSS para ficar visível na tela
function abrirSacola() {
    const modalSacola = document.getElementById('painel-sacola-modal');
    if (modalSacola) {
        // 1. Blindagem Híbrida: Garante visibilidade máxima em qualquer tamanho de tela
        modalSacola.style.visibility = "visible";
        modalSacola.style.display = "block";
        modalSacola.style.zIndex = "99999"; // Fica por cima do rodapé no PC e no Celular
        modalSacola.classList.add('open');

        // 2. Controla o comportamento do painel branco interno
        const conteudoGaveta = modalSacola.querySelector('.sacola-drawer-content');
        if (conteudoGaveta) {
            // Detecta se o usuário está no computador (telas maiores que 768px)
            if (window.innerWidth > 768) {
                conteudoGaveta.style.position = "fixed";
                conteudoGaveta.style.top = "50%";
                conteudoGaveta.style.left = "50%";
                conteudoGaveta.style.transform = "translate(-50%, -50%)"; // Centraliza como modal no PC
                conteudoGaveta.style.bottom = "auto";
                conteudoGaveta.style.borderRadius = "20px"; // Bordas arredondadas completas no PC
            } else {
                // Comportamento perfeito para o Celular: desliza de baixo para cima
                conteudoGaveta.style.position = "absolute";
                conteudoGaveta.style.bottom = "0";
                conteudoGaveta.style.left = "50%";
                conteudoGaveta.style.transform = "translateX(-50%)";
                conteudoGaveta.style.top = "auto";
                conteudoGaveta.style.borderRadius = "20px 20px 0 0"; // Estilo gaveta de app
            }
        }

        // 3. Renderiza os pratos com as descrições e acompanhamentos escolhidos
        renderizarItensSacola();
        console.log("🌵 Sabor Cearense: Sacola híbrida aberta com sucesso!");
    } else {
        console.error("Erro: O elemento HTML 'painel-sacola-modal' não foi localizado.");
    }
}

function fecharSacola() {
    const modalSacola = document.getElementById('painel-sacola-modal');
    if (modalSacola) {
        modalSacola.classList.remove('open');
        
        const conteudoGaveta = modalSacola.querySelector('.sacola-drawer-content');
        if (conteudoGaveta && window.innerWidth <= 768) {
            // No celular, joga a gaveta de volta para baixo da tela
            conteudoGaveta.style.bottom = "-100%";
        }

        // Espera 300ms (tempo da animação) para ocultar a estrutura completa com segurança
        setTimeout(() => {
            if (!modalSacola.classList.contains('open')) {
                modalSacola.style.visibility = "hidden";
                modalSacola.style.display = "none";
            }
        }, 300);
    }
}
