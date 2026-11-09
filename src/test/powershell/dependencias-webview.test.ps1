$ErrorActionPreference = 'Stop'
$raizTeste = Join-Path $env:TEMP ('sabor-webview-instalacao-' + [guid]::NewGuid())
$anterior = $env:LOCALAPPDATA
$env:LOCALAPPDATA = $raizTeste
try {
    . (Join-Path $PSScriptRoot '..\..\main\resources\impressao\agente.ps1')
    function Testar-RuntimeWebView { return $true }
    function Invoke-WebRequest {
        param($Uri, [switch]$UseBasicParsing, $OutFile, $TimeoutSec)
        if ($script:pacoteCorrompido) {
            [IO.File]::WriteAllText($OutFile, 'pacote invalido')
        } elseif ($env:SABOR_WEBVIEW2_PACKAGE) {
            Copy-Item -LiteralPath $env:SABOR_WEBVIEW2_PACKAGE -Destination $OutFile
        } else { throw 'Pacote de teste ausente.' }
    }

    $script:pacoteCorrompido = $true
    try { Instalar-DependenciasWebView; throw 'Pacote corrompido foi aceito.' }
    catch { if ($_.Exception.Message -notmatch 'validar o componente') { throw } }
    if (Testar-SdkWebView) { throw 'SDK invalido foi instalado.' }
    if (Test-Path -LiteralPath (Join-Path $dadosDir 'webview2-sdk-download.nupkg')) {
        throw 'Download invalido nao foi removido.'
    }

    if ($env:SABOR_WEBVIEW2_PACKAGE) {
        $script:pacoteCorrompido = $false
        Instalar-DependenciasWebView
        if (-not (Testar-SdkWebView)) { throw 'SDK validado nao foi instalado.' }
        Instalar-DependenciasWebView
    }
    Write-Output 'Testes do instalador WebView2 passaram.'
} finally {
    $env:LOCALAPPDATA = $anterior
    if (Test-Path -LiteralPath $raizTeste) { Remove-Item -LiteralPath $raizTeste -Recurse -Force }
}
