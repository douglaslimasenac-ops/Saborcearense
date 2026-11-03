const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "../../main/resources/static/acompanhar.html"), "utf8");
const source = html.slice(html.indexOf("    // 1. Definição da URL"), html.lastIndexOf("</script>"));

function criarPagina(search) {
    const elementos = new Map();
    function elemento(id) {
        if (!elementos.has(id)) {
            elementos.set(id, {
                value: "", innerText: "", textContent: "", style: {}, innerHTML: "",
                classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
                querySelector() { return null; },
                scrollIntoView() {}
            });
        }
        return elementos.get(id);
    }
    const storage = new Map();
    const contexto = vm.createContext({
        window: {
            location: { origin: "http://localhost:8080", search, href: `http://localhost:8080/acompanhar.html${search}` },
            history: { replaceState: (_, __, url) => { contexto.window.location.href = String(url); } }
        },
        document: {
            getElementById: id => id === "txt-index-status" ? null : elemento(id),
            querySelector: () => null,
            createElement: () => elemento("style"),
            addEventListener() {},
            head: { appendChild() {} },
            body: { classList: { add() {}, remove() {} } }
        },
        localStorage: {
            getItem: chave => storage.get(chave) || null,
            setItem: (chave, valor) => storage.set(chave, String(valor)),
            removeItem: chave => storage.delete(chave)
        },
        URL, URLSearchParams, console, setTimeout, setInterval: () => 1,
        ordenarItensPorCategoria: itens => itens,
        alert() {}
    });
    vm.runInContext(source, contexto);
    return { contexto, elemento, storage };
}

function resposta(pedido, status = 200) {
    return { ok: status === 200, status, json: async () => pedido };
}

const pedido = {
    id: 1, numeroPedido: 4567, status: "RECEBIDO", endereco: "RETIRADA",
    formaPagamento: "Pix", valorTotal: 25, itens: "[]"
};

test("link legado é convertido para número público e novas buscas usam número", async () => {
    const { contexto, elemento, storage } = criarPagina("?id=1");
    const urls = [];
    contexto.fetch = async url => {
        urls.push(url);
        return resposta(url.endsWith("/9999") ? { ...pedido, numeroPedido: 9999 } : pedido);
    };
    await contexto.consultarStatus();
    assert.match(urls[0], /\/api\/pedidos\/1$/);
    assert.equal(storage.get("ultimoPedidoIdSaborCearense"), "4567");
    assert.equal(elemento("txt-pedido-id").innerText, "#4567");
    assert.match(contexto.window.location.href, /\?numero=4567$/);
    elemento("input-busca-id").value = "9999";
    contexto.buscarNovoPedido();
    await new Promise(resolve => setImmediate(resolve));
    assert.match(urls[1], /\/api\/pedidos\/numero\/9999$/);
    assert.match(contexto.window.location.href, /\?numero=9999$/);
});

test("pedido não encontrado limpa o anterior sem substituir o último número válido", async () => {
    const { contexto, elemento, storage } = criarPagina("?numero=4567");
    contexto.fetch = async url => url.endsWith("/4567") ? resposta(pedido) : resposta({}, 404);
    await contexto.consultarStatus();
    elemento("input-busca-id").value = "9999";
    contexto.buscarNovoPedido();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(elemento("txt-status-nome").innerText, "Pedido não localizado no sistema.");
    assert.equal(elemento("estado-conexao").textContent, "Pedido não encontrado.");
    assert.equal(storage.get("ultimoPedidoIdSaborCearense"), "4567");
});

test("resposta atrasada de uma busca anterior não substitui o pedido atual", async () => {
    const { contexto, elemento } = criarPagina("?numero=4567");
    let resolverAnterior;
    contexto.fetch = url => url.endsWith("/4567")
        ? new Promise(resolve => { resolverAnterior = resolve; })
        : Promise.resolve(resposta({ ...pedido, numeroPedido: 9999, status: "PREPARO" }));
    const consultaAnterior = contexto.consultarStatus();
    elemento("input-busca-id").value = "9999";
    contexto.buscarNovoPedido();
    await new Promise(resolve => setImmediate(resolve));
    resolverAnterior(resposta(pedido));
    await consultaAnterior;
    assert.equal(elemento("txt-pedido-id").innerText, "#9999");
    assert.match(elemento("txt-status-nome").innerText, /preparando/);
});

test("erros HTTP de acompanhamento são informados ao cliente", async () => {
    const { contexto, elemento } = criarPagina("?numero=4567");
    contexto.fetch = async () => resposta({}, 500);
    await contexto.consultarStatus();
    assert.equal(elemento("txt-status-nome").innerText, "Não foi possível consultar o pedido.");
    assert.match(elemento("estado-conexao").textContent, /Não foi possível atualizar/);
});
