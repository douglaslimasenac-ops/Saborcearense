$ErrorActionPreference = 'Stop'
$raizTeste = Join-Path $env:TEMP ('sabor-impressao-teste-' + [guid]::NewGuid())
$anterior = $env:LOCALAPPDATA
$env:LOCALAPPDATA = $raizTeste
try {
    . (Join-Path $PSScriptRoot '..\..\..\impressao\agente.ps1')
    New-Item -ItemType Directory -Force -Path $dadosDir | Out-Null
    Gravar-JsonAtomico $configPath @{ url = 'https://exemplo.invalid'; impressora = 'Teste'; usuario = 'admin' }
    Set-Content -LiteralPath $senhaPath -Value 'teste'

    $script:pedidoTeste = @{
        id = 5; numeroPedido = 1234; clienteNome = 'Cliente'; telefone = '123'
        endereco = 'RETIRADA'; formaPagamento = 'Dinheiro'; valorTotal = 30
        trocoPara = 50; itens = '[{"nome":"Prato","quantidade":2,"preco":12.5}]'
        observacao = 'Sem cebola'
    }
    $texto = Converter-ParaTexto ([pscustomobject]$script:pedidoTeste)
    foreach ($esperado in @('PEDIDO #1234 - RETIRADA', '2x Prato', 'Sem cebola', 'Troco para:', 'TOTAL:')) {
        if (-not $texto.Contains($esperado)) { throw "Texto nao contem $esperado" }
    }
    $pedidoEntrega = [pscustomobject]$script:pedidoTeste.Clone()
    $pedidoEntrega.endereco = 'Rua A, Bairro: Centro'
    $pedidoEntrega | Add-Member -NotePropertyName previsaoEntregaInicio -NotePropertyValue '2026-11-09T12:10:00'
    $pedidoEntrega | Add-Member -NotePropertyName previsaoEntregaFim -NotePropertyValue '2026-11-09T12:20:00'
    $pedidoEntrega.itens = '[{"nome":"Prato","quantidade":1,"preco":20},{"nome":"Bebida","quantidade":1,"preco":5}]'
    $textoEntrega = Converter-ParaTexto $pedidoEntrega
    foreach ($esperado in @('ENTREGA', '12:10', '12:20', 'Bebida', '5,00')) {
        if (-not $textoEntrega.Contains($esperado)) { throw "Texto de entrega nao contem $esperado" }
    }

    function Obter-Token($config) { return 'token-teste' }
    function Verificar-Impressora($nome) {
        if ($script:modo -eq 'offline' -and $script:esperas -eq 0) { throw 'Impressora offline' }
    }
    function Enviar-ParaImpressora($nome, $texto, $numero) {
        $script:impressoes++
        if ($script:modo -eq 'incerto') { throw 'Erro no envio' }
    }
    function Invoke-RestMethod {
        param($Uri, $Method, $Headers, $TimeoutSec)
        if ($Uri.EndsWith('/configuracao')) { return @{ habilitada = $true } }
        if ($Uri.EndsWith('/pendentes')) {
            if ($script:confirmado) { return ,@() }
            return ,@([pscustomobject]$script:pedidoTeste)
        }
        if ($Uri.EndsWith('/confirmar')) {
            $script:confirmacoes++
            if ($script:modo -eq 'rede' -and $script:confirmacoes -eq 1) { throw 'Conexao interrompida' }
            $script:confirmado = $true
            return
        }
        throw "URL inesperada: $Uri"
    }
    function Start-Sleep {
        param($Seconds)
        $script:esperas++
        if ($script:esperas -ge 2) { throw 'fim do teste' }
    }
    foreach ($modo in @('rede', 'offline', 'incerto')) {
        if (Test-Path -LiteralPath $estadoPath) { Remove-Item -LiteralPath $estadoPath }
        $script:modo = $modo
        $script:impressoes = 0
        $script:confirmacoes = 0
        $script:confirmado = $false
        $script:esperas = 0
        try { Iniciar-Agente } catch { if ($_.Exception.Message -ne 'fim do teste') { throw } }
        if ($script:impressoes -ne 1) { throw "$modo : esperado um unico envio, recebido $script:impressoes" }
        if ($modo -eq 'incerto') {
            if ((Ler-Json $estadoPath).status -ne 'incerto' -or $script:confirmacoes -ne 0) {
                throw 'Pedido incerto nao foi preservado.'
            }
        } elseif (-not $script:confirmado -or (Test-Path -LiteralPath $estadoPath)) {
            throw "$modo : pedido nao foi confirmado e limpo."
        }
    }
    Write-Output 'Testes do agente passaram.'
} finally {
    $env:LOCALAPPDATA = $anterior
    if (Test-Path -LiteralPath $raizTeste) { Remove-Item -LiteralPath $raizTeste -Recurse -Force }
}
