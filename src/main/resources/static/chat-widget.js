(() => {
    const pedidoKey = "ultimoPedidoIdSaborCearense";
    const urlBackend = window.location.origin;
    let numeroPedido;
    let aberto = false;

    function escapar(texto) {
        return String(texto).replace(/[&<>"']/g, caractere => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
        }[caractere]));
    }

    function criarWidget() {
        if (document.getElementById("chat-widget-site")) return;
        const estilo = document.createElement("style");
        estilo.textContent = `
            #chat-widget-site{position:fixed;right:20px;bottom:20px;z-index:1000;font-family:inherit}
            #chat-widget-site .chat-widget-janela{box-sizing:border-box;display:none;width:min(360px,calc(100vw - 32px));margin-bottom:10px;padding:14px;background:#fff;border:1px solid #eadbc5;border-radius:18px;box-shadow:0 18px 45px rgba(47,41,34,.2)}
            #chat-widget-site.aberto .chat-widget-janela{display:block}
            #chat-widget-site .chat-widget-botao{border:0;border-radius:999px;padding:13px 18px;background:linear-gradient(135deg,#237a4b,#2f9a62);color:#fff;font-weight:800;box-shadow:0 10px 24px rgba(35,122,75,.28);cursor:pointer}
            #chat-widget-site.aberto .chat-widget-botao{background:#8a5316}
            #chat-widget-site .chat-widget-cabecalho{display:flex;justify-content:space-between;align-items:center;color:#6b461e;font-weight:800}
            #chat-widget-site .chat-widget-fechar{border:0;background:transparent;color:#806b51;font-size:1.2rem;cursor:pointer}
            #chat-widget-site .chat-widget-mensagens{height:210px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:4px}
            #chat-widget-site .chat-widget-form{display:flex;gap:8px;margin-top:12px}
            #chat-widget-site .chat-widget-form input{min-width:0;flex:1;padding:10px;border:1px solid #eadbc5;border-radius:10px}
            #chat-widget-site .chat-widget-form button{border:0;border-radius:999px;padding:0 14px;background:#d99024;color:#fff;font-weight:800;cursor:pointer}
            @media(max-width:520px){#chat-widget-site{right:12px;bottom:12px}#chat-widget-site .chat-widget-janela{width:calc(100vw - 24px)}}
        `;
        document.head.appendChild(estilo);
        const widget = document.createElement("div");
        widget.id = "chat-widget-site";
        widget.innerHTML = `
            <div class="chat-widget-janela">
                <div class="chat-widget-cabecalho"><span>💬 Falar com o restaurante</span><button class="chat-widget-fechar" type="button" aria-label="Fechar chat">×</button></div>
                <small style="display:block;color:#806b51;margin:6px 0 10px">Pedido <span class="chat-widget-numero"></span></small>
                <div class="chat-widget-mensagens"><small style="color:#806b51">Carregando conversa...</small></div>
                <div class="chat-widget-form"><input type="text" maxlength="1000" placeholder="Digite sua mensagem..."><button type="button">Enviar</button></div>
            </div>
            <button class="chat-widget-botao" type="button">💬 Chat</button>
        `;
        document.body.appendChild(widget);
        widget.querySelector(".chat-widget-botao").addEventListener("click", () => {
            aberto = !aberto;
            widget.classList.toggle("aberto", aberto);
            if (aberto) carregarMensagens(widget);
        });
        widget.querySelector(".chat-widget-fechar").addEventListener("click", () => {
            aberto = false;
            widget.classList.remove("aberto");
        });
        widget.querySelector(".chat-widget-form button").addEventListener("click", () => enviarMensagem(widget));
        widget.querySelector(".chat-widget-form input").addEventListener("keydown", evento => {
            if (evento.key === "Enter") enviarMensagem(widget);
        });
        widget._timer = setInterval(() => {
            if (aberto) carregarMensagens(widget);
        }, 5000);
        return widget;
    }

    async function carregarMensagens(widget) {
        if (!numeroPedido) return;
        const lista = widget.querySelector(".chat-widget-mensagens");
        try {
            const resposta = await fetch(`${urlBackend}/api/chat/${encodeURIComponent(numeroPedido)}`);
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            const mensagens = await resposta.json();
            lista.innerHTML = mensagens.length ? mensagens.map(mensagem => `
                <div style="align-self:${mensagem.remetente === "CLIENTE" ? "flex-end" : "flex-start"};max-width:88%;padding:8px 10px;border-radius:10px;background:${mensagem.remetente === "CLIENTE" ? "#f7e7c7" : "#edf2f7"};color:#2f2922">
                    <strong style="font-size:.75rem">${mensagem.remetente === "CLIENTE" ? "Você" : "Restaurante"}</strong><div>${escapar(mensagem.mensagem)}</div>
                </div>`).join("") : "<small style='color:#806b51'>Ainda não há mensagens. Envie uma dúvida.</small>";
            lista.scrollTop = lista.scrollHeight;
        } catch (erro) {
            console.error("Erro ao carregar chat:", erro);
        }
    }

    async function enviarMensagem(widget) {
        const campo = widget.querySelector(".chat-widget-form input");
        const mensagem = campo.value.trim();
        if (!mensagem || !numeroPedido) return;
        try {
            const resposta = await fetch(`${urlBackend}/api/chat/${encodeURIComponent(numeroPedido)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({ mensagem })
            });
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            campo.value = "";
            await carregarMensagens(widget);
        } catch (erro) {
            console.error("Erro ao enviar mensagem:", erro);
            alert("Não foi possível enviar a mensagem.");
        }
    }

    function atualizarVisibilidade(widget) {
        const novoNumero = localStorage.getItem(pedidoKey);
        if (novoNumero === numeroPedido) return;
        numeroPedido = novoNumero;
        widget.style.display = numeroPedido ? "block" : "none";
        const numero = widget.querySelector(".chat-widget-numero");
        if (numero) numero.textContent = numeroPedido ? `#${numeroPedido}` : "";
    }

    document.addEventListener("DOMContentLoaded", () => {
        const widget = criarWidget();
        atualizarVisibilidade(widget);
        setInterval(() => atualizarVisibilidade(widget), 1000);
    });
})();
