$script:webviewSdk = Join-Path $dadosDir 'webview2-sdk-1.0.2903.40'
$script:arquivosWebView = @('lib\net462\Microsoft.Web.WebView2.Core.dll',
    'lib\net462\Microsoft.Web.WebView2.WinForms.dll',
    'runtimes\win-x64\native\WebView2Loader.dll', 'runtimes\win-x86\native\WebView2Loader.dll')

function Testar-SdkWebView {
    foreach ($arquivo in $script:arquivosWebView) {
        if (-not (Test-Path -LiteralPath (Join-Path $script:webviewSdk $arquivo))) { return $false }
    }
    return $true
}

function Testar-RuntimeWebView {
    $chaves = @(
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
        'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
        'HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
    )
    foreach ($chave in $chaves) {
        if (Test-Path -LiteralPath $chave) {
            $versao = (Get-ItemProperty -LiteralPath $chave -ErrorAction Stop).pv
            if ($versao -and $versao -ne '0.0.0.0') { return $true }
        }
    }
    return $false
}

function Instalar-DependenciasWebView {
    New-Item -ItemType Directory -Force -Path $dadosDir | Out-Null
    $pacote = Join-Path $dadosDir 'webview2-sdk-download.nupkg'
    $instalador = Join-Path $dadosDir 'webview2-runtime-instalador.exe'
    $temporarioSdk = Join-Path $dadosDir 'webview2-sdk-temporario'
    try {
        if (-not (Testar-SdkWebView)) {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -UseBasicParsing -Uri 'https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/1.0.2903.40/microsoft.web.webview2.1.0.2903.40.nupkg' -OutFile $pacote -TimeoutSec 120
            $hash = (Get-FileHash -LiteralPath $pacote -Algorithm SHA256).Hash
            if ($hash -ne 'EF128016DD1E51C59178C827ED5B8AA3322C57AFA8675D930F8109505542AD74') {
                throw 'Nao foi possivel validar o componente de impressao WebView2.'
            }
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            if (Test-Path -LiteralPath $temporarioSdk) { Remove-Item -LiteralPath $temporarioSdk -Recurse -Force }
            [IO.Compression.ZipFile]::ExtractToDirectory($pacote, $temporarioSdk)
            foreach ($arquivo in $script:arquivosWebView) {
                if (-not (Test-Path -LiteralPath (Join-Path $temporarioSdk $arquivo))) {
                    throw "Componente WebView2 incompleto: $arquivo"
                }
            }
            if (Test-Path -LiteralPath $script:webviewSdk) { Remove-Item -LiteralPath $script:webviewSdk -Recurse -Force }
            Move-Item -LiteralPath $temporarioSdk -Destination $script:webviewSdk
        }
        if (-not (Testar-RuntimeWebView)) {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -UseBasicParsing -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $instalador -TimeoutSec 120
            $assinatura = Get-AuthenticodeSignature -LiteralPath $instalador
            if ($assinatura.Status -ne 'Valid' -or $assinatura.SignerCertificate.Subject -notmatch '(^|,\s*)CN=Microsoft Corporation(,|$)') {
                throw 'Nao foi possivel validar o instalador oficial do WebView2.'
            }
            $processo = Start-Process -FilePath $instalador -ArgumentList '/silent', '/install' -Wait -PassThru
            if ($processo.ExitCode -ne 0 -or -not (Testar-RuntimeWebView)) {
                throw "A instalacao do WebView2 nao foi concluida (codigo $($processo.ExitCode))."
            }
        }
    } finally {
        if (Test-Path -LiteralPath $pacote) { Remove-Item -LiteralPath $pacote -Force }
        if (Test-Path -LiteralPath $instalador) { Remove-Item -LiteralPath $instalador -Force }
        if (Test-Path -LiteralPath $temporarioSdk) { Remove-Item -LiteralPath $temporarioSdk -Recurse -Force }
    }
}

function Recortar-Codigo($codigo, $inicio, $fim) {
    $de = $codigo.IndexOf($inicio, [StringComparison]::Ordinal)
    if ($de -lt 0) { throw "Modelo de comanda incompativel: $inicio" }
    if ($fim) {
        $ate = $codigo.IndexOf($fim, $de, [StringComparison]::Ordinal)
        if ($ate -lt 0) { throw "Modelo de comanda incompativel: $fim" }
        return $codigo.Substring($de, $ate - $de)
    }
    return $codigo.Substring($de)
}

function Obter-JsonUtf8($uri, $headers = @{}) {
    $resposta = Invoke-WebRequest -UseBasicParsing -Uri $uri -Headers $headers -TimeoutSec 15
    $json = [Text.Encoding]::UTF8.GetString($resposta.RawContentStream.ToArray())
    return ,(ConvertFrom-Json -InputObject $json)
}

function Preparar-ComandaWebView($config, $pedido) {
    $respostaAdmin = Invoke-WebRequest -UseBasicParsing -Uri ($config.url + '/admin.js') -TimeoutSec 15
    $respostaOrdenacao = Invoke-WebRequest -UseBasicParsing -Uri ($config.url + '/ordenar-itens.js') -TimeoutSec 15
    $admin = [Text.Encoding]::UTF8.GetString($respostaAdmin.RawContentStream.ToArray())
    $ordenacao = [Text.Encoding]::UTF8.GetString($respostaOrdenacao.RawContentStream.ToArray())
    $catalogo = Obter-JsonUtf8 ($config.url + '/api/cardapio')
    if ($catalogo -isnot [array]) { throw 'O servidor retornou um cardapio invalido para a comanda.' }
    $catalogo = @($catalogo | ForEach-Object { $_ })
    $helpers = (Recortar-Codigo $admin 'function escaparHtml(' 'function renderizarItensPedido(') +
        (Recortar-Codigo $admin 'function calcularTotalItensPedido(' 'function textoStatusPedido(') +
        (Recortar-Codigo $admin 'function textoTrocoPedido(' 'function atualizarResumoFinanceiro(')
    $modelo = Recortar-Codigo $admin 'function formatarPrevisaoEntrega(' $null
    if (-not $modelo.Contains('function renderizarCupomIFood(') -or -not $ordenacao.Contains('function ordenarItensPorCategoria(')) {
        throw 'O servidor nao disponibiliza o modelo compartilhado da comanda. Atualize o servidor.'
    }
    $jsonPedido = ConvertTo-Json -InputObject $pedido -Depth 30 -Compress
    $jsonCatalogo = ConvertTo-Json -InputObject $catalogo -Depth 30 -Compress
    return "(function(){try{console.error=function(){throw new Error('Itens invalidos na comanda');};let listaPratosLocal=$jsonCatalogo;`n$ordenacao`n$helpers`n$modelo`n" +
        "const pedidoImpressao=$jsonPedido;document.title='iFood Cupom #'+numeroExibicaoPedido(pedidoImpressao);" +
        "renderizarCupomIFood(pedidoImpressao, window);return 'OK';}catch(e){return 'ERRO: '+String(e);}})()"
}
