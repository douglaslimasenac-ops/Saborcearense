const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const raiz = path.join(__dirname, "../../main/resources/static");
const script = fs.readFileSync(path.join(raiz, "pwa-admin.js"), "utf8");
const worker = fs.readFileSync(path.join(raiz, "admin-sw.js"), "utf8");

test("manifesto aponta para o painel e ícones PNG com dimensões declaradas", () => {
    const manifesto = JSON.parse(fs.readFileSync(path.join(raiz, "admin-manifest.json"), "utf8"));
    assert.equal(manifesto.start_url, "/admin.html");
    assert.equal(manifesto.display, "standalone");
    for (const icone of manifesto.icons) {
        const bytes = fs.readFileSync(path.join(raiz, icone.src.slice(1)));
        assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
        const [largura, altura] = icone.sizes.split("x").map(Number);
        assert.equal(bytes.readUInt32BE(16), largura);
        assert.equal(bytes.readUInt32BE(20), altura);
    }
    assert.ok(manifesto.icons.some(icone => icone.purpose === "maskable"));
});

test("oferece instalação apenas quando disponível e sinaliza perda de conexão", async () => {
    const eventos = {};
    const botoes = [0, 1].map(() => ({
        hidden: true,
        addEventListener(tipo, funcao) { this[tipo] = funcao; }
    }));
    const aviso = { hidden: true };
    const navigator = {
        onLine: true,
        serviceWorker: { register: async url => { assert.equal(url, "admin-sw.js"); } }
    };
    const contexto = vm.createContext({
        document: {
            querySelectorAll: () => botoes,
            getElementById: () => aviso
        },
        window: { addEventListener: (tipo, funcao) => { eventos[tipo] = funcao; } },
        navigator, console, alert: () => { throw new Error("alerta inesperado"); }
    });
    vm.runInContext(script, contexto);
    assert.ok(botoes.every(botao => botao.hidden));
    navigator.onLine = false;
    eventos.offline();
    assert.equal(aviso.hidden, false);
    navigator.onLine = true;
    eventos.online();
    assert.equal(aviso.hidden, true);

    let solicitado = false;
    let cancelado = false;
    eventos.beforeinstallprompt({
        preventDefault() { cancelado = true; },
        async prompt() { solicitado = true; },
        userChoice: Promise.resolve({ outcome: "accepted" })
    });
    assert.equal(cancelado, true);
    assert.ok(botoes.every(botao => !botao.hidden));
    await botoes[0].click();
    assert.equal(solicitado, true);
    assert.ok(botoes.every(botao => botao.hidden));
    eventos.appinstalled();
    assert.ok(botoes.every(botao => botao.hidden));
});

test("service worker só oferece página offline para navegação do painel, nunca para APIs", async () => {
    const eventos = {};
    const pagina = { offline: true };
    const contexto = vm.createContext({
        self: {
            location: { origin: "https://exemplo.test" },
            addEventListener: (tipo, funcao) => { eventos[tipo] = funcao; }
        },
        caches: { match: async () => pagina },
        fetch: async () => { throw new Error("sem rede"); },
        URL
    });
    vm.runInContext(worker, contexto);
    let resposta;
    eventos.fetch({
        request: { mode: "navigate", url: "https://exemplo.test/admin.html" },
        respondWith(valor) { resposta = valor; }
    });
    assert.equal(await resposta, pagina);
    for (const request of [
        { mode: "cors", url: "https://exemplo.test/api/pedidos" },
        { mode: "navigate", url: "https://exemplo.test/index.html" },
        { mode: "navigate", url: "https://outro.test/admin.html" }
    ]) {
        eventos.fetch({ request, respondWith() { throw new Error("Requisição indevidamente interceptada"); } });
    }
});
