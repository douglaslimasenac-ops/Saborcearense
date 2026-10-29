const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../main/resources/static/admin.js"), "utf8");
const codigo = source.slice(source.indexOf("function configurarFormularioCadastro()"),
    source.indexOf("async function atualizarPrecoRapido("));

function criarAmbiente() {
    const campos = {};
    const alertas = [];
    const pedidos = [];
    let resolverUpload;
    const upload = new Promise(resolve => { resolverUpload = resolve; });
    const criarCampo = (valor = "") => ({
        value: valor,
        disabled: false,
        listeners: {},
        addEventListener(tipo, funcao) { this.listeners[tipo] = funcao; },
        removeAttribute() {},
        focus() {}
    });
    for (const id of ["imagem", "imagem-arquivo", "preview-imagem-prato", "preview-imagem-prato-img",
        "status-imagem-prato", "nome", "preco", "categoria", "diaSemana",
        "imagem-produto-1", "arquivo-produto-1", "salvar-imagem-produto-1", "status-imagem-produto-1"]) {
        campos[id] = criarCampo();
    }
    campos.nome.value = "Prato teste";
    campos.preco.value = "25";
    campos.categoria.value = "CARNE";
    const botao = criarCampo();
    campos["form-novo-prato"] = {
        querySelector: () => botao,
        reset() {}
    };
    class FormDataTeste {
        constructor() { this.valores = {}; }
        append(chave, valor) { this.valores[chave] = valor; }
    }
    const contexto = {
        document: { getElementById: id => campos[id] || null },
        URL,
        URL_BACKEND: "http://localhost",
        URL_API_ADMIN: "http://localhost/api/admin/pratos",
        CLOUDINARY_UPLOAD_PRESET: "teste",
        CLOUDINARY_UPLOAD_URL: "https://example.com/upload",
        FormData: FormDataTeste,
        fetch: (url, opcoes) => { pedidos.push({ url, opcoes }); return upload; },
        fetchAdmin: async (url, opcoes) => { pedidos.push({ url, opcoes }); return { ok: true }; },
        listaPratosLocal: [{ id: 1, nome: "Prato teste", categoria: "CARNE", preco: 25, disponivel: true }],
        alert: mensagem => alertas.push(mensagem),
        console: { error() {} }
    };
    vm.runInNewContext(codigo, contexto);
    contexto.carregarItensAdmin = async () => {};
    return { campos, botao, contexto, alertas, pedidos, resolverUpload };
}

test("aguarda upload antes de criar produto e envia a URL recebida", async () => {
    const { campos, botao, contexto, alertas, pedidos, resolverUpload } = criarAmbiente();
    contexto.configurarFormularioCadastro();
    campos["imagem-arquivo"].files = [{ type: "image/png", size: 100 }];
    const envio = campos["imagem-arquivo"].listeners.change();
    assert.equal(botao.disabled, true);
    assert.equal(campos.imagem.disabled, true);
    assert.equal(campos["status-imagem-prato"].textContent, "Enviando imagem...");
    await campos["form-novo-prato"].onsubmit({ preventDefault() {} });
    assert.equal(pedidos.length, 1);
    assert.match(alertas[0], /Aguarde/);
    resolverUpload({ ok: true, json: async () => ({ secure_url: "https://example.com/imagem.png" }) });
    await envio;
    assert.equal(botao.disabled, false);
    assert.equal(campos.imagem.value, "https://example.com/imagem.png");
    await campos["form-novo-prato"].onsubmit({ preventDefault() {} });
    assert.equal(JSON.parse(pedidos[1].opcoes.body).imagemUrl, "https://example.com/imagem.png");
});

test("produto existente aguarda upload e salva a imagem recebida", async () => {
    const { campos, contexto, pedidos, resolverUpload } = criarAmbiente();
    const envio = contexto.enviarImagemProdutoExistente(1, { type: "image/jpeg", size: 100 });
    assert.equal(campos["salvar-imagem-produto-1"].disabled, true);
    assert.equal(campos["imagem-produto-1"].disabled, true);
    resolverUpload({ ok: true, json: async () => ({ secure_url: "https://example.com/nova.jpg" }) });
    await envio;
    assert.equal(JSON.parse(pedidos[1].opcoes.body).imagemUrl, "https://example.com/nova.jpg");
    assert.equal(campos["salvar-imagem-produto-1"].disabled, false);
});

test("produto existente aceita imagem ilustrativa local ao salvar", async () => {
    const { campos, contexto, alertas, pedidos } = criarAmbiente();
    campos["imagem-produto-1"].value = "/imagens/cardapio/frango-grelhado.webp";
    await contexto.atualizarImagemRapido(1);
    assert.equal(alertas.length, 0);
    assert.equal(JSON.parse(pedidos[0].opcoes.body).imagemUrl, "/imagens/cardapio/frango-grelhado.webp");
});

test("produto novo aceita URL direta e impede URL inválida", async () => {
    const { campos, contexto, alertas, pedidos } = criarAmbiente();
    contexto.configurarFormularioCadastro();
    campos.imagem.value = "file:///imagem.png";
    await campos["form-novo-prato"].onsubmit({ preventDefault() {} });
    assert.match(alertas[0], /URL válida/);
    assert.equal(pedidos.length, 0);
    campos.imagem.value = "https://example.com/imagem.png";
    campos.imagem.listeners.input();
    assert.equal(campos["preview-imagem-prato-img"].src, campos.imagem.value);
    assert.equal(campos["preview-imagem-prato"].hidden, false);
    await campos["form-novo-prato"].onsubmit({ preventDefault() {} });
    assert.equal(JSON.parse(pedidos[0].opcoes.body).imagemUrl, "https://example.com/imagem.png");
});

test("falha no upload de produto novo libera o formulário e informa o erro", async () => {
    const { campos, botao, contexto, alertas, resolverUpload } = criarAmbiente();
    contexto.configurarFormularioCadastro();
    campos["imagem-arquivo"].files = [{ type: "image/png", size: 100 }];
    const envio = campos["imagem-arquivo"].listeners.change();
    resolverUpload({ ok: false, json: async () => ({ error: { message: "Upload recusado" } }) });
    await envio;
    assert.equal(alertas[0], "Upload recusado");
    assert.equal(botao.disabled, false);
    assert.equal(campos.imagem.disabled, false);
    assert.equal(campos["status-imagem-prato"].textContent, "");
});

test("falhas de upload e arquivos inválidos são informados sem salvar imagem", async () => {
    const { campos, contexto, alertas, pedidos, resolverUpload } = criarAmbiente();
    campos["imagem-produto-1"].value = "https://example.com/anterior.png";
    const envio = contexto.enviarImagemProdutoExistente(1, { type: "image/png", size: 100 });
    resolverUpload({ ok: false, json: async () => ({ error: { message: "Upload recusado" } }) });
    await envio;
    assert.equal(alertas[0], "Upload recusado");
    assert.equal(campos["imagem-produto-1"].value, "https://example.com/anterior.png");
    assert.equal(campos["arquivo-produto-1"].disabled, false);
    assert.equal(pedidos.length, 1);
    await assert.rejects(contexto.enviarImagemCloudinary({ type: "text/plain", size: 10 }), /imagem válido/);
    await assert.rejects(contexto.enviarImagemCloudinary({ type: "image/png", size: 10 * 1024 * 1024 + 1 }), /10 MB/);
    assert.equal(pedidos.length, 1);
});
