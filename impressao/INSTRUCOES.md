# Impressão automática no Windows

O agente envia os pedidos recebidos ao Windows mesmo com o painel fechado. O botão de impressão do painel continua disponível para reimpressão manual. A fila não inclui pedidos anteriores à ativação.

## Preparação

1. Configure um banco PostgreSQL persistente no servidor. O H2 em memória perde a fila ao reiniciar. Configure `IMPRESSAO_AUTOMATICA_ENABLED=true` no ambiente do servidor e faça o deploy desta versão. Pedidos aceitos a partir da ativação entram na fila, inclusive enquanto o computador estiver desligado.
2. No computador do restaurante, instale a impressora USB no Windows, configure no driver o papel de 80 mm e imprima uma página de teste. Confirme o nome exato em **Configurações > Impressoras e scanners**.
3. No computador do restaurante, acesse o painel, abra **Impressão Automática** e baixe o instalador. Extraia o ZIP e execute `instalar.cmd` em até 15 minutos com o usuário do Windows que operará a impressora. O agente exige Windows PowerShell 5.1 e usa o driver Windows da impressora.
4. O instalador vincula o computador automaticamente, sem pedir usuário ou senha. Na central de impressão, selecione a impressora instalada e clique em **Salvar e iniciar**. A credencial do computador permite somente acessar a fila de impressão, é cifrada pelo Windows para esse usuário e permanece válida após reinícios. Proteja a conta e os arquivos locais.
5. Confira o estado da conexão e da impressora na central. Ao minimizar ou fechar a janela, ela continua funcionando na bandeja ao lado do relógio; clique duas vezes no ícone para abrir. O aplicativo inicia quando o usuário entra no Windows, não antes do login. Deixe o computador ligado, com internet e impressora conectada. Faça um pedido de teste e confira a comanda física, margens, corte e tamanho do papel no driver.

## Falhas e conferência

O agente consulta a fila a cada cinco segundos e tenta novamente após falhas de conexão. Pedidos aguardam mesmo se forem finalizados ou cancelados; a limpeza do histórico não os apaga enquanto estiverem pendentes. Não execute o agente em mais de um computador: a fila foi projetada para um único agente.

O Windows aceitar um trabalho de impressão **não garante** que ele foi impresso fisicamente. Confira papel, energia, fila do Windows e avisos na janela. Se o processo for interrompido ou ocorrer um erro durante o envio, o pedido fica em estado incerto e a fila para para evitar duplicação. Confira a impressora e a fila do Windows, abra a central pelo ícone da bandeja e clique em **Conferir pedido**. Escolha se o pedido já saiu ou se deseja tentar novamente. Se a rede cair depois do envio bem-sucedido, o agente tenta confirmar sem imprimir novamente. O botão do painel permite reimpressão independente da fila.

Para alterar a impressora, abra a central, selecione a nova impressora e clique em **Salvar e iniciar**. Para parar a impressão automática, clique com o botão direito no ícone da bandeja e escolha **Sair e parar impressão**. Para desativar a inicialização, remova o atalho **Sabor Cearense Impressao** da pasta Inicializar do usuário (`shell:startup`). Para parar de criar novos trabalhos, configure `IMPRESSAO_AUTOMATICA_ENABLED=false` no servidor; pedidos já pendentes continuam na fila.

Cada instalador contém um código de uso único, válido por 15 minutos; um novo download invalida o código do download anterior. Não compartilhe o ZIP; depois de usá-lo, descarte-o e a pasta extraída. Vincular outro computador desativa o vínculo anterior. Se o computador for perdido ou o acesso ficar comprometido, use **Desvincular computadores de impressão** no painel e baixe um novo instalador. Instalações antigas com usuário e senha continuam funcionando até serem substituídas pelo novo instalador.
