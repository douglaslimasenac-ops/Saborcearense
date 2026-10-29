const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../main/resources/static/admin.js"), "utf8");
const codigoImpressao = source.slice(source.indexOf("function formatarPrevisaoEntrega("));

function imprimirPedido(pedido) {
    function criarElemento() {
        return {
            children: [],
            style: {},
            appendChild(child) { this.children.push(child); },
            querySelector() { return criarElemento(); }
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
        numeroExibicaoPedido: () => 1,
        obterItensPedido: () => [],
        escaparHtml: texto => texto,
        setTimeout() {}
    };
    vm.runInNewContext(codigoImpressao, contexto);
    contexto.imprimirCupomIFood(pedido);
    return body.children[0].children.find(elemento =>
        elemento.children.some(filho => filho.textContent === "Previsão de entrega")
    );
}

test("comanda de entrega exibe somente os horários abaixo do título", () => {
    const previsao = imprimirPedido({
        endereco: "Rua A",
        previsaoEntregaInicio: "2026-10-29T12:10:00",
        previsaoEntregaFim: "2026-10-29T12:20:00"
    });
    assert.match(previsao.className, /\btext-center\b/);
    assert.deepEqual(previsao.children.map(elemento => elemento.textContent),
        ["Previsão de entrega", "12:10 às 12:20"]);
});

test("comanda mantém horários de dias diferentes e sinaliza previsão ausente", () => {
    const previsao = imprimirPedido({
        endereco: "Rua A",
        previsaoEntregaInicio: "2026-10-29T23:55:00",
        previsaoEntregaFim: "2026-10-30T00:05:00"
    });
    assert.equal(previsao.children[1].textContent, "23:55 às 00:05");
    assert.equal(imprimirPedido({ endereco: "Rua A" }).children[1].textContent, "Não disponível");
});

test("comanda de retirada não exibe previsão de entrega", () => {
    assert.equal(imprimirPedido({ endereco: "RETIRADA NO ESTABELECIMENTO" }), undefined);
});
