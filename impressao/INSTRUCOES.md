# Impressão automática no Windows

O agente envia os pedidos recebidos ao Windows mesmo com o painel fechado. O botão de impressão do painel continua disponível para reimpressão manual. A fila não inclui pedidos anteriores à ativação.

## Preparação

1. Configure um banco PostgreSQL persistente no servidor. O H2 em memória perde a fila ao reiniciar. Configure `IMPRESSAO_AUTOMATICA_ENABLED=true` no ambiente do servidor e faça o deploy desta versão. Pedidos aceitos a partir da ativação entram na fila, inclusive enquanto o computador estiver desligado.
2. No computador do restaurante, instale a impressora USB no Windows, configure no driver o papel de 80 mm e imprima uma página de teste. Confirme o nome exato em **Configurações > Impressoras e scanners**.
3. Copie a pasta `impressao` para um local permanente no computador, por exemplo `C:\SaborCearense\impressao`. O agente exige Windows PowerShell 5.1 e usa o driver Windows da impressora.
4. Abra o PowerShell com o usuário do Windows que operará a impressora e execute:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\SaborCearense\impressao\agente.ps1" -Configurar
   ```

   Informe o endereço HTTPS do site, o nome exato da impressora, o usuário e a senha do painel. A senha é cifrada pelo Windows para esse usuário; não copie o arquivo de senha entre computadores ou usuários. Proteja a conta do Windows e os arquivos locais.
5. Execute o comando abaixo para criar um atalho de inicialização para esse usuário:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\SaborCearense\impressao\agente.ps1" -IniciarComWindows
   ```

6. Inicie o agente agora com:

   ```powershell
   powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "C:\SaborCearense\impressao\agente.ps1"
   ```

   Mantenha essa janela aberta. No futuro, ele inicia quando o usuário entra no Windows, não antes do login. Deixe o computador ligado, com internet e impressora conectada. Faça um pedido de teste e confira a comanda física, margens, corte e tamanho do papel no driver.

## Falhas e conferência

O agente consulta a fila a cada cinco segundos e tenta novamente após falhas de conexão. Pedidos aguardam mesmo se forem finalizados ou cancelados; a limpeza do histórico não os apaga enquanto estiverem pendentes. Não execute o agente em mais de um computador: a fila foi projetada para um único agente.

O Windows aceitar um trabalho de impressão **não garante** que ele foi impresso fisicamente. Confira papel, energia, fila do Windows e avisos na janela. Se o processo for interrompido ou ocorrer um erro durante o envio, o pedido fica em estado incerto e a fila para para evitar duplicação. Confira a impressora e a fila do Windows, feche o agente e execute:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\SaborCearense\impressao\agente.ps1" -Resolver
```

Digite `IMPRESSO` se o pedido já saiu ou `IMPRIMIR` para tentar novamente. Inicie o agente outra vez. Se a rede cair depois do envio bem-sucedido, o agente tenta confirmar sem imprimir novamente. O botão do painel permite reimpressão independente da fila.

Para alterar a impressora ou credenciais, feche o agente e execute `-Configurar` novamente. Após mudar ou mover a pasta do agente, execute `-IniciarComWindows` novamente para atualizar o atalho. Para desativar a inicialização, remova o atalho **Sabor Cearense Impressao** da pasta Inicializar do usuário (`shell:startup`). Para parar de criar novos trabalhos, configure `IMPRESSAO_AUTOMATICA_ENABLED=false` no servidor; pedidos já pendentes continuam na fila.
