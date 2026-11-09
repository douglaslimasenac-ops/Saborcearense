param([switch]$InstalarInterface, [switch]$Bandeja)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$script:pastaAplicativo = Join-Path $env:LOCALAPPDATA 'SaborCearense\Impressao'
$script:processoAgente = $null
$script:acaoPendente = $null
$script:permitirFechar = $false
$script:ultimoAlerta = ''
. (Join-Path $PSScriptRoot 'agente.ps1')

function Mostrar-Erro($mensagem) {
    [System.Windows.Forms.MessageBox]::Show($mensagem, 'Sabor Cearense - Impressão',
        [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
}

function Instalar-Arquivos {
    $mutex = New-Object System.Threading.Mutex($false, 'Local\SaborCearenseAgenteImpressao')
    if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); throw 'Feche o agente de impressão anterior antes de instalar esta versão.' }
    try {
    New-Item -ItemType Directory -Force -Path $script:pastaAplicativo | Out-Null
    foreach ($nome in @('interface.ps1', 'agente.ps1', 'icone.ico', 'marca.png')) {
        $origem = Join-Path $PSScriptRoot $nome
        $destino = Join-Path $script:pastaAplicativo $nome
        if ([IO.Path]::GetFullPath($origem) -ne [IO.Path]::GetFullPath($destino)) {
            Copy-Item -LiteralPath $origem -Destination $destino -Force
        }
    }
    } finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
}

function Criar-AtalhoInterface {
    $startup = [Environment]::GetFolderPath('Startup')
    if (-not $startup) { throw 'Não foi possível localizar a pasta Inicializar do Windows.' }
    $atalho = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $startup 'Sabor Cearense Impressao.lnk'))
    $atalho.TargetPath = (Join-Path $PSHOME 'powershell.exe')
    $atalho.Arguments = '-STA -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' +
        (Join-Path $script:pastaAplicativo 'interface.ps1') + '" -Bandeja'
    $atalho.WorkingDirectory = $script:pastaAplicativo
    $atalho.IconLocation = Join-Path $script:pastaAplicativo 'icone.ico'
    $atalho.Save()
}

