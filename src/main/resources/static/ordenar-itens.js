(function (global) {
    function obterCategoriaItem(item, catalogo = []) {
        if (!item || typeof item !== "object") return "";
        const categoria = String(item.categoria || "").trim().toUpperCase();
        if (categoria) return categoria;
        if (item.id == null) return "";
        const id = String(item.id).split("-")[0];
        const produto = catalogo.find(entrada => String(entrada.id) === id);
        return String(produto?.categoria || "").trim().toUpperCase();
    }

    function ordemCategoria(item, catalogo) {
        const categoria = obterCategoriaItem(item, catalogo);
        if (["PRATOS_DO_DIA", "FRANGO", "CARNE", "OUTROS"].includes(categoria)) return 0;
        if (["BEBIDA", "BEBIDAS"].includes(categoria)) return 1;
        if (["SOBREMESA", "SOBREMESAS"].includes(categoria)) return 2;
        return 3;
    }

    function ordenarItensPorCategoria(itens, catalogo = [], selecionar = item => item) {
        return itens.map((item, indice) => ({ item, indice, ordem: ordemCategoria(selecionar(item), catalogo) }))
            .sort((a, b) => a.ordem - b.ordem || a.indice - b.indice)
            .map(entrada => entrada.item);
    }

    global.obterCategoriaItem = obterCategoriaItem;
    global.ordenarItensPorCategoria = ordenarItensPorCategoria;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = { obterCategoriaItem, ordenarItensPorCategoria };
    }
})(globalThis);
