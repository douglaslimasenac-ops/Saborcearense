const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { ordenarItensPorCategoria } = require("../../main/resources/static/ordenar-itens.js");

const source = fs.readFileSync(path.join(__dirname, "../../main/resources/static/admin.js"), "utf8");
const codigoImpressao = source.slice(source.indexOf("function formatarPrevisaoEntrega("));
const helpers = source.slice(source.indexOf("function escaparHtml("), source.indexOf("function renderizarItensPedido("))
    + source.slice(source.indexOf("function calcularTotalItensPedido("), source.indexOf("function textoStatusPedido("))
    + source.slice(source.indexOf("function textoTrocoPedido("), source.indexOf("function atualizarResumoFinanceiro("));

function imprimirPedido(pedido, renderizacaoDireta = false, retornarDocumento = false) {
    function criarElemento() {
        return {
            children: [],
            style: {},
            appendChild(child) { this.children.push(child); },
            querySelector() {
                if (!this.tbody) this.tbody = criarElemento();
                return this.tbody;
            }
        };
    }

    const body = criarElemento();
    const janela = {
        document: {
            body,
            head: criarElemento(),
            createElement: criarElemento,
            write() {},
            close() {}
        },
        print() {}
    };
    const contexto = {
        window: { screen: { width: 1024, height: 768 }, open: () => janela },
        document: { getElementById: () => null },
        listaPratosLocal: [{ id: 1, categoria: "FRANGO" }, { id: 2, categoria: "BEBIDA" }],
        ordenarItensPorCategoria,
        console,
        Date: class extends Date {
            constructor() { super("2026-10-29T12:00:00"); }
        },
        setTimeout() {}
    };
    vm.runInNewContext(helpers, contexto);
    vm.runInNewContext(codigoImpressao, contexto);
    if (renderizacaoDireta) {
        contexto.renderizarCupomIFood(pedido, janela);
    } else {
        contexto.imprimirCupomIFood(pedido);
    }
    return retornarDocumento ? janela.document : body.children[0].children;
}

test("renderizador compartilhado mantém o conteúdo e o estilo da impressão manual", () => {
    const pedido = {
        id: 123,
        endereco: "Rua das Flores, 123, Bairro: Centro (Ref: Mercado)",
        clienteNome: "Maria",
        telefone: "123",
        formaPagamento: "Cartão",
        valorTotal: 30,
        itens: JSON.stringify([{ id: 2, nome: "Bebida", quantidade: 1, preco: 5 },
            { id: 1, nome: "Prato", quantidade: 2, preco: 12.5 }]),
        trocoPara: 50,
        observacao: "Sem cebola",
        previsaoEntregaInicio: "2026-10-29T12:10:00",
        previsaoEntregaFim: "2026-10-29T12:20:00"
    };
    const direto = imprimirPedido(pedido, true, true);
    const manual = imprimirPedido(pedido, false, true);
    assert.equal(JSON.stringify(direto.body), JSON.stringify(manual.body));
    assert.equal(JSON.stringify(direto.head), JSON.stringify(manual.head));
    assert.match(direto.head.children[0].textContent, /@page \{ size: 80mm auto; margin: 0; \}/);
    const tabela = direto.body.children[0].children.find(elemento => elemento.className === "tabela-itens");
    assert.match(tabela.tbody.children[0].innerHTML, /PRATO/);
    assert.match(tabela.tbody.children[1].innerHTML, /BEBIDA/);
    const financeiro = direto.body.children[0].children.find(elemento => (elemento.innerHTML || "").includes("Forma Pagto."));
    assert.match(financeiro.innerHTML, /Troco para R\$ 50,00 \(troco: R\$ 20,00\)/);
});

function previsaoPedido(pedido) {
    return imprimirPedido(pedido).find(elemento =>
        elemento.children.some(filho => filho.textContent === "Previsão de entrega")
    );
}

test("comanda de entrega exibe somente os horários abaixo do título", () => {
    const previsao = previsaoPedido({
        endereco: "Rua A",
        previsaoEntregaInicio: "2026-10-29T12:10:00",
        previsaoEntregaFim: "2026-10-29T12:20:00"
    });
    assert.match(previsao.className, /\btext-center\b/);
    assert.deepEqual(previsao.children.map(elemento => elemento.textContent),
        ["Previsão de entrega", "12:10 às 12:20"]);
});

test("comanda mantém horários de dias diferentes e sinaliza previsão ausente", () => {
    const previsao = previsaoPedido({
        endereco: "Rua A",
        previsaoEntregaInicio: "2026-10-29T23:55:00",
        previsaoEntregaFim: "2026-10-30T00:05:00"
    });
    assert.equal(previsao.children[1].textContent, "23:55 às 00:05");
    assert.equal(previsaoPedido({ endereco: "Rua A" }).children[1].textContent, "Não disponível");
});

test("comanda de retirada não exibe previsão de entrega", () => {
    assert.equal(previsaoPedido({ endereco: "RETIRADA NO ESTABELECIMENTO" }), undefined);
});

test("comanda de entrega imprime endereço na mesma linha e mantém bairro e referência", () => {
    const blocos = imprimirPedido({ endereco: "Rua das Flores, 123, Bairro: Tijuca (Ref: Mercado)" });
    const endereco = blocos.find(elemento => (elemento.innerHTML || "").includes("Endereço:"));
    assert.match(endereco.innerHTML, /Endereço:<\/span> Rua das Flores/);
    assert.match(endereco.innerHTML, /<div>123<\/div>/);
    assert.match(endereco.innerHTML, /<div>Bairro: Tijuca<\/div>/);
    assert.match(endereco.innerHTML, /Referência:<\/span> Mercado/);
});

test("comanda identifica o cliente com dois-pontos", () => {
    const blocos = imprimirPedido({ endereco: "Rua A", clienteNome: "Maria" });
    const cliente = blocos.find(elemento => (elemento.innerHTML || "").includes("Cliente:"));
    assert.match(cliente.innerHTML, /Cliente:<\/div>/);
    assert.match(cliente.innerHTML, /MARIA/);
});

test("comanda de retirada mantém identificação do local", () => {
    const blocos = imprimirPedido({ endereco: "RETIRADA NO ESTABELECIMENTO" });
    const endereco = blocos.find(elemento => (elemento.innerHTML || "").includes("Local de Retirada"));
    assert.match(endereco.innerHTML, /RETIRADA NO ESTABELECIMENTO/);
    assert.doesNotMatch(endereco.innerHTML, /Endereço:/);
});
