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

## Pagamento online

O pagamento online vem desativado por padrão. Para testar, configure `PAGBANK_ENABLED=true`, `PAGBANK_TOKEN` do sandbox, `PAGBANK_API_URL=https://sandbox.api.pagseguro.com` e `APP_PUBLIC_URL` com a URL HTTPS pública que receberá os webhooks. Não coloque tokens no código ou em mensagens.

Antes de habilitar produção, teste Pix, cartão e recebimento do webhook no sandbox. Em produção é obrigatório usar PostgreSQL persistente, um token de produção, `APP_PUBLIC_URL` HTTPS e `PAGBANK_ENABLED=true`; não use a URL de sandbox. A chave Pix deve estar ativa na conta PagBank associada ao token.

Pedidos que aguardam pagamento não aparecem na fila de preparo. Se um pagamento ficar em processamento ou tiver valor divergente, não peça ao cliente para pagar novamente: consulte o PagBank e o suporte. A API administrativa autenticada `GET /api/pedidos/pagamentos-pendentes` lista os pedidos pendentes e a referência enviada ao PagBank. Os limites de requisições são locais a cada instância e usam o endereço de conexão; atrás de proxy, vários clientes podem compartilhar o mesmo limite.
