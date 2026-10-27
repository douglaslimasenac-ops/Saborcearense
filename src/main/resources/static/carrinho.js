// ==========================================
// 🌵 VARIÁVEIS GLOBAIS DE CONTROLE FINANCEIRO
// ==========================================
let subtotalProdutos = 0;
let valorTaxaEntrega = 0;
let listaPratosGlobal = [];
let totalCalculado = 0;
let taxaEntregaSelecionada = 0;
let bairroTextoSelecionado = "";
let carrinho = {};

const URL_API_BACKEND = window.location.origin;
const WHATSAPP_NUMERO = "5521974720736";

// ==========================================
// 🌐 EVENTOS DE INICIALIZAÇÃO (DOM)
// ==========================================
// ==========================================
// 🌐 EVENTOS DE INICIALIZAÇÃO (DOM) - ATUALIZADO
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 🌵 Limpeza de segurança preventiva para evitar dados antigos e corrompidos de testes passados
    if (!localStorage.getItem("SaborCearense_v2_Acomp")) {
        localStorage.removeItem("carrinho");
        localStorage.removeItem("cart");
        localStorage.removeItem("saborCearense_carrinho");
        // Marca que o navegador já limpou o lixo das versões anteriores
        localStorage.setItem("SaborCearense_v2_Acomp", "true");
        console.log("🌵 Sabor Cearense: Memória de versões antigas limpa com sucesso!");
    }


    // CORREÇÃO LINHA 33: Só executa se estiver na página do cardápio
    if (typeof carregarCardapio === "function") {
        carregarCardapio();
    }

    // CORREÇÃO LINHA 38: Só executa se a função de horário existir na tela atual
    if (typeof verificarHorarioFuncionamento === "function") {
        verificarHorarioFuncionamento();
    }

    if (document.getElementById("lista-itens-carrinho")) {
        carregarItensDaUrlNoCarrinho();
    }
    const campoObservacao = document.getElementById("observacao");
    if (campoObservacao) {
        const contador = document.getElementById("contador-observacao");
        const atualizarContador = () => {
            if (contador) contador.textContent = campoObservacao.value.length;
        };
        campoObservacao.addEventListener("input", atualizarContador);
        atualizarContador();
    }
});

// ==========================================
// 📦 GERENCIAMENTO E RENDERIZAÇÃO DE DADOS
// ==========================================
function carregarDadosDoCarrinho() {
    const containerItens = document.getElementById("lista-itens-carrinho");
    let dadosCarrinhoRaw = null;

    const urlParams = new URLSearchParams(window.location.search);
    const paramUrl = urlParams.get("carrinho");

    if (paramUrl) {
        dadosCarrinhoRaw = decodeURIComponent(paramUrl);
    } else {
        dadosCarrinhoRaw = localStorage.getItem("carrinhoSaborCearense");
    }

    if (!dadosCarrinhoRaw || !containerItens) return;

    try {
        listaPratosGlobal = JSON.parse(dadosCarrinhoRaw);
        if (Array.isArray(listaPratosGlobal) && listaPratosGlobal.length > 0) {
            containerItens.innerHTML = "";
            subtotalProdutos = 0;

            listaPratosGlobal.forEach(item => {
                const divItem = document.createElement("div");
                divItem.className = "item-resumo";

                const nomeLimpo = item.nome ? decodeURIComponent(item.nome) : "Prato";
                const qtd = item.quantidade || item.qtd || 1;
                const preco = item.preco || 0;
                const subtotal = qtd * preco;
                subtotalProdutos += subtotal;

                divItem.innerHTML = `
                    <div>
                        <span class="item-qtd-tag">${qtd}x</span>
                        <span class="item-nome">${nomeLimpo}</span>
                    </div>
                    <span class="item-preco-sub">R$ ${subtotal.toFixed(2).replace(".", ",")}</span>
                `;
                containerItens.appendChild(divItem);
            });

            atualizarValoresTela();
        }
    } catch (erro) {
        console.error("Erro ao processar dados do carrinho:", erro);
    }
}

