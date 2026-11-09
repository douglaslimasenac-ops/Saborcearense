const CACHE_OFFLINE_ADMIN = "sabor-admin-offline-v1";
const PAGINA_OFFLINE_ADMIN = "/admin-offline.html";

self.addEventListener("install", evento => {
    evento.waitUntil(caches.open(CACHE_OFFLINE_ADMIN).then(cache => cache.add(PAGINA_OFFLINE_ADMIN)));
});

self.addEventListener("activate", evento => {
    evento.waitUntil(caches.keys().then(chaves => Promise.all(
        chaves.filter(chave => chave.startsWith("sabor-admin-offline-") && chave !== CACHE_OFFLINE_ADMIN)
            .map(chave => caches.delete(chave))
    )));
});

self.addEventListener("fetch", evento => {
    const url = new URL(evento.request.url);
    if (evento.request.mode !== "navigate" || url.origin !== self.location.origin || url.pathname !== "/admin.html") return;
    evento.respondWith(fetch(evento.request).catch(async () => {
        const pagina = await caches.match(PAGINA_OFFLINE_ADMIN);
        if (!pagina) throw new Error("Página de conexão indisponível no cache.");
        return pagina;
    }));
});
