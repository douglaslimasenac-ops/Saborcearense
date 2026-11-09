$ErrorActionPreference = 'Stop'
$raizTeste = Join-Path $env:TEMP ('sabor-webview-teste-' + [guid]::NewGuid())
$anterior = $env:LOCALAPPDATA
$env:LOCALAPPDATA = $raizTeste
try {
    . (Join-Path $PSScriptRoot '..\..\main\resources\impressao\agente.ps1')
    $static = Join-Path $PSScriptRoot '..\..\main\resources\static'
    function Invoke-WebRequest {
        param($Uri, [switch]$UseBasicParsing, $TimeoutSec)
        $nome = if ($Uri.EndsWith('/ordenar-itens.js')) { 'ordenar-itens.js' } else { 'admin.js' }
        $bytes = [IO.File]::ReadAllBytes((Join-Path $static $nome))
        return @{ RawContentStream = New-Object IO.MemoryStream(,$bytes) }
    }
    function Invoke-RestMethod {
        param($Uri, $TimeoutSec)
        if ($script:catalogoInvalido) { return @{ erro = 'erro' } }
        return ,@([pscustomobject]@{ id = 1; categoria = 'FRANGO' },
            [pscustomobject]@{ id = 2; categoria = 'BEBIDA' })
    }
    $pedido = @{
        id = 123; clienteNome = 'Teste local'; telefone = '123'
        endereco = 'Rua A, 12, Bairro: Centro (Ref: Mercado)'
        itens = '[{"id":2,"nome":"Suco","quantidade":1,"preco":5},{"id":1,"nome":"Prato","quantidade":2,"preco":12.5}]'
        valorTotal = 30; formaPagamento = 'Dinheiro'; trocoPara = 50
    }
    $codigo = Preparar-ComandaWebView @{ url = 'http://localhost' } $pedido
    if (-not $codigo.Contains('listaPratosLocal=[{"id":1,"categoria":"FRANGO"},{"id":2,"categoria":"BEBIDA"}]')) {
        throw 'O catalogo nao foi serializado como uma lista de produtos.'
    }
    if (-not $codigo.Contains(('Previs' + [char]0x00E3 + 'o de entrega'))) {
        throw 'O modelo da comanda nao foi decodificado como UTF-8.'
    }
    $script:catalogoInvalido = $true
    try { $null = Preparar-ComandaWebView @{ url = 'http://localhost' } $pedido; throw 'Catalogo invalido foi aceito.' }
    catch { if ($_.Exception.Message -notmatch 'cardapio invalido') { throw } }

    if ($env:SABOR_WEBVIEW2_SDK) {
        New-Item -ItemType Directory -Force -Path $raizTeste | Out-Null
        $validacao = @'
const linhas = document.querySelectorAll('tbody tr');
if (linhas.length !== 2 || !linhas[0].textContent.includes('PRATO') || !linhas[1].textContent.includes('SUCO')) throw new Error('Ordem dos itens incorreta');
if (!document.body.textContent.includes('Mercado') || !document.body.textContent.includes('20,00')) throw new Error('Dados da comanda ausentes');
if (!document.head.textContent.includes('size: 80mm auto')) throw new Error('CSS de impressao ausente');
if (document.title !== 'iFood Cupom #123') throw new Error('Titulo da comanda incorreto');
'@
        $codigo = $codigo.Replace("return 'OK';}catch", "$validacao`nreturn 'OK';}catch")
        $pdf = Join-Path $raizTeste 'comanda-teste.pdf'
        $worker = Join-Path $PSScriptRoot '..\..\main\resources\impressao\renderizar.ps1'
        $inicio = New-Object Diagnostics.ProcessStartInfo
        $inicio.FileName = Join-Path $PSHOME 'powershell.exe'
        $inicio.Arguments = '-STA -NoProfile -ExecutionPolicy Bypass -File "' + $worker +
            '" -PastaSdk "' + $env:SABOR_WEBVIEW2_SDK + '" -Perfil "' + (Join-Path $raizTeste 'perfil') +
            '" -PreviaPdf "' + $pdf + '"'
        $inicio.UseShellExecute = $false
        $inicio.CreateNoWindow = $true
        $inicio.RedirectStandardInput = $true
        $inicio.RedirectStandardError = $true
        function Executar-Renderizador($inicio, $codigo) {
            $processo = [Diagnostics.Process]::Start($inicio)
            try {
                $erro = $processo.StandardError.ReadToEndAsync()
                $bytes = [Text.Encoding]::UTF8.GetBytes($codigo)
                $processo.StandardInput.BaseStream.Write($bytes, 0, $bytes.Length)
                $processo.StandardInput.Close()
                if (-not $processo.WaitForExit(60000)) { $processo.Kill(); throw 'Timeout no WebView2.' }
                return @{ codigo = $processo.ExitCode; erro = $erro.GetAwaiter().GetResult() }
            } finally { $processo.Dispose() }
        }
        $resultado = Executar-Renderizador $inicio $codigo
        if ($resultado.codigo -ne 0) { throw ('Falha no WebView2: ' + $resultado.erro) }
        if (-not (Test-Path -LiteralPath $pdf) -or (Get-Item -LiteralPath $pdf).Length -lt 1000) {
            throw 'Previa PDF nao foi gerada.'
        }
        $conteudoPdf = [Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($pdf))
        $medida = [regex]::Match($conteudoPdf, '/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]')
        if (-not $medida.Success -or
            [Math]::Abs([double]::Parse($medida.Groups[1].Value, [Globalization.CultureInfo]::InvariantCulture) - (80 / 25.4 * 72)) -gt 1) {
            throw 'A previa nao possui largura de 80 mm.'
        }
        $inicio.Arguments = '-STA -NoProfile -ExecutionPolicy Bypass -File "' + $worker +
            '" -PastaSdk "' + $env:SABOR_WEBVIEW2_SDK + '" -Perfil "' + (Join-Path $raizTeste 'perfil') +
            '" -Impressora "Impressora inexistente para teste"'
        $resultado = Executar-Renderizador $inicio $codigo
        if ($resultado.codigo -eq 0 -or $resultado.erro -notmatch 'deixou de ser a padrao') {
            throw 'A renderizacao nao bloqueou a impressora diferente da padrao.'
        }
    }
    Write-Output 'Testes do modelo WebView2 passaram.'
} finally {
    $env:LOCALAPPDATA = $anterior
    if (Test-Path -LiteralPath $raizTeste) {
        for ($tentativa = 0; $tentativa -lt 10; $tentativa++) {
            try { Remove-Item -LiteralPath $raizTeste -Recurse -Force; break }
            catch { if ($tentativa -eq 9) { throw }; Start-Sleep -Seconds 1 }
        }
    }
}