function carregarItensDaUrlNoCarrinho() {
    // 1. Mapeia a div correta do seu HTML
    const containerItens = document.getElementById("lista-itens-carrinho");

    if (!containerItens) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const carrinhoParam = urlParams.get("carrinho");
        let itensCarrinho = null;

        if (carrinhoParam) {
            // Decodifica a string JSON vinda da sua URL real
            itensCarrinho = JSON.parse(decodeURIComponent(carrinhoParam));
        } else {
            // Fallback para o LocalStorage caso o parâmetro suma
            const localRaw = localStorage.getItem("carrinhoSaborCearense") || localStorage.getItem("saborCearense_carrinho");
            if (localRaw) {
                itensCarrinho = JSON.parse(localRaw);
            }
        }

        if (!itensCarrinho) return;

        // 🌵 AJUSTE AQUI: Identifica se veio apenas um prato (objeto direto) ou uma lista
        let listaItens = [];
        if (Array.isArray(itensCarrinho)) {
            listaItens = itensCarrinho;
        } else if (itensCarrinho && typeof itensCarrinho === 'object' && 'nome' in itensCarrinho) {
            // Se for um prato direto (como na sua URL atual), coloca ele dentro de um Array
            listaItens = [itensCarrinho];
        } else if (itensCarrinho && typeof itensCarrinho === 'object') {
            // Caso seja um indexador no formato {"1": {...}, "2": {...}}
            listaItens = Object.values(itensCarrinho);
        }

        if (listaItens && listaItens.length > 0) {
            // Limpa o contêiner para remover mensagens residuais ou duplicadas
            containerItens.innerHTML = "";
            let subtotalCalculadoUrl = 0;

            listaItens.forEach(item => {
                const divItem = document.createElement("div");
                // Herda perfeitamente a classe do seu layout CSS corporativo
                divItem.className = "item-resumo";
                
                // Força o alinhamento lado a lado profissional (Qtd/Nome na esquerda, Preço na direita)
                divItem.style.display = "flex";
                divItem.style.justifyContent = "space-between";
                divItem.style.padding = "6px 0";

                // Mapeamento exato das propriedades vinda da sua URL ("nome", "quantidade", "preco")
                const nomeLimpo = item.nome ? decodeURIComponent(item.nome) : "Prato";
                const qtd = item.quantidade || item.qtd || 1;
                const preco = item.preco || 0;
                const subtotalItem = qtd * preco;
                subtotalCalculadoUrl += subtotalItem;

                divItem.innerHTML = `
                    <div>
                        <span class="item-qtd-tag" style="font-weight: 600; margin-right: 6px;">${qtd}x</span>
                        <span class="item-nome">${nomeLimpo}</span>
                    </div>
                    <span class="item-preco-sub" style="font-weight: 700; color: #0f766e;">R$ ${subtotalItem.toFixed(2).replace(".", ",")}</span>
                `;
                containerItens.appendChild(divItem);
            });

            // Sincroniza o valor total com os escopos globais do seu script
            if (typeof totalCalculado !== "undefined") totalCalculado = subtotalCalculadoUrl;
            if (typeof subtotalProdutos !== "undefined") subtotalProdutos = subtotalCalculadoUrl;

            // 2. Atualiza a exibição do preço na caixa superior do resumo
            atualizarResumoFinanceiroTela();
        }
    } catch (erro) {
        console.error("Erro ao renderizar itens da URL do Sabor Cearense:", erro);
    }
}


function renderizarResumo() {
    const container = document.getElementById("lista-itens-carrinho");
    const totalTxt = document.getElementById("valor-total");
    if (!container || !totalTxt) return;
    
    const carrinhoObjeto = JSON.parse(localStorage.getItem("carrinhoSaborCearense")) || {};
    const itens = Object.values(carrinhoObjeto);

    if (itens.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #718096; margin: 20px 0;">Seu carrinho está vazio.</p>`;
        totalTxt.innerText = "R$ 0,00";
        return;
    }

    container.innerHTML = "";
    let subtotal = 0;

    itens.forEach(item => {
        subtotal += item.preco * item.quantidade;
    });

    totalCalculado = subtotal; 

    atualizarResumoFinanceiroTela();
    const pagTotal = document.getElementById("pagamento-valor-total");
    if (pagTotal) pagTotal.innerText = `R$ ${totalCalculado.toFixed(2).replace('.', ',')}`;
}
// ==========================================
// 🧮 CÁLCULOS FINANCEIROS E EXIBIÇÃO SCREEN
// ==========================================
function atualizarTaxaEntrega(valorSelect) {
    if (!valorSelect) return;
    
    const partes = valorSelect.split("|");
    bairroTextoSelecionado = partes[0]; 
    taxaEntregaSelecionada = parseFloat(partes[1]) || 0; 
    
    const totalComTaxa = totalCalculado + taxaEntregaSelecionada;
    
    atualizarResumoFinanceiroTela();
}

function atualizarValoresTela() {
    totalCalculado = subtotalProdutos;
    atualizarResumoFinanceiroTela();
}

