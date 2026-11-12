$ErrorActionPreference = 'Stop'
$raizTeste = Join-Path $env:TEMP ('sabor-interface-teste-' + [guid]::NewGuid())
$anterior = $env:LOCALAPPDATA
$env:LOCALAPPDATA = $raizTeste
try {
    . (Join-Path $PSScriptRoot '..\..\main\resources\impressao\interface.ps1')
    function Criar-MutexAgente { return New-Object System.Threading.Mutex($false, "Local\SaborCearenseTeste-$PID") }
    Instalar-Arquivos
    foreach ($nome in @('interface.ps1', 'agente.ps1', 'webview.ps1', 'renderizar.ps1', 'icone.ico', 'marca.png')) {
        if (-not (Test-Path -LiteralPath (Join-Path $script:pastaAplicativo $nome))) {
            throw "Arquivo $nome nao foi instalado."
        }
    }
    $pastasAtalhos = @('startup', 'programas', 'desktop') | ForEach-Object {
        $pasta = Join-Path $raizTeste $_
        New-Item -ItemType Directory -Path $pasta | Out-Null
        $pasta
    }
    Criar-AtalhoInterface $pastasAtalhos[0] $pastasAtalhos[1] $pastasAtalhos[2]
    $shell = New-Object -ComObject WScript.Shell
    for ($i = 0; $i -lt $pastasAtalhos.Count; $i++) {
        $caminhoAtalho = Join-Path $pastasAtalhos[$i] 'Sabor Cearense Impressao.lnk'
        if (-not (Test-Path -LiteralPath $caminhoAtalho)) { throw "Atalho ausente: $caminhoAtalho" }
        $atalho = $shell.CreateShortcut($caminhoAtalho)
        if ($atalho.TargetPath -ne (Join-Path $PSHOME 'powershell.exe') -or
            $atalho.Arguments -notlike ('*"' + (Join-Path $script:pastaAplicativo 'interface.ps1') + '"*') -or
            $atalho.WorkingDirectory -ne $script:pastaAplicativo -or
            (($atalho.Arguments -match ' -Bandeja$') -ne ($i -eq 0))) {
            throw "Atalho incorreto: $caminhoAtalho"
        }
    }
    Criar-Janela
    $script:janela.Show()
    [System.Windows.Forms.Application]::DoEvents()
    if (-not $script:janela.Visible -or -not $script:bandejaIcone.Visible) {
        throw 'Janela ou icone da bandeja nao foram criados.'
    }
    $mutexInterfaceTeste = New-Object System.Threading.Mutex($false, 'Local\SaborCearenseInterfaceImpressao')
    if (-not $mutexInterfaceTeste.WaitOne(0)) { throw 'Outro aplicativo de impressao esta aberto durante o teste.' }
    $eventoTeste = New-Object System.Threading.EventWaitHandle(
        $false, [System.Threading.EventResetMode]::AutoReset, 'Local\SaborCearenseAbrirInterfaceImpressao')
    try {
        $scriptInstalado = Join-Path $script:pastaAplicativo 'interface.ps1'
        $processo = Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') `
            -ArgumentList ('-STA -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $scriptInstalado + '"') `
            -PassThru
        if (-not $processo.WaitForExit(15000)) { $processo.Kill(); throw 'A segunda abertura nao terminou.' }
        if ($processo.ExitCode -ne 0 -or -not $eventoTeste.WaitOne(0)) {
            throw 'O atalho nao solicitou a abertura da interface existente.'
        }
        $script:janela.Hide()
        Mostrar-Janela
        if (-not $script:janela.Visible) { throw 'A central nao foi reaberta.' }
    } finally {
        $eventoTeste.Dispose()
        $mutexInterfaceTeste.ReleaseMutex()
        $mutexInterfaceTeste.Dispose()
    }

    $script:processoAgente = [pscustomobject]@{ HasExited = $false }
    Atualizar-StatusAgente 'operacional' 'Servidor conectado e impressora disponivel.' 0
    Atualizar-Tela
    if ($script:estadoTitulo.Text -ne 'Tudo pronto' -or $script:estadoDetalhe.Text -notmatch 'pendentes: 0' -or
        $script:ultimaVerificacao.Text -notmatch '\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}$') {
        throw 'Estado operacional nao foi exibido.'
    }
    Gravar-JsonAtomico $estadoPath @{ id = 5; numero = 1234; status = 'incerto' }
    Atualizar-StatusAgente 'enviando' 'Enviando pedido #1234 para a impressora.'
    $script:ultimoAlerta = ''
    Atualizar-Tela
    if ($script:botaoResolver.Visible -or $script:ultimoAlerta -or $script:estadoTitulo.Text -ne 'Imprimindo') {
        throw 'Um envio em andamento nao deve solicitar conferencia.'
    }
    Atualizar-StatusAgente 'erro' 'Erro no envio.'
    Atualizar-Tela
    if (-not $script:botaoResolver.Visible -or $script:ultimoAlerta -ne 'pedido-5') {
        throw 'Uma falha de envio deve solicitar conferencia.'
    }
    Atualizar-StatusAgente 'enviando' 'Enviando pedido #1234 para a impressora.'
    $script:processoAgente.HasExited = $true
    $script:ultimoAlerta = ''
    Atualizar-Tela
    if (-not $script:botaoResolver.Visible -or $script:ultimoAlerta -ne 'pedido-5') {
        throw 'Uma interrupcao durante o envio deve solicitar conferencia.'
    }
    Remove-Item -LiteralPath $estadoPath
    $script:processoAgente.HasExited = $false
    Atualizar-StatusAgente 'operacional' 'Servidor conectado e impressora disponivel.' 0

    function Iniciar-ProcessoAgente {
        $script:reiniciosAutomaticos++
        if ($script:falharReinicio) { throw 'Falha de teste ao iniciar' }
        $script:processoAgente = [pscustomobject]@{ HasExited = $false }
        $script:agenteIniciadoEm = [DateTime]::UtcNow
        $script:proximoReinicio = $null
    }
    $script:reiniciosAutomaticos = 0
    $script:falharReinicio = $false
    $script:processoAgente.HasExited = $true
    Atualizar-Tela
    if (-not $script:proximoReinicio -or $script:reiniciosAutomaticos -ne 0 -or
        $script:estadoDetalhe.Text -notmatch 'automaticamente') {
        throw 'A interrupcao deveria agendar e anunciar a tentativa de reinicio.'
    }
    Gravar-JsonAtomico $estadoPath @{ id = 5; numero = 1234; status = 'incerto' }
    $script:proximoReinicio = [DateTime]::UtcNow.AddSeconds(-1)
    Atualizar-Tela
    if ($script:reiniciosAutomaticos -ne 0 -or -not $script:botaoResolver.Visible) {
        throw 'Pedido incerto deve exigir conferencia antes de reiniciar.'
    }
    Remove-Item -LiteralPath $estadoPath
    Atualizar-Tela
    if ($script:reiniciosAutomaticos -ne 1 -or $script:tentativasReinicio -ne 1) {
        throw 'O agente interrompido nao foi reiniciado.'
    }
    $script:agenteIniciadoEm = [DateTime]::UtcNow.AddMinutes(-6)
    Atualizar-Tela
    if ($script:tentativasReinicio -ne 0) { throw 'O limite de reinicios nao foi restaurado apos estabilidade.' }
    $script:processoAgente.HasExited = $true
    $script:tentativasReinicio = 3
    $script:proximoReinicio = [DateTime]::UtcNow.AddSeconds(-1)
    Atualizar-Tela
    if ($script:reiniciosAutomaticos -ne 1 -or $script:estadoTitulo.Text -ne 'Agente interrompido') {
        throw 'O limite de tentativas automaticas nao foi respeitado.'
    }
    $script:tentativasReinicio = 0
    $script:falharReinicio = $true
    foreach ($tentativa in 1..3) {
        $script:proximoReinicio = [DateTime]::UtcNow.AddSeconds(-1)
        Atualizar-Tela
        if ($script:tentativasReinicio -ne $tentativa -or $script:estadoDetalhe.Text -notmatch 'Falha de teste') {
            throw 'Falha de reinicio deve ser informada e contar para o limite.'
        }
    }
    $script:proximoReinicio = [DateTime]::UtcNow.AddSeconds(-1)
    Atualizar-Tela
    if ($script:reiniciosAutomaticos -ne 4) { throw 'Falhas de abertura excederam o limite de tentativas.' }
    $script:falharReinicio = $false
    $script:tentativasReinicio = 0
    $script:proximoReinicio = $null
    $script:processoAgente.HasExited = $false
    Remove-Item -LiteralPath $statusPath
    $script:agenteIniciadoEm = [DateTime]::UtcNow.AddSeconds(-61)
    Atualizar-Tela
    if ($script:estadoTitulo.Text -ne 'Agente sem resposta') {
        throw 'A ausencia prolongada de estado do agente deve ser informada.'
    }

    Solicitar-Parada 'resolver'
    if (-not (Test-Path -LiteralPath $paradaPath)) { throw 'Parada segura nao foi solicitada.' }
    $script:processoAgente.HasExited = $true
    function Resolver-Pedido { $script:resolveu = $true }
    function Iniciar-ProcessoAgente { $script:reiniciou = $true }
    $script:resolveu = $false
    $script:reiniciou = $false
    Atualizar-Tela
    if (-not $script:resolveu -or -not $script:reiniciou -or (Test-Path -LiteralPath $paradaPath)) {
        throw 'Acao de conferencia nao aguardou a parada e retomou o agente.'
    }

    function Get-Printer {
        param($Name)
        if ($Name) { return @{ Name = $Name } }
        return @(@{ Name = 'Outra impressora' }, @{ Name = 'Impressora teste' })
    }
    function Obter-ImpressoraPadrao { return 'Impressora teste' }
    function Criar-AtalhoInterface { $script:criouAtalho = $true }
    function Invoke-RestMethod {
        param($Method, $Uri, $ContentType, $Body, $TimeoutSec)
        if ($Uri -ne 'https://exemplo.invalid/api/impressao/vincular') { throw 'URL de vinculo incorreta.' }
        return @{ credencial = 'credencial-teste-apenas-impressao' }
    }
    Gravar-JsonAtomico (Join-Path $raizTeste 'vinculacao.json') @{ site = 'https://exemplo.invalid'; codigo = 'codigo-teste' }
    Vincular-Dispositivo $raizTeste
    if (Test-Path -LiteralPath (Join-Path $raizTeste 'vinculacao.json')) { throw 'Codigo utilizado nao foi removido.' }
    Atualizar-Impressoras
    if ($script:campoImpressora.SelectedItem -ne 'Impressora teste') {
        throw 'A impressora padrao deveria ser sugerida na primeira configuracao.'
    }
    $script:campoImpressora.SelectedItem = 'Outra impressora'
    Atualizar-Impressoras
    if ($script:campoImpressora.SelectedItem -ne 'Outra impressora') {
        throw 'Atualizar a lista deveria preservar a impressora selecionada.'
    }
    $script:campoImpressora.SelectedItem = 'Impressora teste'
    $script:criouAtalho = $false
    $script:reiniciou = $false
    Salvar-Configuracao
    $config = Ler-Json $configPath
    if ($config.impressora -ne 'Impressora teste' -or $config.autenticacao -ne 'dispositivo' -or
        -not $script:criouAtalho -or -not $script:reiniciou) {
        throw 'Vinculacao, configuracao ou inicializacao falharam.'
    }
    $script:campoImpressora.SelectedItem = $null
    Atualizar-Impressoras
    if ($script:campoImpressora.SelectedItem -ne $config.impressora) {
        throw 'A impressora salva deveria ser restaurada ao atualizar a lista.'
    }
    $credencialCifrada = Get-Content -LiteralPath $credencialPath -Raw
    if ($credencialCifrada.Contains('credencial-teste-apenas-impressao') -or
        (Obter-Token $config) -ne 'credencial-teste-apenas-impressao') {
        throw 'Credencial do dispositivo nao foi protegida ou recuperada.'
    }

    $script:janela.Close()
    [System.Windows.Forms.Application]::DoEvents()
    if ($script:janela.IsDisposed -or $script:janela.Visible -or -not $script:bandejaIcone.Visible) {
        throw 'Fechar a janela deveria mante-la na bandeja.'
    }
    $script:permitirFechar = $true
    $script:janela.Close()
    if (-not $script:janela.IsDisposed) { throw 'Saida nao fechou a interface.' }
    Write-Output 'Testes da interface passaram.'
} finally {
    if ($script:bandejaIcone) { $script:bandejaIcone.Visible = $false; $script:bandejaIcone.Dispose() }
    if ($script:janela -and -not $script:janela.IsDisposed) { $script:permitirFechar = $true; $script:janela.Close() }
    $env:LOCALAPPDATA = $anterior
    if (Test-Path -LiteralPath $raizTeste) { Remove-Item -LiteralPath $raizTeste -Recurse -Force }
}