function Vincular-Dispositivo($origem = $PSScriptRoot) {
    $mutex = New-Object System.Threading.Mutex($false, 'Local\SaborCearenseAgenteImpressao')
    if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); throw 'Feche o agente de impressão anterior antes de vincular este computador.' }
    try {
    $arquivo = Join-Path $origem 'vinculacao.json'
    if (-not (Test-Path -LiteralPath $arquivo)) {
        throw 'Vínculo de instalação ausente. Baixe outro instalador pelo painel administrativo.'
    }
    $vinculacao = Ler-Json $arquivo
    $site = Validar-UrlServidor ([string]$vinculacao.site)
    if (-not $vinculacao.codigo) { throw 'Código de instalação ausente. Baixe outro instalador pelo painel.' }
    $corpo = @{ codigo = [string]$vinculacao.codigo } | ConvertTo-Json -Compress
    try {
        $resultado = Invoke-RestMethod -Method Post -Uri ($site + '/api/impressao/vincular') `
            -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($corpo)) -TimeoutSec 15
    } catch {
        throw 'Não foi possível vincular o computador. Verifique a internet e baixe um novo instalador pelo painel.'
    }
    if (-not $resultado.credencial) { throw 'O servidor não confirmou o vínculo. Baixe outro instalador.' }
    $segura = ConvertTo-SecureString $resultado.credencial -AsPlainText -Force
    [IO.File]::WriteAllText($credencialPath, (ConvertFrom-SecureString $segura))
    $impressora = ''
    if (Test-Path -LiteralPath $configPath) { $impressora = (Ler-Json $configPath).impressora }
    Gravar-JsonAtomico $configPath @{ url = $site; impressora = $impressora; autenticacao = 'dispositivo' }
    if (Test-Path -LiteralPath $senhaPath) { Remove-Item -LiteralPath $senhaPath -Force }
    Remove-Item -LiteralPath $arquivo -Force
    } finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
}

function Atualizar-Impressoras {
    $selecionada = [string]$script:campoImpressora.SelectedItem
    $impressoras = @(Get-Printer | Sort-Object Name)
    $script:campoImpressora.Items.Clear()
    foreach ($printer in $impressoras) { [void]$script:campoImpressora.Items.Add($printer.Name) }
    if ($selecionada) { $script:campoImpressora.SelectedItem = $selecionada }
}

function Iniciar-ProcessoAgente {
    if ($script:processoAgente -and -not $script:processoAgente.HasExited) { return }
    if (Test-Path -LiteralPath $paradaPath) { Remove-Item -LiteralPath $paradaPath -Force }
    if (Test-Path -LiteralPath $statusPath) { Remove-Item -LiteralPath $statusPath -Force }
    $caminho = Join-Path $script:pastaAplicativo 'agente.ps1'
    $argumentos = '-NoProfile -ExecutionPolicy Bypass -File "' + $caminho + '" -ResponsavelPid ' + $PID
    $script:processoAgente = Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') `
        -ArgumentList $argumentos -WindowStyle Hidden -PassThru
    $script:estadoTitulo.Text = 'Conectando...'
    $script:estadoDetalhe.Text = 'Aguardando a primeira verificação do servidor e da impressora.'
}

function Solicitar-Parada($acao) {
    if ($script:acaoPendente) { return }
    try {
        if ($acao -eq 'salvar') { Validar-Configuracao }
        $script:acaoPendente = $acao
        if ($script:processoAgente -and -not $script:processoAgente.HasExited) {
            [IO.File]::WriteAllText($paradaPath, 'parar')
            $script:estadoTitulo.Text = 'Aguardando o agente'
            $script:estadoDetalhe.Text = 'Concluindo o envio atual antes de continuar.'
        } else {
            Finalizar-AcaoPendente
        }
    } catch {
        $script:acaoPendente = $null
        Mostrar-Erro $_.Exception.Message
    }
}

function Validar-Configuracao {
    if (-not (Test-Path -LiteralPath $configPath)) {
        throw 'Computador ainda não vinculado. Baixe o instalador pelo painel administrativo.'
    }
    $config = Ler-Json $configPath
    $null = Validar-UrlServidor ([string]$config.url)
    if ($config.autenticacao -eq 'dispositivo' -and -not (Test-Path -LiteralPath $credencialPath)) {
        throw 'Vínculo ausente. Baixe um novo instalador pelo painel administrativo.'
    }
    if ($config.autenticacao -ne 'dispositivo' -and -not (Test-Path -LiteralPath $senhaPath)) {
        throw 'Vínculo antigo indisponível. Baixe um novo instalador pelo painel administrativo.'
    }
    $impressora = [string]$script:campoImpressora.SelectedItem
    if (-not $impressora) { throw 'Selecione uma impressora instalada no Windows.' }
    Get-Printer -Name $impressora -ErrorAction Stop | Out-Null
}

function Salvar-Configuracao {
    Validar-Configuracao
    $impressora = [string]$script:campoImpressora.SelectedItem
    $mutex = New-Object System.Threading.Mutex($false, 'Local\SaborCearenseAgenteImpressao')
    if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); throw 'Outro agente está aberto. Feche-o antes de alterar a configuração.' }
    try {
        $config = Ler-Json $configPath
        $config.impressora = $impressora
        Gravar-JsonAtomico $configPath $config
        Criar-AtalhoInterface
    } finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
    $script:configAtual.Text = "Impressora configurada: $impressora"
    Iniciar-ProcessoAgente
}

