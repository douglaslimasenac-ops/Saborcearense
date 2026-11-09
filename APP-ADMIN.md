# Aplicativo do painel administrativo

O painel pode ser instalado como aplicativo web (PWA) no Android e no computador. É o mesmo painel, com login e dados do servidor. Não é necessário publicá-lo em uma loja.

## Instalação

Depois de publicar esta versão do site em HTTPS:

- **Android:** abra `admin.html` no Chrome, toque em **Instalar aplicativo** quando aparecer ou use o menu do navegador e escolha **Instalar app** ou **Adicionar à tela inicial**.
- **Computador:** abra o painel no Chrome ou Edge e use o botão de instalação quando aparecer, ou a opção de instalar aplicativo no menu ou na barra de endereços.

Os nomes das opções variam conforme a versão do navegador. O aplicativo abrirá pelo ícone do Sabor Cearense; o acesso continua protegido pelo login administrativo.

## Funcionamento

O aplicativo precisa de internet para entrar, consultar e atualizar pedidos. Se a conexão cair, uma mensagem será exibida; ao abrir o painel sem rede, aparece uma página para tentar novamente. Pedidos, credenciais e respostas da API não são armazenados no cache offline do aplicativo.

O aplicativo web não cria bolinha flutuante sobre outros aplicativos, nem garante alertas em segundo plano quando está fechado ou minimizado. A impressão automática é independente: requer o agente Windows e a configuração descritos em [instruções de impressão](impressao/INSTRUCOES.md). A impressão manual pelo painel permanece disponível.
