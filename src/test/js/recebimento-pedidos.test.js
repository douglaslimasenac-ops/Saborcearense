const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../main/resources/static/admin.js"), "utf8");

function criarPainel() {
    const elementos = {
        "filtro-ativos-busca": { value: "" },
        "aviso-filtro-pedidos": { hidden: true, textContent: "" },
        "aviso-novo-pedido": { hidden: true },
        "texto-aviso-novo-pedido": { textContent: "" },
        "erro-pedidos-ativos": { hidden: true, textContent: "" },
        "lista-pedidos-ativos": {}
    };
    class Socket {
        constructor() { Socket.instancia = this; }
    }
    const contexto = vm.createContext({
        window: { location: { origin: "http://localhost:8080" }, addEventListener() {} },
        document: { getElementById: id => elementos[id] || null },
        localStorage: { getItem: () => null },
        URL, WebSocket: Socket, console, setTimeout, clearInterval,
        ordenarItensPorCategoria: itens => itens
    });
    vm.runInContext(source, contexto);
    vm.runInContext(`
        let renderizados = [];
        let alertas = 0;
        atualizarListaPedidos = (_, pedidos) => { renderizados = pedidos; };
        atualizarContagemPedidos = () => {};
        atualizarResumoFinanceiro = () => {};
        renderizarHistoricoFiltrado = () => {};
        tocarSomNovoPedido = () => { alertas++; };
        carregarChatsAdmin = () => {};
    `, contexto);
    return { contexto, elementos, Socket };
}

function resposta(dados, status = 200) {
    return { ok: status === 200, status, json: async () => dados };
}

const pedido = {
    id: 1, numeroPedido: 4567, status: "RECEBIDO", clienteNome: "Cliente",
    telefone: "000", endereco: "Rua A", valorTotal: 25, itens: "[]"
};

test("notificação exibe pedido imediatamente e não perde atualização durante consulta anterior", async () => {
    const { contexto, elementos, Socket } = criarPainel();
    let resolverPrimeiraConsulta;
    let consultasAtivos = 0;
    contexto.fetch = url => {
        if (url.endsWith("/ativos")) {
            consultasAtivos++;
            if (consultasAtivos === 1) {
                return new Promise(resolve => { resolverPrimeiraConsulta = resolve; });
            }
            return Promise.resolve(resposta([pedido]));
        }
        return Promise.resolve(resposta([pedido]));
    };
    contexto.conectarWebSocketAdmin();
    const primeiraConsulta = contexto.carregarPedidosAtivos();
    Socket.instancia.onmessage({ data: JSON.stringify(pedido) });
    assert.equal(vm.runInContext("renderizados[0].numeroPedido", contexto), 4567);
    assert.equal(vm.runInContext("alertas", contexto), 1);
    assert.equal(elementos["aviso-novo-pedido"].hidden, false);
    assert.match(elementos["texto-aviso-novo-pedido"].textContent, /4567/);
    resolverPrimeiraConsulta(resposta([]));
    await primeiraConsulta;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(consultasAtivos, 2);
    assert.equal(vm.runInContext("renderizados[0].numeroPedido", contexto), 4567);
    Socket.instancia.onmessage({ data: JSON.stringify(pedido) });
    assert.equal(vm.runInContext("alertas", contexto), 1);
});

test("aviso permite abrir pedidos e limpar busca; alterações de dados mudam o snapshot", () => {
    const { contexto, elementos } = criarPainel();
    vm.runInContext("alternarAbasAdmin = aba => { abaAberta = aba; }; let abaAberta = '';", contexto);
    elementos["filtro-ativos-busca"].value = "busca anterior";
    contexto.avisarNovoPedido(pedido);
    contexto.verNovosPedidos();
    assert.equal(elementos["filtro-ativos-busca"].value, "");
    assert.equal(elementos["aviso-novo-pedido"].hidden, true);
    assert.equal(vm.runInContext("abaAberta", contexto), "ativos");
    assert.notEqual(contexto.serializarPedidos([pedido]),
        contexto.serializarPedidos([{ ...pedido, observacao: "Sem cebola" }]));
});

test("informa quando a busca oculta pedidos e quando o servidor falha", async () => {
    const { contexto, elementos } = criarPainel();
    contexto.fetch = async () => resposta({}, 500);
    contexto.pedidoTeste = pedido;
    vm.runInContext('pedidosAtivosLocal = [pedidoTeste];', contexto);
    elementos["filtro-ativos-busca"].value = "outra pessoa";
    contexto.renderizarAtivosFiltrados();
    assert.equal(elementos["aviso-filtro-pedidos"].hidden, false);
    assert.match(elementos["aviso-filtro-pedidos"].textContent, /1 pedido/);
    await contexto.carregarPedidosAtivos();
    assert.equal(elementos["erro-pedidos-ativos"].hidden, false);
    assert.match(elementos["erro-pedidos-ativos"].textContent, /Não foi possível atualizar/);
    assert.equal(vm.runInContext("pedidosAtivosLocal.length", contexto), 1);
    contexto.fetch = async () => resposta([pedido]);
    await contexto.carregarPedidosAtivos();
    assert.equal(elementos["erro-pedidos-ativos"].hidden, true);
});