function atualizarResumoFinanceiroTela() {
    const subtotal = Number(totalCalculado || subtotalProdutos || 0);
    const taxa = Number(taxaEntregaSelecionada || valorTaxaEntrega || 0);
    const totalGeral = subtotal + taxa;
    const formatar = valor => `R$ ${valor.toFixed(2).replace(".", ",")}`;
    const campoSubtotal = document.getElementById("subtotal-produtos");
    const campoTaxa = document.getElementById("taxa-entrega");
    const campoTotal = document.getElementById("valor-total");
    const campoTotalPagar = document.getElementById("pagamento-valor-total");

    if (campoSubtotal) campoSubtotal.textContent = formatar(subtotal);
    if (campoTaxa) campoTaxa.textContent = formatar(taxa);
    if (campoTotal) campoTotal.textContent = formatar(totalGeral);
    if (campoTotalPagar) campoTotalPagar.textContent = formatar(totalGeral);
}

// ==========================================
// 💳 INTERAÇÃO E REGRAS PIX
// ==========================================
function controlarExibicaoPix(opcao) {
    const boxPix = document.getElementById("container-pix-dinamico");
    if (boxPix) {
        boxPix.style.display = (opcao === "Pix") ? "block" : "none";
    }
}

function copiarChavePix() {
    const campoTexto = document.getElementById("chave-pix-texto");
    if (campoTexto) {
        campoTexto.select();
        campoTexto.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(campoTexto.value);
        alert("🔑 Chave CNPJ copiada com sucesso!");
    }
}

