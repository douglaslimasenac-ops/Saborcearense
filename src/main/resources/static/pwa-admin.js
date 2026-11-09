(function () {
    const botoes = document.querySelectorAll(".instalar-admin");
    const avisoConexao = document.getElementById("aviso-conexao-admin");
    let instalacaoPendente = null;

    function atualizarConexao() {
        if (avisoConexao) avisoConexao.hidden = navigator.onLine;
    }

    function mostrarBotoes(mostrar) {
        botoes.forEach(botao => { botao.hidden = !mostrar; });
    }

    window.addEventListener("online", atualizarConexao);
    window.addEventListener("offline", atualizarConexao);
    atualizarConexao();

    window.addEventListener("beforeinstallprompt", evento => {
        evento.preventDefault();
        instalacaoPendente = evento;
        mostrarBotoes(true);
    });

    botoes.forEach(botao => botao.addEventListener("click", async () => {
        if (!instalacaoPendente) return;
        const evento = instalacaoPendente;
        instalacaoPendente = null;
        mostrarBotoes(false);
        try {
            await evento.prompt();
            await evento.userChoice;
        } catch (erro) {
            console.error("Não foi possível abrir a instalação do aplicativo:", erro);
            alert("Não foi possível iniciar a instalação. Use o menu do navegador para instalar o aplicativo.");
        }
    }));

    window.addEventListener("appinstalled", () => {
        instalacaoPendente = null;
        mostrarBotoes(false);
    });

    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("admin-sw.js").catch(erro => {
            console.error("Não foi possível registrar o aplicativo administrativo:", erro);
        });
    }
})();
