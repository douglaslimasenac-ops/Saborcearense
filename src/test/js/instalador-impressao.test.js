const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../main/resources/static/admin.js"), "utf8");

function criarPainel() {
    const status = { textContent: "" };
    const botao = { disabled: false };
    const estado = { baixou: false, removeu: false, revogou: false, alertas: [] };
    const documento = {
        getElementById(id) {
            return { "status-fila-impressao": status, "baixar-instalador-impressao": botao }[id] || null;
        },
        createElement() {
            return {
                click() { estado.baixou = true; estado.nome = this.download; },
                remove() { estado.removeu = true; }
            };
        },
        body: { appendChild() {} }
    };
    class UrlTeste extends URL {}
    UrlTeste.createObjectURL = () => "blob:instalador";
    UrlTeste.revokeObjectURL = () => { estado.revogou = true; };
    const contexto = vm.createContext({
        window: { location: { origin: "https://exemplo.test" }, addEventListener() {} },
        document: documento, localStorage: { getItem: () => null }, URL: UrlTeste,
        setTimeout: funcao => funcao(), console, alert: texto => estado.alertas.push(texto)
    });
    vm.runInContext(source, contexto);
    return { contexto, status, botao, estado };
}

test("informa se a fila está ativada e não confunde falha com fila desativada", async () => {
    const { contexto, status } = criarPainel();
    contexto.fetch = async () => ({ ok: true, json: async () => ({ habilitada: true }) });
    await contexto.carregarStatusFilaImpressao();
    assert.match(status.textContent, /ativada/);
    contexto.fetch = async () => ({ ok: true, json: async () => ({ habilitada: false }) });
    await contexto.carregarStatusFilaImpressao();
    assert.match(status.textContent, /desativada/);
    contexto.fetch = async () => ({ ok: false, status: 500 });
    await contexto.carregarStatusFilaImpressao();
    assert.match(status.textContent, /Não foi possível consultar/);
});

test("baixa o instalador e informa erros sem manter o botão bloqueado", async () => {
    const { contexto, botao, estado } = criarPainel();
    contexto.fetch = async (url, options) => {
        assert.match(url, /\/api\/admin\/impressao\/instalador$/);
        assert.equal(options.method, "POST");
        assert.equal(JSON.parse(options.body).site, "https://exemplo.test");
        return { ok: true, blob: async () => ({}) };
    };
    await contexto.baixarInstaladorImpressao();
    assert.equal(estado.nome, "sabor-cearense-impressao.zip");
    assert.equal(estado.baixou, true);
    assert.equal(estado.removeu, true);
    assert.equal(estado.revogou, true);
    assert.equal(botao.disabled, false);
    contexto.fetch = async () => ({ ok: false, status: 500 });
    await contexto.baixarInstaladorImpressao();
    assert.equal(estado.alertas.length, 1);
    assert.equal(botao.disabled, false);
});
