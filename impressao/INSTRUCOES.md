# Impressão automática no Windows

O agente envia os pedidos recebidos ao Windows mesmo com o painel fechado. O botão de impressão do painel continua disponível para reimpressão manual. A fila não inclui pedidos anteriores à ativação.

## Preparação

1. Configure um banco PostgreSQL persistente no servidor. O H2 em memória perde a fila ao reiniciar. Configure `IMPRESSAO_AUTOMATICA_ENABLED=true` no ambiente do servidor e faça o deploy desta versão. Pedidos aceitos a partir da ativação entram na fila, inclusive enquanto o computador estiver desligado.
2. No computador do restaurante, instale a impressora USB no Windows, configure no driver o papel de 80 mm e imprima uma página de teste. Confirme o nome exato em **Configurações > Impressoras e scanners**.
3. No computador do restaurante, acesse o painel, abra **Impressão Automática** e baixe o instalador. Extraia o ZIP e execute `instalar.cmd` com o usuário do Windows que operará a impressora. O agente exige Windows PowerShell 5.1 e usa o driver Windows da impressora.
4. Informe o endereço HTTPS do site, o nome exato da impressora, o usuário e a senha do painel. O instalador valida o login e cria o atalho de inicialização. A senha é cifrada pelo Windows para esse usuário; não copie o arquivo de senha entre computadores ou usuários. Proteja a conta do Windows e os arquivos locais.
5. Mantenha a janela aberta. No futuro, o agente inicia quando o usuário entra no Windows, não antes do login. Deixe o computador ligado, com internet e impressora conectada. Faça um pedido de teste e confira a comanda física, margens, corte e tamanho do papel no driver.

## Falhas e conferência

O agente consulta a fila a cada cinco segundos e tenta novamente após falhas de conexão. Pedidos aguardam mesmo se forem finalizados ou cancelados; a limpeza do histórico não os apaga enquanto estiverem pendentes. Não execute o agente em mais de um computador: a fila foi projetada para um único agente.

O Windows aceitar um trabalho de impressão **não garante** que ele foi impresso fisicamente. Confira papel, energia, fila do Windows e avisos na janela. Se o processo for interrompido ou ocorrer um erro durante o envio, o pedido fica em estado incerto e a fila para para evitar duplicação. Confira a impressora e a fila do Windows, feche o agente e execute:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\SaborCearense\Impressao\agente.ps1" -Resolver
```

Digite `IMPRESSO` se o pedido já saiu ou `IMPRIMIR` para tentar novamente. Inicie o agente outra vez. Se a rede cair depois do envio bem-sucedido, o agente tenta confirmar sem imprimir novamente. O botão do painel permite reimpressão independente da fila.

Para alterar a impressora ou credenciais, feche o agente e execute novamente `instalar.cmd` do ZIP baixado. Para desativar a inicialização, remova o atalho **Sabor Cearense Impressao** da pasta Inicializar do usuário (`shell:startup`). Para parar de criar novos trabalhos, configure `IMPRESSAO_AUTOMATICA_ENABLED=false` no servidor; pedidos já pendentes continuam na fila.
