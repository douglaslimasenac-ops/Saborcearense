const test = require("node:test");
const assert = require("node:assert/strict");
const { obterCategoriaItem, ordenarItensPorCategoria } = require("../../main/resources/static/ordenar-itens.js");

test("ordena refeições, bebidas e sobremesas preservando a ordem dentro de cada grupo", () => {
    const itens = [
        { nome: "Pudim", categoria: "SOBREMESA" },
        { nome: "Suco", categoria: "BEBIDA" },
        { nome: "Frango", categoria: "FRANGO" },
        { nome: "Bolo", categoria: "SOBREMESAS" },
        { nome: "Carne", categoria: "CARNE" },
        { nome: "Água", categoria: "BEBIDAS" },
        { nome: "Sem categoria" }
    ];
    assert.deepEqual(ordenarItensPorCategoria(itens).map(item => item.nome),
        ["Frango", "Carne", "Suco", "Água", "Pudim", "Bolo", "Sem categoria"]);
    assert.equal(itens[0].nome, "Pudim");
});

test("recupera categoria de itens antigos pelo id sem substituir a categoria registrada", () => {
    const catalogo = [
        { id: 1, categoria: "BEBIDA" },
        { id: 2, categoria: "FRANGO" }
    ];
    assert.equal(obterCategoriaItem({ id: "2-fri" }, catalogo), "FRANGO");
    assert.equal(obterCategoriaItem({ id: "1", categoria: "SOBREMESA" }, catalogo), "SOBREMESA");
    assert.equal(obterCategoriaItem({ id: "999" }, catalogo), "");
    const entradas = [["1", { id: 1 }], ["2-fri", { id: "2-fri" }]];
    assert.deepEqual(ordenarItensPorCategoria(entradas, catalogo, entrada => entrada[1]).map(entrada => entrada[0]),
        ["2-fri", "1"]);
});
