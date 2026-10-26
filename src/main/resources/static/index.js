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

        function mudarQuantidade(id, alteracao, nome, preco) {
            if (!carrinho[id]) {
                carrinho[id] = { nome: nome, preco: parseFloat(preco), quantidade: 0 };
            }
            carrinho[id].quantidade += alteracao;

            if (carrinho[id].quantidade <= 0) {
                delete carrinho[id];
                if(document.getElementById("qtd-" + id)) document.getElementById("qtd-" + id).innerText = "0";
                if(document.getElementById("item-" + id)) document.getElementById("item-" + id).classList.remove("selecionado");
            } else {
                if(document.getElementById("qtd-" + id)) document.getElementById("qtd-" + id).innerText = carrinho[id].quantidade;
                if(document.getElementById("item-" + id)) document.getElementById("item-" + id).classList.add("selecionado");
            }
            atualizarTotalFlutuante(); 
            sincronizarContadorCardapio(id);
        }

        function sincronizarContadorCardapio(id) {
            const elementoContador = document.getElementById(`qtd-${id}`);
            if (elementoContador) {
                const qtdAtual = carrinho[id] ? carrinho[id].quantidade : 0;
                elementoContador.innerText = qtdAtual;
            }
        }
        function atualizarTotalFlutuante() {
            let totalItens = 0;
            let valorTotal = 0;

            Object.values(carrinho).forEach(item => {
                totalItens += item.quantidade;
                valorTotal += item.preco * item.quantidade;
            });

            const elQtd = document.getElementById('txt-qtd-itens');
            const elTotal = document.getElementById('txt-valor-total');
            const elSubtotal = document.getElementById('txt-modal-subtotal');

            if (elQtd) elQtd.innerText = `${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`;
            if (elTotal) elTotal.innerText = `R$ ${valorTotal.toFixed(2)}`;
            if (elSubtotal) elSubtotal.innerText = `R$ ${valorTotal.toFixed(2)}`;
        }

        function abrirSacola() {
            document.getElementById('painel-sacola-modal').classList.add('open');
            renderizarItensSacola();
        }

        function fecharSacola() {
            document.getElementById('painel-sacola-modal').classList.remove('open');
        }

        function renderizarItensSacola() {
            const containerLista = document.getElementById('lista-produtos-sacola');
            containerLista.innerHTML = '';
            const itens = Object.entries(carrinho);

            if (itens.length === 0) {
                containerLista.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">Sua sacola está vazia.</p>`;
                return;
            }

            itens.forEach(([id, item]) => {
                containerLista.innerHTML += `
                    <div class="item-sacola-linha">
                        <div>
                            <div style="font-weight: 600; font-size:15px;">${item.nome}</div>
                            <div style="font-size: 13px; color: #777;">R$ ${(item.preco * item.quantidade).toFixed(2)}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <button onclick="mudarQuantidade('${id}', -1, '${item.nome}', ${item.preco}); renderizarItensSacola();" style="padding:4px 10px;">-</button>
                            <span style="font-weight:bold;">${item.quantidade}</span>
                            <button onclick="mudarQuantidade('${id}', 1, '${item.nome}', ${item.preco}); renderizarItensSacola();" style="padding:4px 10px;">+</button>
                        </div>
                    </div>
                `;
            });
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
    
    // Converte o seu carrinho em String JSON
    const carrinhoJson = JSON.stringify(carrinho);
    
    // Salva usando exatamente a chave que a outra página espera ler (Garante o PC)
    localStorage.setItem("carrinhoSaborCearense", carrinhoJson);
    
    // Transforma os dados em um formato totalmente seguro para passar na barra de endereço
    const dadosSegurosUrl = encodeURIComponent(carrinhoJson);
    
    // Redireciona passando os dados de carona na URL (Garante o Celular)
    window.location.href = `carrinho.html?carrinho=${dadosSegurosUrl}`;
}

function executarBuscaRastreio() {
    const input = document.getElementById('input-rastreio-index');
    if (!input) return;
    const pedidoId = input.value.trim().replace('#', '');
    if (!pedidoId) {
        alert('Por favor, digite o número do pedido.');
        return;
    }
    window.location.href = `acompanhar.html?id=${pedidoId}`;
}
// Função principal que substitui o clique do seu botão de adicionar atual
function adicionarAoCarrinhoSaborCearense(nomePrato, precoPrato) {
    // 1. Cria a estrutura do Modal na tela dinamicamente
    const modal = document.createElement("div");
    modal.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; font-family: sans-serif; padding: 15px; box-sizing: border-box;";
    
    modal.innerHTML = `
        <div style="background: #fff; padding: 20px; border-radius: 12px; max-width: 360px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            <h3 style="margin-top: 0; color: #141414; font-size: 1.1rem; border-bottom: 2px solid #e76f51; padding-bottom: 8px;">🌵 Acompanhamentos do Prato</h3>
            <p style="font-size: 0.9rem; color: #666; margin-bottom: 15px;">Escolha até 2 opções para o seu <strong>${nomePrato}</strong>:</p>
            
            <div id="lista-opcoes-acomp" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" value="Maionese" style="width: 18px; height: 18px;"> Maionese</label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" value="Macarronese" style="width: 18px; height: 18px;"> Macarronese</label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" value="Salada de Legumes" style="width: 18px; height: 18px;"> Salada de Legumes</label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" value="Purê" style="width: 18px; height: 18px;"> Purê</label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" value="Espaguete" style="width: 18px; height: 18px;"> Espaguete</label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" value="Fritas" style="width: 18px; height: 18px;"> Fritas</label>
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button id="btn-cancelar-acomp" style="flex: 1; padding: 10px; border: 1px solid #ccc; background: #fff; border-radius: 6px; font-weight: bold; cursor: pointer;">Cancelar</button>
                <button id="btn-confirmar-acomp" style="flex: 1; padding: 10px; border: none; background: #22c55e; color: #fff; border-radius: 6px; font-weight: bold; cursor: pointer;">Adicionar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);

    // 2. Trava a seleção em no máximo 2 acompanhamentos
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

    // 3. Ação do Botão Cancelar
    modal.querySelector("#btn-cancelar-acomp").onclick = () => {
        modal.remove();
    };

    // 4. Ação do Botão Confirmar (Envia o prato alterado para o carrinho)
    modal.querySelector("#btn-confirmar-acomp").onclick = () => {
        const marcados = modal.querySelectorAll("#lista-opcoes-acomp input:checked");
        const acompanhamentos = [];
        marcados.forEach(cb => acompanhamentos.push(cb.value));

        // Formata o nome do prato adicionando os acompanhamentos selecionados
        let nomeItemComAcomp = nomePrato;
        if (acompanhamentos.length > 0) {
            nomeItemComAcomp += " (" + acompanhamentos.join(", ") + ")";
        }

        const dadosItem = {
            nome: nomeItemComAcomp,
            preco: parseFloat(precoPrato),
            quantidade: 1
        };

        // Redireciona enviando o prato já alterado diretamente na URL do carrinho
        const jsonCarrinho = encodeURIComponent(JSON.stringify(dadosItem));
        modal.remove();
        window.location.href = `carrinho.html?carrinho=${jsonCarrinho}`;
    };
}