// ==========================================
// 🚀 ENVIAR PEDIDO E INTEGRAÇÃO BACKEND / WHATSAPP
// ==========================================
async function enviarPedido(e) {
    if (e && typeof e.preventDefault === "function") {
        e.preventDefault();
    }

    // 1. Validação de Horário Comercial de Delivery
    const agora = new Date();
    const diaSemana = agora.getDay();
    const minutosAtuais = (agora.getHours() * 60) + agora.getMinutes();
    
    const modoAdminSecreto = Boolean(localStorage.getItem("adminToken"));

    if (diaSemana === 0 || minutosAtuais < (11 * 60 + 30) || minutosAtuais > (15 * 60)) {
        if (!modoAdminSecreto) {
            alert("Desculpe! O restaurante acabou de fechar o expediente de entregas. Não é possível fechar novos pedidos agora.");
            return;
        }
    }

        // ========================================================
    // 2. Resgata e valida a Sacola localmente (CORRIGIDO PARA O NOME EXATO)
    // ========================================================
    const carrinhoObjeto = JSON.parse(localStorage.getItem("carrinhoSaborCearense")) || {};
    const itens = Object.values(carrinhoObjeto);

    if (itens.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }


    // 3. Validação dos Campos do Formulário
    const selectBairro = document.getElementById("bairro-entrega");
    if (!selectBairro || !selectBairro.value) { 
        alert("Por favor, selecione o bairro de entrega!"); 
        return; 
    }

    const bairroTextoSelecionado = selectBairro.options[selectBairro.selectedIndex]?.text || selectBairro.value;
    const subtotalDoPedido = itens.reduce((soma, item) => {
        const preco = Number(item.preco || item.valor || 0);
        const quantidade = Number(item.quantidade || item.qtd || 1);
        return soma + (preco * quantidade);
    }, 0);
    const taxaDoPedido = Number(taxaEntregaSelecionada || 0);
    const totalComTaxaGeral = subtotalDoPedido + taxaDoPedido;

    const nome = document.getElementById("nome").value;
    const contatoTelefone = document.getElementById("telefone").value.toString().trim(); // Garante formato de String limpa para o Java
    const enderecoRua = document.getElementById("endereco").value;
    const ref = document.getElementById("ponto-referencia").value || "Não informado";
    const observacao = document.getElementById("observacao").value.trim();
    const pagamento = document.getElementById("pagamento").value;

    const enderecoCompleto = `${enderecoRua}, Bairro: ${bairroTextoSelecionado} (Ref: ${ref})`;
    // 4. PREPARAÇÃO DA ABA DO WHATSAPP (Burlar bloqueadores de pop-up nativos)
    const abaWhatsapp = window.open("about:blank", "_blank");
    if (abaWhatsapp) {
        abaWhatsapp.document.write("<p style='font-family:sans-serif; text-align:center; margin-top:20%; color:#555;'>Salvando seu pedido no Sabor Cearense... Aguarde...</p>");
    }

    // 5. Payload mapeado cirurgicamente com a Entity Java e os Getters/Setters do Controller
    const dadosPedido = {
        clienteNome: nome,
        telefone: contatoTelefone,
        endereco: enderecoCompleto,
        formaPagamento: pagamento,
        valorTotal: Number(totalComTaxaGeral.toFixed(2)),
        itens: JSON.stringify(itens.map(item => ({
            ...item,
            preco: Number(item.preco || item.valor || 0),
            quantidade: Number(item.quantidade || item.qtd || 1)
        }))),
        observacao,
        status: "RECEBIDO" // Já manda o status padrão esperado pelo @PostMapping
    };

    let pedidoIdGerado = "NOVO";

        // 6. BUSCA INTELIGENTE E CORREÇÃO DA URL DA API (Evita Erro 404)
    let urlBase = typeof URL_API_BACKEND !== "undefined" ? URL_API_BACKEND : (window.URL_API_BACKEND || "");
    
    let pedidoSalvoComSucesso = false;
    if (urlBase && urlBase !== "null") {
        try {
            // Remove barras extras do final e garante que o caminho termine exatamente em /api/pedidos
            let urlLimpa = urlBase.replace(/\/$/, ""); 
            if (!urlLimpa.endsWith("/api/pedidos")) {
                urlLimpa += "/api/pedidos";
            }
            
            console.log("Enviando pedido para o endereço correto:", urlLimpa);

            // Faz a chamada e espera obrigatoriamente a resposta física do Render
            const response = await fetch(urlLimpa, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(dadosPedido)
            });

            if (response.ok) {
                const pedidoSalvo = await response.json();
                pedidoIdGerado = pedidoSalvo.id; // Vincula o ID real gerado pelo banco Java
                localStorage.setItem("ultimoPedidoIdSaborCearense", pedidoIdGerado);
                pedidoSalvoComSucesso = true;
            } else {
                console.error("O backend recusou os dados. Status do erro:", response.status);
            }
        } catch (apiError) {
            console.error("Falha ao processar requisição fetch para o Render:", apiError);
        }
    } else {
        console.error("A variável global URL_API_BACKEND não foi localizada.");
    }

    if (!pedidoSalvoComSucesso) {
        if (abaWhatsapp) abaWhatsapp.close();
        alert("Não foi possível registrar o pedido no sistema. Tente novamente.");
        return;
    }


    // 7. Montagem da Mensagem Textual do WhatsApp
    let mensagem = "🌵 *NOVO PEDIDO - SABOR CEARENSE* 🌵\n\n";
    if (pedidoIdGerado !== "NOVO") {
        mensagem += "🆔 *Pedido Nº:* #" + pedidoIdGerado + "\n";
    }
    mensagem += "👤 *Cliente:* " + nome + "\n";
    mensagem += "📞 *Contato:* " + contatoTelefone + "\n";
    mensagem += "📍 *Bairro:* " + bairroTextoSelecionado + "\n";
    mensagem += "🏠 *Endereço:* " + enderecoRua + "\n";
    mensagem += "🔍 *Referência:* " + ref + "\n";
    mensagem += "💳 *Pagamento:* " + pagamento + "\n\n";
    mensagem += "🛒 *Itens do Pedido:*\n";

    itens.forEach(item => {
        const subtotal = (item.preco * item.quantidade).toFixed(2).replace('.', ',');
        mensagem += "• " + item.quantidade + "x _" + item.nome + "_ - R$ " + subtotal + "\n";
    });

    if (observacao) {
        mensagem += "\n📝 *Observação:* " + observacao + "\n";
    }

    mensagem += "\n🛵 *Taxa de Entrega:* R$ " + taxaEntregaSelecionada.toFixed(2).replace('.', ',');
    mensagem += "\n💰 *Total do Pedido:* R$ " + totalComTaxaGeral.toFixed(2).replace('.', ',') + "\n\n";
    mensagem += "_Por favor, confirme o recebimento do meu pedido!_";

    const numeroWhats = typeof WHATSAPP_NUMERO !== "undefined" ? WHATSAPP_NUMERO : (window.WHATSAPP_NUMERO || "5585999999999"); 
    const urlWhatsapp = "https://wa.me/" + numeroWhats + "?text=" + encodeURIComponent(mensagem);
    
    // 8. ETAPA FINAL DE LIMPEZA DO CARRINHO E REDIRECIONAMENTOS
    localStorage.removeItem("carrinhoSaborCearense");

    if (abaWhatsapp) {
        abaWhatsapp.location.href = urlWhatsapp; 
    } else {
        window.open(urlWhatsapp, '_blank');
    }
    
    window.location.href = `acompanhar.html?id=${encodeURIComponent(pedidoIdGerado)}`;
}
