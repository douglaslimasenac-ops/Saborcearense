// ==========================================
// 🌵 VARIÁVEIS GLOBAIS DE CONTROLE FINANCEIRO
// ==========================================
let subtotalProdutos = 0;
let valorTaxaEntrega = 0;
let listaPratosGlobal = [];
let totalCalculado = 0;
let taxaEntregaSelecionada = 0;
let bairroTextoSelecionado = "";
let tipoRecebimentoSelecionado = "ENTREGA";
let carrinho = {};

const URL_API_BACKEND = window.location.origin;

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
    carregarBairrosEntrega();

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

async function carregarBairrosEntrega() {
    const select = document.getElementById("bairro-entrega");
    if (!select) return;

    try {
        const resposta = await fetch(`${URL_API_BACKEND}/api/bairros`);
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const bairros = await resposta.json();
        select.innerHTML = '<option value="" disabled selected>Escolha o seu bairro...</option>';
        bairros.forEach(bairro => {
            const taxa = Number(bairro.taxa || 0);
            const opcao = document.createElement("option");
            opcao.value = `${bairro.nome}|${taxa.toFixed(2)}`;
            opcao.textContent = `${bairro.nome} - R$ ${taxa.toFixed(2).replace(".", ",")}`;
            select.appendChild(opcao);
        });
        if (!bairros.length) {
            select.innerHTML = '<option value="" disabled selected>Nenhum bairro disponível</option>';
        }
    } catch (erro) {
        console.error("Não foi possível carregar os bairros:", erro);
        select.innerHTML = '<option value="" disabled selected>Não foi possível carregar os bairros</option>';
        alert("Não foi possível carregar as opções de entrega. Atualize a página e tente novamente.");
    }
}

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

function alterarTipoRecebimento(tipo) {
    tipoRecebimentoSelecionado = tipo === "RETIRADA" ? "RETIRADA" : "ENTREGA";
    const camposEntrega = document.getElementById("campos-entrega");
    const avisoRetirada = document.getElementById("aviso-retirada");
    const bairro = document.getElementById("bairro-entrega");
    const endereco = document.getElementById("endereco");
    const referencia = document.getElementById("ponto-referencia");
    const entrega = tipoRecebimentoSelecionado === "ENTREGA";

    if (camposEntrega) camposEntrega.hidden = !entrega;
    if (avisoRetirada) avisoRetirada.hidden = entrega;
    [bairro, endereco, referencia].forEach(campo => {
        if (campo) campo.disabled = !entrega;
    });
    if (bairro) bairro.required = entrega;
    if (endereco) endereco.required = entrega;
    if (!entrega) {
        taxaEntregaSelecionada = 0;
        bairroTextoSelecionado = "";
    } else if (bairro && bairro.value) {
        atualizarTaxaEntrega(bairro.value);
    }
    atualizarResumoFinanceiroTela();
    document.querySelectorAll(".opcao-recebimento").forEach(opcao => {
        const radio = opcao.querySelector("input");
        opcao.classList.toggle("selecionada", Boolean(radio && radio.checked));
    });
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
    atualizarPixDinamico(totalGeral);
}

// ==========================================
// 💳 INTERAÇÃO E REGRAS PIX
// ==========================================
const PIX_CHAVE_CNPJ = "59361228000150";

