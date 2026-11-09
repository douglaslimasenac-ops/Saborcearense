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
    Criar-Janela
    $script:janela.Show()
    [System.Windows.Forms.Application]::DoEvents()
    if (-not $script:janela.Visible -or -not $script:bandejaIcone.Visible) {
        throw 'Janela ou icone da bandeja nao foram criados.'
    }

    $script:processoAgente = [pscustomobject]@{ HasExited = $false }
    Atualizar-StatusAgente 'operacional' 'Servidor conectado e impressora disponivel.' 0
    Atualizar-Tela
    if ($script:estadoTitulo.Text -ne 'Tudo pronto' -or $script:estadoDetalhe.Text -notmatch 'pendentes: 0') {
        throw 'Estado operacional nao foi exibido.'
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

    function Get-Printer { param($Name) return @{ Name = $Name } }
    function Criar-AtalhoInterface { $script:criouAtalho = $true }
    function Invoke-RestMethod {
        param($Method, $Uri, $ContentType, $Body, $TimeoutSec)
        if ($Uri -ne 'https://exemplo.invalid/api/impressao/vincular') { throw 'URL de vinculo incorreta.' }
        return @{ credencial = 'credencial-teste-apenas-impressao' }
    }
    Gravar-JsonAtomico (Join-Path $raizTeste 'vinculacao.json') @{ site = 'https://exemplo.invalid'; codigo = 'codigo-teste' }
    Vincular-Dispositivo $raizTeste
    if (Test-Path -LiteralPath (Join-Path $raizTeste 'vinculacao.json')) { throw 'Codigo utilizado nao foi removido.' }
    [void]$script:campoImpressora.Items.Add('Impressora teste')
    $script:campoImpressora.SelectedIndex = 0
    $script:criouAtalho = $false
    $script:reiniciou = $false
    Salvar-Configuracao
    $config = Ler-Json $configPath
    if ($config.impressora -ne 'Impressora teste' -or $config.autenticacao -ne 'dispositivo' -or
        -not $script:criouAtalho -or -not $script:reiniciou) {
        throw 'Vinculacao, configuracao ou inicializacao falharam.'
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
