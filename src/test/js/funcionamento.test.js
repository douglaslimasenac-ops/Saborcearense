const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function ler(nome) {
    return fs.readFileSync(path.join(__dirname, "../../main/resources/static", nome), "utf8");
}

test("cardápio bloqueia e libera os controles conforme o funcionamento manual", async () => {
    const codigo = ler("index.js");
    const trecho = codigo.slice(codigo.indexOf("async function verificarHorarioFuncionamento()"),
        codigo.indexOf("function irParaCheckout()", codigo.indexOf("async function verificarHorarioFuncionamento()")));
    const quantidade = { style: {} };
    const avancar = {};
    const statusLoja = {};
    let status = { aberto: false, modo: "MANUAL" };
    const contexto = {
        URL_BACKEND: "",
        estabelecimentoAberto: false,
        localStorage: { getItem: () => "token-admin" },
        document: {
            getElementById: () => statusLoja,
            querySelectorAll: seletor => seletor === ".btn-qtd" ? [quantidade] : [avancar]
        },
        fetch: async () => ({ ok: true, json: async () => status }),
        console
    };
    vm.runInNewContext(trecho, contexto);
    await contexto.verificarHorarioFuncionamento();
    assert.equal(quantidade.disabled, true);
    assert.equal(avancar.disabled, true);
    assert.match(statusLoja.innerHTML, /FECHADO/);
    status = { aberto: true, modo: "MANUAL" };
    await contexto.verificarHorarioFuncionamento();
    assert.equal(quantidade.disabled, false);
    assert.equal(avancar.disabled, false);
    assert.match(statusLoja.innerHTML, /ABERTO/);
});

test("painel consulta status e envia mudança autenticada", async () => {
    const codigo = ler("admin.js");
    const trecho = codigo.slice(codigo.indexOf("let funcionamentoAdmin = null;"),
        codigo.indexOf("async function fetchAdmin("));
    const campos = {
        "status-funcionamento-admin": {},
        "botao-funcionamento-admin": {}
    };
    let requisicao;
    const contexto = {
        URL_BACKEND: "",
        document: { getElementById: id => campos[id] },
        fetch: async () => ({ ok: true, json: async () => ({ aberto: true, modo: "AUTOMATICO" }) }),
        fetchAdmin: async (url, opcoes) => {
            requisicao = { url, opcoes };
            return { ok: true, json: async () => ({ aberto: false, modo: "MANUAL" }) };
        },
        confirm: () => true,
        console
    };
    vm.runInNewContext(trecho, contexto);
    await contexto.carregarFuncionamentoAdmin();
    assert.equal(campos["botao-funcionamento-admin"].textContent, "Fechar restaurante");
    await contexto.alternarFuncionamentoAdmin();
    assert.equal(requisicao.url, "/api/admin/funcionamento");
    assert.equal(JSON.parse(requisicao.opcoes.body).aberto, false);
    assert.equal(campos["botao-funcionamento-admin"].textContent, "Abrir restaurante");
    assert.match(campos["status-funcionamento-admin"].textContent, /Fechado/);
});

test("checkout impede envio quando o restaurante é fechado manualmente", async () => {
    const codigo = ler("carrinho.js");
    const trecho = codigo.slice(codigo.indexOf("async function enviarPedido(e)"));
    const alertas = [];
    const urls = [];
    const contexto = {
        URL_API_BACKEND: "",
        preparacaoCategoriasCarrinho: Promise.resolve(),
        localStorage: { getItem: () => "token-admin" },
        fetch: async url => {
            urls.push(url);
            return { ok: true, json: async () => ({ aberto: false, modo: "MANUAL" }) };
        },
        alert: mensagem => alertas.push(mensagem),
        console
    };
    vm.runInNewContext(trecho, contexto);
    await contexto.enviarPedido();
    assert.deepEqual(urls, ["/api/funcionamento"]);
    assert.match(alertas[0], /fechado/);
});