function crc16Pix(texto) {
    let crc = 0xFFFF;
    for (let i = 0; i < texto.length; i++) {
        crc ^= texto.charCodeAt(i) << 8;
        for (let bit = 0; bit < 8; bit++) {
            crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
}

function campoPix(id, valor) {
    const texto = String(valor);
    return id + String(texto.length).padStart(2, "0") + texto;
}

function gerarCodigoPix(valor) {
    const valorFormatado = Number(valor || 0).toFixed(2);
    const merchantAccount = campoPix("00", "br.gov.bcb.pix") + campoPix("01", PIX_CHAVE_CNPJ);
    const payloadSemCrc = [
        campoPix("00", "01"),
        campoPix("26", merchantAccount),
        campoPix("52", "0000"),
        campoPix("53", "986"),
        campoPix("54", valorFormatado),
        campoPix("58", "BR"),
        campoPix("59", "SABOR CEARENSE"),
        campoPix("60", "RIO DE JANEIRO"),
        campoPix("62", campoPix("05", "***"))
    ].join("") + "6304";
    return payloadSemCrc + crc16Pix(payloadSemCrc);
}

function atualizarPixDinamico(valor) {
    const campoPix = document.getElementById("chave-pix-texto");
    const valorPix = document.getElementById("pix-valor-gerado");
    const qrContainer = document.getElementById("pix-qrcode");
    if (!campoPix || !qrContainer) return;

    const valorNumerico = Number(valor || 0);
    const payload = gerarCodigoPix(valorNumerico);
    campoPix.value = payload;
    if (valorPix) valorPix.textContent = `Valor: R$ ${valorNumerico.toFixed(2).replace(".", ",")}`;

    qrContainer.innerHTML = "";
    if (typeof QRCode === "undefined") {
        qrContainer.textContent = "QR Code indisponível. Use o Pix Copia e Cola.";
        return;
    }
    new QRCode(qrContainer, {
        text: payload,
        width: 190,
        height: 190,
        colorDark: "#29231d",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
}

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

function atualizarEtapaCheckout(etapaAtual) {
    document.querySelectorAll(".checkout-etapa-conteudo").forEach(etapa => {
        const ativa = etapa.dataset.etapa === etapaAtual;
        etapa.classList.toggle("ativa", ativa);
        etapa.hidden = !ativa;
    });

    document.querySelectorAll("[data-etapa-indicador]").forEach(indicador => {
        indicador.classList.toggle("ativo", indicador.dataset.etapaIndicador === etapaAtual);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function irParaEtapaPagamento() {
    const camposObrigatorios = ["nome", "telefone"];
    if (tipoRecebimentoSelecionado === "ENTREGA") {
        camposObrigatorios.push("bairro-entrega", "endereco");
    }
    const camposInvalidos = camposObrigatorios
        .map(id => document.getElementById(id))
        .filter(campo => campo && !campo.checkValidity());

    if (camposInvalidos.length > 0) {
        camposInvalidos[0].reportValidity();
        return;
    }

    atualizarAvisoInicioEntregas();
    atualizarEtapaCheckout("pagamento");
}

function voltarParaEtapaDados() {
    atualizarEtapaCheckout("dados");
}

function atualizarAvisoInicioEntregas() {
    const aviso = document.getElementById("aviso-inicio-entregas");
    if (!aviso) return;
    if (tipoRecebimentoSelecionado === "RETIRADA") {
        aviso.hidden = true;
        return;
    }

    const agora = new Date();
    const minutosAtuais = (agora.getHours() * 60) + agora.getMinutes();
    const inicioEntregas = (11 * 60) + 30;
    aviso.hidden = minutosAtuais >= inicioEntregas;
}

// ==========================================
// 🚀 ENVIAR PEDIDO AO BACKEND
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

    if (diaSemana === 0 || minutosAtuais < (8 * 60) || minutosAtuais > (15 * 60)) {
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
    const isRetirada = tipoRecebimentoSelecionado === "RETIRADA";
    const bairroTextoPedido = isRetirada
        ? "Retirada no estabelecimento"
        : (selectBairro.options[selectBairro.selectedIndex]?.text || selectBairro.value);
    const subtotalDoPedido = itens.reduce((soma, item) => {
        const preco = Number(item.preco || item.valor || 0);
        const quantidade = Number(item.quantidade || item.qtd || 1);
        return soma + (preco * quantidade);
    }, 0);
    const taxaDoPedido = Number(taxaEntregaSelecionada || 0);
    const totalComTaxaGeral = subtotalDoPedido + taxaDoPedido;

    const nome = document.getElementById("nome").value;
    const contatoTelefone = document.getElementById("telefone").value.toString().trim(); // Garante formato de String limpa para o Java
    const enderecoRua = isRetirada ? "RETIRADA NO ESTABELECIMENTO" : document.getElementById("endereco").value;
    const ref = isRetirada ? "Não se aplica" : (document.getElementById("ponto-referencia").value || "Não informado");
    const observacao = document.getElementById("observacao").value.trim();
    const pagamento = document.getElementById("pagamento").value;

    if (pagamento === "Pix") {
        const confirmouFinalizacao = confirm(
            "⚠️ Atenção: o pagamento Pix não finaliza o pedido sozinho.\n\n" +
            "Depois de pagar pelo QR Code, você precisa confirmar agora para registrar o pedido e acompanhar o preparo.\n\n" +
            "Deseja continuar e finalizar o pedido?"
        );
        if (!confirmouFinalizacao) {
            return;
        }
    }

    const enderecoCompleto = isRetirada
        ? "RETIRADA NO ESTABELECIMENTO"
        : `${enderecoRua}, Bairro: ${bairroTextoPedido} (Ref: ${ref})`;
    // 4. Payload enviado ao backend
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
                pedidoIdGerado = pedidoSalvo.numeroPedido || pedidoSalvo.id;
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
        alert("Não foi possível registrar o pedido no sistema. Tente novamente.");
        return;
    }

    // 5. Limpa o carrinho e abre o acompanhamento
    localStorage.removeItem("carrinhoSaborCearense");
    window.location.href = `acompanhar.html?numero=${encodeURIComponent(pedidoIdGerado)}`;
}