function Resolver-Pedido {
    if (-not (Test-Path -LiteralPath $estadoPath)) { return }
    $estado = Ler-Json $estadoPath
    if ($estado.status -ne 'incerto') { return }
    $resposta = [System.Windows.Forms.MessageBox]::Show(
        "Confira a impressora e a fila do Windows para o pedido #$($estado.numero).`n`nSim: já foi impresso.`nNão: tentar imprimir novamente.`nCancelar: decidir depois.",
        'Conferir pedido', [System.Windows.Forms.MessageBoxButtons]::YesNoCancel,
        [System.Windows.Forms.MessageBoxIcon]::Warning)
    if ($resposta -eq [System.Windows.Forms.DialogResult]::Cancel) { return }
    $mutex = New-Object System.Threading.Mutex($false, 'Local\SaborCearenseAgenteImpressao')
    if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); throw 'Outro agente está aberto. Feche-o antes de resolver o pedido.' }
    try {
        $estado = Ler-Json $estadoPath
        if ($estado.status -ne 'incerto') { throw 'O estado do pedido mudou. Verifique novamente.' }
        if ($resposta -eq [System.Windows.Forms.DialogResult]::Yes) {
            $estado.status = 'enviado'
            Gravar-JsonAtomico $estadoPath $estado
        } else {
            Remove-Item -LiteralPath $estadoPath
        }
    } finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
}

function Finalizar-AcaoPendente {
    $acao = $script:acaoPendente
    $script:acaoPendente = $null
    if (Test-Path -LiteralPath $paradaPath) { Remove-Item -LiteralPath $paradaPath -Force }
    try {
        switch ($acao) {
            'salvar' { Salvar-Configuracao }
            'resolver' { Resolver-Pedido; Iniciar-ProcessoAgente }
            'sair' {
                $script:permitirFechar = $true
                $script:janela.Close()
            }
        }
    } catch {
        $script:estadoTitulo.Text = 'Ação não concluída'
        $script:estadoDetalhe.Text = $_.Exception.Message
        Mostrar-Erro $_.Exception.Message
    }
}

function Avisar-Bandeja($chave, $titulo, $mensagem) {
    if ($script:ultimoAlerta -eq $chave) { return }
    $script:ultimoAlerta = $chave
    $script:bandejaIcone.ShowBalloonTip(5000, $titulo, $mensagem, [System.Windows.Forms.ToolTipIcon]::Warning)
}

function Atualizar-Tela {
    try {
        if ($script:acaoPendente) {
            if (-not $script:processoAgente -or $script:processoAgente.HasExited) { Finalizar-AcaoPendente }
            return
        }
        $script:botaoResolver.Visible = $false
        if (Test-Path -LiteralPath $estadoPath) {
            $estado = Ler-Json $estadoPath
            if ($estado.status -eq 'incerto') {
                $script:botaoResolver.Visible = $true
                $script:estadoTitulo.Text = "Pedido #$($estado.numero) precisa de conferência"
                $script:estadoDetalhe.Text = 'Confira a impressora e a fila do Windows antes de continuar.'
                Avisar-Bandeja "pedido-$($estado.id)" 'Pedido precisa de conferência' "Confira o pedido #$($estado.numero) no aplicativo."
                return
            }
        }
        if (-not $script:processoAgente) { return }
        if ($script:processoAgente.HasExited) {
            $script:estadoTitulo.Text = 'Agente interrompido'
            $script:estadoDetalhe.Text = 'A impressão automática está parada. Confira a configuração e clique em Salvar e iniciar.'
            if (Test-Path -LiteralPath $statusPath) {
                $status = Ler-Json $statusPath
                if ($status.tipo -eq 'erro') { $script:estadoDetalhe.Text = $status.mensagem }
            }
            Avisar-Bandeja 'agente-interrompido' 'Impressão interrompida' 'Abra a central para verificar o erro e reiniciar.'
            return
        }
        if (-not (Test-Path -LiteralPath $statusPath)) { return }
        $status = Ler-Json $statusPath
        $tempo = [DateTimeOffset]::Parse($status.atualizado)
        if (([DateTimeOffset]::UtcNow - $tempo).TotalSeconds -gt 60) {
            $script:estadoTitulo.Text = 'Verificação demorada'
            $script:estadoDetalhe.Text = 'O agente ainda não respondeu. Confira a impressora e a conexão.'
            Avisar-Bandeja 'verificacao-demorada' 'Impressão sem resposta' 'Abra a central para verificar a conexão e a impressora.'
            return
        }
        $titulos = @{ operacional = 'Tudo pronto'; verificando = 'Verificando'; alerta = 'Atenção'; erro = 'Não foi possível imprimir' }
        $script:estadoTitulo.Text = if ($titulos.ContainsKey($status.tipo)) { $titulos[$status.tipo] } else { 'Estado desconhecido' }
        $script:estadoDetalhe.Text = $status.mensagem
        if ($status.tipo -eq 'operacional' -and $null -ne $status.pendentes) {
            $script:estadoDetalhe.Text += " Pedidos pendentes: $($status.pendentes)."
        }
        if ($status.tipo -eq 'erro' -or $status.tipo -eq 'alerta') {
            Avisar-Bandeja $status.mensagem 'Atenção à impressão' $status.mensagem
        } elseif ($status.tipo -eq 'operacional') { $script:ultimoAlerta = '' }
    } catch {
        $script:estadoTitulo.Text = 'Não foi possível verificar o agente'
        $script:estadoDetalhe.Text = $_.Exception.Message
    }
}

