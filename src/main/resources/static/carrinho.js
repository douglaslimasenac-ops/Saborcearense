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

const URL_API_BACKEND = ""; 
const WHATSAPP_NUMERO = "5521974720736"; 

// ==========================================
// 🌐 EVENTOS DE INICIALIZAÇÃO (DOM)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    // 1. Carrega dados primários do carrinho
    carregarDadosDoCarrinho();
    carregarItensDaUrlNoCarrinho();
    renderizarResumo();

    // 2. Tenta buscar informações salvas da sacola da página anterior
    const dadosSalvos = localStorage.getItem('saborCearense_carrinho');
    if (dadosSalvos) {
        carrinho = JSON.parse(dadosSalvos);
    }

    // 3. Monitora o envio do formulário de checkout e validação
    const formulario = document.getElementById("form-pedido");
    if (formulario) {
        formulario.addEventListener("submit", enviarPedido);
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
    const containerItens = document.getElementById("itens-selecionados-container") || 
                           document.querySelector(".itens-selecionados") ||
                           document.querySelector(".card-pedido") || 
                           document.querySelector("main");

    if (!containerItens) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const carrinhoParam = urlParams.get("carrinho");

        if (carrinhoParam) {
            const itensCarrinho = JSON.parse(decodeURIComponent(carrinhoParam));

            if (Array.isArray(itensCarrinho) && itensCarrinho.length > 0) {
                const listaHtml = document.createElement("div");
                listaHtml.style.marginBottom = "15px";

                itensCarrinho.forEach(item => {
                    const itemLinha = document.createElement("div");
                    itemLinha.style.display = "flex";
                    itemLinha.style.justifyContent = "space-between";
                    itemLinha.style.padding = "8px 0";
                    itemLinha.style.borderBottom = "1px dashed #e2e8f0";
                    itemLinha.style.color = "#334155";
                    itemLinha.style.fontSize = "1rem";

                    const nomeFormatado = item.nome ? item.nome.replace(/%20/g, " ") : "Prato";
                    const qtd = item.quantidade || item.qtd || 1;
                    const preco = item.preco || 0;

                    itemLinha.innerHTML = `
                        <span style="font-weight: 600;">${qtd}x ${nomeFormatado}</span>
                        <span style="color: #0f766e; font-weight: 700;">R$ ${(qtd * preco).toFixed(2)}</span>
                    `;
                    listaHtml.appendChild(itemLinha);
                });

                containerItens.prepend(listaHtml);
            }
        }
    } catch (erro) {
        console.error("Erro ao ler os itens vindo da URL:", erro);
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

    totalTxt.innerHTML = `Valor Total: <strong>R$ ${totalCalculado.toFixed(2).replace('.', ',')}</strong>`;
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
    
    const totalTxt = document.getElementById("valor-total");
    if (totalTxt) {
        totalTxt.innerHTML = `Valor Total: <strong>R$ ${totalComTaxa.toFixed(2).replace('.', ',')}</strong> (com R$ ${taxaEntregaSelecionada.toFixed(2).replace('.', ',')} de entrega)`;
    }

    const pagamentoTotalTxt = document.getElementById("pagamento-valor-total");
    if (pagamentoTotalTxt) {
        pagamentoTotalTxt.innerText = `R$ ${totalComTaxa.toFixed(2).replace('.', ',')}`;
    }
}

function atualizarValoresTela() {
    const campoTotal = document.getElementById("valor-total");
    const campoTotalPagar = document.getElementById("pagamento-valor-total");
    const totalGeral = subtotalProdutos + valorTaxaEntrega;

    const valorFormatado = "R$ " + totalGeral.toFixed(2).replace(".", ",");
    
    if (campoTotal) campoTotal.textContent = valorFormatado;
    if (campoTotalPagar) campoTotalPagar.textContent = valorFormatado;
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
    e.preventDefault();

    // 1. Validação de Horário Comercial de Delivery
    const agora = new Date();
    const diaSemana = agora.getDay();
    const minutosAtuais = (agora.getHours() * 60) + agora.getMinutes();
    
    const parametrosUrl = new URLSearchParams(window.location.search);
    const modoAdminSecreto = parametrosUrl.get("admin") === "1" || localStorage.getItem("adminAutenticado") === "true";

    if (diaSemana === 0 || minutosAtuais < (11 * 60 + 30) || minutosAtuais > (15 * 60)) {
        if (!modoAdminSecreto) {
            alert("Desculpe! O restaurante acabou de fechar o expediente de entregas. Não é possível enviar ou fechar novos pedidos agora.");
            return;
        }
    }

    // 2. Validação de Sacola Vazia localmente
    const carrinhoObjeto = JSON.parse(localStorage.getItem("carrinhoSaborCearense")) || {};
    const itens = Object.values(carrinhoObjeto);

    if (itens.length === 0) {
        alert("Seu carrinho está vazio!");
        return;
    }

    // 3. Validação dos Campos de Cadastro
    const bairroSelect = document.getElementById("bairro-entrega").value;
    if (!bairroSelect) { 
        alert("Por favor, selecione o bairro de entrega!"); 
        return; 
    }

    const nome = document.getElementById("nome").value;
    const contatoTelefone = document.getElementById("telefone").value;
    const enderecoRua = document.getElementById("endereco").value;
    const ref = document.getElementById("ponto-referencia").value || "Não informado";
    const pagamento = document.getElementById("pagamento").value;

    const enderecoCompleto = `${enderecoRua}, Bairro: ${bairroTextoSelecionado}`;
    const totalComTaxaGeral = totalCalculado + taxaEntregaSelecionada;

    // 4. Monta o Payload do Pedido para o seu Backend Java no Render
    const dadosPedido = {
        clienteNome: nome,
        endereco: enderecoCompleto + " (Tel: " + contatoTelefone + ") (Ref: " + ref + ")",
        formaPagamento: pagamento,
        valorTotal: totalComTaxaGeral 
    };

    try {
        const response = await fetch(URL_API_BACKEND + "/api/pedidos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dadosPedido)
        });

        let pedidoIdGerado = "NOVO";
        if (response.ok) {
            const pedidoSalvo = await response.json();
            pedidoIdGerado = pedidoSalvo.id;
            localStorage.setItem("ultimoPedidoIdSaborCearense", pedidoIdGerado);
        }

        // 5. Montagem da Mensagem do WhatsApp do Estabelecimento
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

        mensagem += "\n🛵 *Taxa de Entrega:* R$ " + taxaEntregaSelecionada.toFixed(2).replace('.', ',');
        mensagem += "\n💰 *Total do Pedido:* R$ " + totalComTaxaGeral.toFixed(2).replace('.', ',') + "\n\n";
        mensagem += "_Por favor, confirme o recebimento do meu pedido!_";

        const urlWhatsapp = "https://wa.me/"+ WHATSAPP_NUMERO + "?text=" + encodeURIComponent(mensagem);
        
        window.open(urlWhatsapp, '_blank');
        localStorage.removeItem("carrinhoSaborCearense");
        window.location.href = "index.html?admin=1&aba=RASTREIO"; 

    } catch (error) {
        console.error("Erro no processamento do pedido:", error);
        alert("Ocorreu uma falha ao enviar o pedido para o servidor, mas você pode tentar reenviar.");
    }
}