function Criar-Janela {
    $script:janela = New-Object System.Windows.Forms.Form
    $script:janela.Text = 'Sabor Cearense | Impressão'
    $script:janela.StartPosition = 'CenterScreen'
    $script:janela.ClientSize = New-Object System.Drawing.Size(670, 650)
    $script:janela.MinimumSize = New-Object System.Drawing.Size(670, 650)
    $script:janela.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::Dpi
    $script:janela.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#faf6ee')
    $script:janela.Font = New-Object System.Drawing.Font('Segoe UI', 10)
    $script:janela.Icon = New-Object System.Drawing.Icon((Join-Path $script:pastaAplicativo 'icone.ico'))

    $header = New-Object System.Windows.Forms.Panel
    $header.Dock = 'Top'
    $header.Height = 90
    $header.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#181611')
    $logo = New-Object System.Windows.Forms.PictureBox
    $logo.Location = New-Object System.Drawing.Point(20, 12)
    $logo.Size = New-Object System.Drawing.Size(62, 62)
    $logo.SizeMode = 'Zoom'
    $imagemOriginal = [System.Drawing.Image]::FromFile((Join-Path $script:pastaAplicativo 'marca.png'))
    try { $script:marcaImagem = New-Object System.Drawing.Bitmap($imagemOriginal) }
    finally { $imagemOriginal.Dispose() }
    $logo.Image = $script:marcaImagem
    $header.Controls.Add($logo)
    $marca = New-Object System.Windows.Forms.Label
    $marca.Location = New-Object System.Drawing.Point(98, 18)
    $marca.Size = New-Object System.Drawing.Size(500, 28)
    $marca.Text = 'SABOR CEARENSE'
    $marca.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#f5a623')
    $marca.Font = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
    $header.Controls.Add($marca)
    $subtitulo = New-Object System.Windows.Forms.Label
    $subtitulo.Location = New-Object System.Drawing.Point(100, 50)
    $subtitulo.Size = New-Object System.Drawing.Size(450, 25)
    $subtitulo.Text = 'Central de impressão do restaurante'
    $subtitulo.ForeColor = [System.Drawing.Color]::White
    $header.Controls.Add($subtitulo)
    $script:janela.Controls.Add($header)

    $area = New-Object System.Windows.Forms.Panel
    $area.Dock = 'Fill'
    $area.AutoScroll = $true
    $script:janela.Controls.Add($area)
    $area.BringToFront()

    $script:estadoTitulo = New-Object System.Windows.Forms.Label
    $script:estadoTitulo.Location = New-Object System.Drawing.Point(26, 18)
    $script:estadoTitulo.Size = New-Object System.Drawing.Size(600, 28)
    $script:estadoTitulo.Font = New-Object System.Drawing.Font('Segoe UI', 14, [System.Drawing.FontStyle]::Bold)
    $script:estadoTitulo.ForeColor = [System.Drawing.ColorTranslator]::FromHtml('#237a4b')
    $script:estadoTitulo.Text = 'Configure a impressão automática'
    $area.Controls.Add($script:estadoTitulo)
    $script:estadoDetalhe = New-Object System.Windows.Forms.Label
    $script:estadoDetalhe.Location = New-Object System.Drawing.Point(28, 54)
    $script:estadoDetalhe.Size = New-Object System.Drawing.Size(600, 48)
    $script:estadoDetalhe.Text = 'Preencha os dados abaixo para começar.'
    $area.Controls.Add($script:estadoDetalhe)
    $script:botaoResolver = New-Object System.Windows.Forms.Button
    $script:botaoResolver.Location = New-Object System.Drawing.Point(28, 103)
    $script:botaoResolver.Size = New-Object System.Drawing.Size(205, 36)
    $script:botaoResolver.Text = 'Conferir pedido'
    $script:botaoResolver.Visible = $false
    $script:botaoResolver.Add_Click({ Solicitar-Parada 'resolver' })
    $area.Controls.Add($script:botaoResolver)

    $script:configAtual = New-Object System.Windows.Forms.Label
    $script:configAtual.Location = New-Object System.Drawing.Point(28, 150)
    $script:configAtual.Size = New-Object System.Drawing.Size(600, 24)
    $script:configAtual.Text = 'Nenhuma impressora configurada.'
    $area.Controls.Add($script:configAtual)

    function Adicionar-Campo($rotulo, $topo, $controle) {
        $label = New-Object System.Windows.Forms.Label
        $label.Location = New-Object System.Drawing.Point(28, $topo)
        $label.Size = New-Object System.Drawing.Size(590, 22)
        $label.Text = $rotulo
        $area.Controls.Add($label)
        $controle.Location = New-Object System.Drawing.Point(28, ($topo + 24))
        $controle.Size = New-Object System.Drawing.Size(595, 30)
        $area.Controls.Add($controle)
    }

    $script:campoImpressora = New-Object System.Windows.Forms.ComboBox
    $script:campoImpressora.DropDownStyle = 'DropDownList'
    Adicionar-Campo 'Impressora instalada no Windows' 192 $script:campoImpressora
    $script:campoImpressora.Width = 445
    $atualizarImpressoras = New-Object System.Windows.Forms.Button
    $atualizarImpressoras.Location = New-Object System.Drawing.Point(485, 216)
    $atualizarImpressoras.Size = New-Object System.Drawing.Size(138, 30)
    $atualizarImpressoras.Text = 'Atualizar lista'
    $atualizarImpressoras.Add_Click({
        try { Atualizar-Impressoras } catch { Mostrar-Erro $_.Exception.Message }
    })
    $area.Controls.Add($atualizarImpressoras)
    $servidorInfo = New-Object System.Windows.Forms.Label
    $servidorInfo.Location = New-Object System.Drawing.Point(28, 265)
    $servidorInfo.Size = New-Object System.Drawing.Size(600, 55)
    $servidorInfo.Text = 'O computador é vinculado pelo instalador baixado no painel. Nenhuma senha é solicitada neste aplicativo.'
    $area.Controls.Add($servidorInfo)

    $salvar = New-Object System.Windows.Forms.Button
    $salvar.Location = New-Object System.Drawing.Point(28, 335)
    $salvar.Size = New-Object System.Drawing.Size(195, 40)
    $salvar.Text = 'Salvar e iniciar'
    $salvar.BackColor = [System.Drawing.ColorTranslator]::FromHtml('#f5a623')
    $salvar.FlatStyle = 'Flat'
    $salvar.Add_Click({ Solicitar-Parada 'salvar' })
    $area.Controls.Add($salvar)
    $minimizar = New-Object System.Windows.Forms.Button
    $minimizar.Location = New-Object System.Drawing.Point(235, 335)
    $minimizar.Size = New-Object System.Drawing.Size(190, 40)
    $minimizar.Text = 'Continuar na bandeja'
    $minimizar.Add_Click({ $script:janela.Hide() })
    $area.Controls.Add($minimizar)
    $rodape = New-Object System.Windows.Forms.Label
    $rodape.Location = New-Object System.Drawing.Point(28, 395)
    $rodape.Size = New-Object System.Drawing.Size(600, 42)
    $rodape.Text = 'Ao fechar esta janela, o aplicativo continua imprimindo na bandeja ao lado do relógio. Use Sair no ícone para interromper.'
    $area.Controls.Add($rodape)

    $menu = New-Object System.Windows.Forms.ContextMenuStrip
    $abrir = $menu.Items.Add('Abrir central de impressão')
    $abrir.Add_Click({ $script:janela.Show(); $script:janela.WindowState = 'Normal'; $script:janela.Activate() })
    $sair = $menu.Items.Add('Sair e parar impressão')
    $sair.Add_Click({
        $confirmacao = [System.Windows.Forms.MessageBox]::Show(
            'Ao sair, os novos pedidos não serão impressos até abrir o aplicativo novamente. Deseja sair?',
            'Sabor Cearense', [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Warning)
        if ($confirmacao -eq [System.Windows.Forms.DialogResult]::Yes) { Solicitar-Parada 'sair' }
    })
    $script:bandejaIcone = New-Object System.Windows.Forms.NotifyIcon
    $script:bandejaIcone.Icon = $script:janela.Icon
    $script:bandejaIcone.Text = 'Sabor Cearense - Impressão'
    $script:bandejaIcone.ContextMenuStrip = $menu
    $script:bandejaIcone.Visible = $true
    $script:bandejaIcone.Add_DoubleClick({ $script:janela.Show(); $script:janela.WindowState = 'Normal'; $script:janela.Activate() })
    $script:janela.Add_Resize({ if ($script:janela.WindowState -eq 'Minimized') { $script:janela.Hide() } })
    $script:janela.Add_FormClosing({
        param($sender, $evento)
        if (-not $script:permitirFechar -and $evento.CloseReason -eq [System.Windows.Forms.CloseReason]::UserClosing) {
            $evento.Cancel = $true
            $script:janela.Hide()
        }
    })
    $script:janela.Add_FormClosed({
        $script:bandejaIcone.Visible = $false
        $script:bandejaIcone.Dispose()
        $script:marcaImagem.Dispose()
    })
    $script:timer = New-Object System.Windows.Forms.Timer
    $script:timer.Interval = 1000
    $script:timer.Add_Tick({ Atualizar-Tela })
}

function Iniciar-Interface {
    $mutexInterface = New-Object System.Threading.Mutex($false, 'Local\SaborCearenseInterfaceImpressao')
    if (-not $mutexInterface.WaitOne(0)) {
        $mutexInterface.Dispose()
        throw 'O aplicativo já está aberto. Use o ícone ao lado do relógio para abri-lo.'
    }
    try {
        if ($InstalarInterface) { Instalar-Arquivos; Vincular-Dispositivo }
        Criar-Janela
        try {
            Atualizar-Impressoras
            if (Test-Path -LiteralPath $configPath) {
                $config = Ler-Json $configPath
                $script:campoImpressora.SelectedItem = $config.impressora
                if ($config.impressora) { $script:configAtual.Text = "Impressora configurada: $($config.impressora)" }
                if ($InstalarInterface) { Criar-AtalhoInterface }
                if ($config.impressora) { Iniciar-ProcessoAgente }
            }
        } catch { Mostrar-Erro $_.Exception.Message }
        $script:timer.Start()
        if ($Bandeja -and (Test-Path -LiteralPath $configPath)) {
            $script:janela.Add_Shown({ $script:janela.Hide() })
        }
        [System.Windows.Forms.Application]::Run($script:janela)
    } finally { $mutexInterface.ReleaseMutex(); $mutexInterface.Dispose() }
}

if ($MyInvocation.InvocationName -ne '.') {
    try { Iniciar-Interface }
    catch { Mostrar-Erro $_.Exception.Message; exit 1 }
}
