param(
    [switch]$Instalar,
    [switch]$Configurar,
    [switch]$IniciarComWindows,
    [switch]$Resolver,
    [int]$ResponsavelPid = 0
)

$ErrorActionPreference = 'Stop'
$dadosDir = Join-Path $env:LOCALAPPDATA 'SaborCearense\Impressao'
$configPath = Join-Path $dadosDir 'config.json'
$senhaPath = Join-Path $dadosDir 'senha.txt'
$credencialPath = Join-Path $dadosDir 'credencial.txt'
$estadoPath = Join-Path $dadosDir 'estado.json'
$statusPath = Join-Path $dadosDir 'status.json'
$paradaPath = Join-Path $dadosDir 'parar'

function Gravar-JsonAtomico($caminho, $valor) {
    $temporario = "$caminho.tmp"
    $json = ConvertTo-Json -InputObject $valor -Depth 20
    [IO.File]::WriteAllText($temporario, $json, (New-Object System.Text.UTF8Encoding($false)))
    if (Test-Path -LiteralPath $caminho) {
        $backup = "$caminho.bak"
        [IO.File]::Replace($temporario, $caminho, $backup)
        Remove-Item -LiteralPath $backup -Force
    } else {
        [IO.File]::Move($temporario, $caminho)
    }
}

function Ler-Json($caminho) {
    return (Get-Content -LiteralPath $caminho -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Validar-UrlServidor($valor) {
    $url = $valor.Trim().TrimEnd('/')
    $uri = $null
    if (-not [Uri]::TryCreate($url, [UriKind]::Absolute, [ref]$uri) -or
        ($uri.Scheme -ne 'https' -and -not ($uri.Scheme -eq 'http' -and $uri.IsLoopback)) -or
        $uri.AbsolutePath -ne '/' -or $uri.Query -or $uri.Fragment -or $uri.UserInfo) {
        throw 'Use o endereco HTTPS do site, sem caminho ou credenciais.'
    }
    return $url
}

function Configurar-Agente {
    New-Item -ItemType Directory -Force -Path $dadosDir | Out-Null
    $url = Validar-UrlServidor (Read-Host 'Endereco do site (https://...)')
    Write-Host 'Impressoras instaladas:'
    Get-Printer | Format-Table Name, PrinterStatus -AutoSize | Out-Host
    $impressora = (Read-Host 'Nome exato da impressora').Trim()
    Get-Printer -Name $impressora -ErrorAction Stop | Out-Null
    $usuario = (Read-Host 'Usuario do administrador').Trim()
    if (-not $usuario) { throw 'O usuario nao pode estar vazio.' }
    $senha = Read-Host 'Senha do administrador' -AsSecureString
    if ($senha.Length -eq 0) { throw 'A senha nao pode estar vazia.' }
    $senha | ConvertFrom-SecureString | Set-Content -LiteralPath $senhaPath -Encoding ASCII
    Gravar-JsonAtomico $configPath @{ url = $url; impressora = $impressora; usuario = $usuario }
    Write-Host 'Configuracao salva para este usuario do Windows.'
}

function Instalar-Inicializacao($caminhoScript = $PSCommandPath) {
    if (-not (Test-Path -LiteralPath $configPath)) { throw 'Execute primeiro com -Configurar.' }
    $startup = [Environment]::GetFolderPath('Startup')
    $atalho = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $startup 'Sabor Cearense Impressao.lnk'))
    $atalho.TargetPath = (Join-Path $PSHOME 'powershell.exe')
    $atalho.Arguments = '-NoExit -NoProfile -ExecutionPolicy Bypass -File "' + $caminhoScript + '"'
    $atalho.WorkingDirectory = Split-Path -Parent $caminhoScript
    $atalho.Save()
    Write-Host 'Atalho criado. O agente iniciara quando este usuario entrar no Windows.'
}

function Converter-ParaTexto($pedido) {
    $cultura = [Globalization.CultureInfo]::GetCultureInfo('pt-BR')
    $numero = if ($pedido.numeroPedido) { $pedido.numeroPedido } else { $pedido.id }
    $retirada = ([string]$pedido.endereco).Trim().ToUpperInvariant().StartsWith('RETIRADA')
    $tipo = if ($retirada) { 'RETIRADA' } else { 'ENTREGA' }
    $linhas = New-Object 'System.Collections.Generic.List[string]'
    $linhas.Add('SABOR CEARENSE')
    $linhas.Add('COMPROVANTE DE PRODUCAO - NAO FISCAL')
    $linhas.Add("PEDIDO #$numero - $tipo")
    if ($pedido.dataCriacao) {
        $linhas.Add('Data: ' + ([datetime]$pedido.dataCriacao).ToString('dd/MM/yyyy HH:mm', $cultura))
    }
    if (-not $retirada -and $pedido.previsaoEntregaInicio -and $pedido.previsaoEntregaFim) {
        $inicio = ([datetime]$pedido.previsaoEntregaInicio).ToString('dd/MM HH:mm', $cultura)
        $fim = ([datetime]$pedido.previsaoEntregaFim).ToString('dd/MM HH:mm', $cultura)
        $linhas.Add("Previsao: $inicio - $fim")
    }
    $linhas.Add('--------------------------------')
    $linhas.Add('Cliente: ' + $pedido.clienteNome)
    $linhas.Add('Telefone: ' + $pedido.telefone)
    $linhas.Add('Endereco: ' + $pedido.endereco)
    $linhas.Add('--------------------------------')
    $linhas.Add('ITENS')
    if (-not $pedido.itens) { throw "Pedido #$numero sem itens; confira no painel." }
    $itens = ConvertFrom-Json -InputObject $pedido.itens
    if ($itens -isnot [array]) {
        if ($itens.nome) { $itens = @($itens) }
        else { $itens = @($itens.PSObject.Properties | ForEach-Object { $_.Value }) }
    }
    if (@($itens).Count -eq 0) { throw "Pedido #$numero sem itens; confira no painel." }
    $subtotal = [decimal]0
    foreach ($item in $itens) {
        if (-not $item.nome) { throw "Item sem nome no pedido #$numero." }
        $qtd = if ($item.quantidade) { [decimal]$item.quantidade } elseif ($item.qtd) { [decimal]$item.qtd } else { [decimal]1 }
        $preco = if ($null -ne $item.preco) { [decimal]$item.preco } elseif ($null -ne $item.valor) { [decimal]$item.valor } else { [decimal]$item.precoUnitario }
        $valor = $qtd * $preco
        $subtotal += $valor
        $linhas.Add(("{0}x {1} - R$ {2}" -f $qtd, $item.nome, $valor.ToString('N2', $cultura)))
    }
    if ($pedido.observacao) { $linhas.Add('OBSERVACAO: ' + $pedido.observacao) }
    $linhas.Add('--------------------------------')
    $total = [decimal]$pedido.valorTotal
    $taxa = [Math]::Max([decimal]0, $total - $subtotal)
    $linhas.Add('Subtotal: R$ ' + $subtotal.ToString('N2', $cultura))
    $linhas.Add('Taxa de entrega: R$ ' + $taxa.ToString('N2', $cultura))
    $linhas.Add('Pagamento: ' + $pedido.formaPagamento)
    if ($null -ne $pedido.trocoPara) {
        $troco = [decimal]$pedido.trocoPara
        $linhas.Add('Troco para: R$ ' + $troco.ToString('N2', $cultura))
        $linhas.Add('Troco: R$ ' + ($troco - $total).ToString('N2', $cultura))
    }
    $linhas.Add('TOTAL: R$ ' + $total.ToString('N2', $cultura))
    $linhas.Add('--------------------------------')
    $linhas.Add('Agradecemos a preferencia!')
    return ($linhas -join "`r`n") + "`r`n`r`n"
}

function Verificar-Impressora($nome) {
    $printer = Get-CimInstance Win32_Printer -Filter ("Name='" + $nome.Replace('\', '\\').Replace("'", "''") + "'")
    if (-not $printer -or $printer.WorkOffline -or $printer.PrinterStatus -in @(6, 7)) {
        throw "Impressora indisponivel ou em erro: $nome"
    }
}

function Enviar-ParaImpressora($nome, $texto, $numero) {
    Add-Type -AssemblyName System.Drawing
    $documento = New-Object System.Drawing.Printing.PrintDocument
    $documento.PrinterSettings.PrinterName = $nome
    if (-not $documento.PrinterSettings.IsValid) { throw "Impressora invalida: $nome" }
    $documento.DocumentName = "Sabor Cearense pedido $numero"
    $documento.PrintController = New-Object System.Drawing.Printing.StandardPrintController
    $documento.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(5, 5, 5, 5)
    $script:textoRestante = $texto
    $script:fonteImpressao = New-Object System.Drawing.Font('Arial', 10, [System.Drawing.FontStyle]::Bold)
    $documento.add_PrintPage({
        param($sender, $evento)
        $area = New-Object System.Drawing.SizeF([single]$evento.MarginBounds.Width, [single]$evento.MarginBounds.Height)
        $caracteres = 0
        $linhas = 0
        $formato = [System.Drawing.StringFormat]::GenericTypographic
        $null = $evento.Graphics.MeasureString($script:textoRestante, $script:fonteImpressao, $area, $formato, [ref]$caracteres, [ref]$linhas)
        if ($caracteres -le 0) { throw 'A area de impressao e pequena demais.' }
        $retangulo = New-Object System.Drawing.RectangleF([single]$evento.MarginBounds.X, [single]$evento.MarginBounds.Y, $area.Width, $area.Height)
        $evento.Graphics.DrawString($script:textoRestante.Substring(0, $caracteres), $script:fonteImpressao, [System.Drawing.Brushes]::Black, $retangulo, $formato)
        $script:textoRestante = $script:textoRestante.Substring($caracteres)
        $evento.HasMorePages = $script:textoRestante.Length -gt 0
    })
    try { $documento.Print() } finally { $script:fonteImpressao.Dispose(); $documento.Dispose() }
}

function Resolver-Estado {
    $mutex = New-Object System.Threading.Mutex($false, 'Local\SaborCearenseAgenteImpressao')
    if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); throw 'Feche o agente antes de resolver o pedido.' }
    try {
    if (-not (Test-Path -LiteralPath $estadoPath)) { Write-Host 'Nao ha pedido aguardando conferencia.'; return }
    $estado = Ler-Json $estadoPath
    if ($estado.status -ne 'incerto') { throw 'O pedido ja foi enviado; inicie o agente para confirmar no servidor.' }
    Write-Host ("Pedido #{0}: confira a impressora e a fila do Windows antes de decidir." -f $estado.numero)
    $resposta = Read-Host 'Digite IMPRIMIR para tentar novamente, ou IMPRESSO se ja saiu'
    if ($resposta -ceq 'IMPRIMIR') {
        Remove-Item -LiteralPath $estadoPath
    } elseif ($resposta -ceq 'IMPRESSO') {
        $estado.status = 'enviado'
        Gravar-JsonAtomico $estadoPath $estado
    } else { throw 'Nenhuma alteracao realizada.' }
    } finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
}

function Obter-Token($config) {
    if ($config.autenticacao -eq 'dispositivo') {
        if (-not (Test-Path -LiteralPath $credencialPath)) {
            throw 'Vinculacao ausente. Baixe um novo instalador pelo painel administrativo.'
        }
        $segura = (Get-Content -LiteralPath $credencialPath -Raw).Trim() | ConvertTo-SecureString
        $credencialDispositivo = New-Object System.Management.Automation.PSCredential('impressora', $segura)
        return $credencialDispositivo.GetNetworkCredential().Password
    }
    $senhaSegura = (Get-Content -LiteralPath $senhaPath -Raw).Trim() | ConvertTo-SecureString
    $credencial = New-Object System.Management.Automation.PSCredential($config.usuario, $senhaSegura)
    $corpo = @{ username = $config.usuario; password = $credencial.GetNetworkCredential().Password } | ConvertTo-Json -Compress
    try {
        $resposta = Invoke-RestMethod -Method Post -Uri ($config.url + '/api/admin/auth/login') -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($corpo)) -TimeoutSec 15
        if (-not $resposta.token) { throw 'O servidor nao retornou um token de acesso.' }
        return $resposta.token
    } finally { $corpo = $null; $credencial = $null }
}

function Instalar-Agente($origem = $PSCommandPath) {
    $mutex = New-Object System.Threading.Mutex($false, 'Local\SaborCearenseAgenteImpressao')
    if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); throw 'Feche o agente de impressao antes de instalar novamente.' }
    try {
        New-Item -ItemType Directory -Force -Path $dadosDir | Out-Null
        $destino = Join-Path $dadosDir 'agente.ps1'
        if ([IO.Path]::GetFullPath($origem) -ne [IO.Path]::GetFullPath($destino)) {
            Copy-Item -LiteralPath $origem -Destination $destino -Force
        }
        Configurar-Agente
        $config = Ler-Json $configPath
        $token = Obter-Token $config
        $servidor = Invoke-RestMethod -Uri ($config.url + '/api/admin/impressao/configuracao') -Headers @{ Authorization = "Bearer $token" } -TimeoutSec 15
        if (-not $servidor.habilitada) {
            Write-Warning 'A fila automatica esta desativada no servidor. Peca ao responsavel para ativa-la antes de receber pedidos.'
        }
        Instalar-Inicializacao $destino
        Write-Host 'Instalacao concluida. Mantenha esta janela aberta para receber pedidos.'
    } finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
    Iniciar-Agente
}

function Atualizar-StatusAgente($tipo, $mensagem, $pendentes = $null) {
    Gravar-JsonAtomico $statusPath @{
        tipo = $tipo
        mensagem = $mensagem
        pendentes = $pendentes
        atualizado = [DateTimeOffset]::UtcNow.ToString('o')
    }
}

function Deve-PararAgente {
    if (Test-Path -LiteralPath $paradaPath) { return $true }
    if ($ResponsavelPid -gt 0 -and -not (Get-Process -Id $ResponsavelPid -ErrorAction SilentlyContinue)) {
        return $true
    }
    return $false
}

function Iniciar-Agente {
    if (-not (Test-Path -LiteralPath $configPath)) {
        throw 'Execute primeiro com -Configurar no usuario do Windows que executara o agente.'
    }
    $mutex = New-Object System.Threading.Mutex($false, 'Local\SaborCearenseAgenteImpressao')
    if (-not $mutex.WaitOne(0)) { $mutex.Dispose(); throw 'O agente ja esta aberto nesta sessao do Windows.' }
    try {
        $config = Ler-Json $configPath
        $token = $null
        while (-not (Deve-PararAgente)) {
            try {
                Atualizar-StatusAgente 'verificando' 'Conectando ao servidor e verificando a impressora.'
                if (-not $token) { $token = Obter-Token $config }
                $headers = @{ Authorization = "Bearer $token" }
                if (Test-Path -LiteralPath $estadoPath) {
                    $estado = Ler-Json $estadoPath
                    if ($estado.status -eq 'incerto') {
                        throw "Pedido #$($estado.numero) requer conferencia. Feche o agente e execute -Resolver."
                    }
                    if ($estado.status -ne 'enviado') { throw 'Estado local invalido; confira o arquivo estado.json.' }
                    Invoke-RestMethod -Method Post -Uri ($config.url + "/api/admin/impressao/$($estado.id)/confirmar") -Headers $headers -TimeoutSec 15 | Out-Null
                    Remove-Item -LiteralPath $estadoPath
                    Write-Host "Pedido #$($estado.numero) confirmado no servidor."
                }
                $configServidor = Invoke-RestMethod -Uri ($config.url + '/api/admin/impressao/configuracao') -Headers $headers -TimeoutSec 15
                if (-not $configServidor.habilitada) { Write-Warning 'Fila automatica desativada no servidor; novos pedidos nao serao adicionados.' }
                $pendentes = Invoke-RestMethod -Uri ($config.url + '/api/admin/impressao/pendentes') -Headers $headers -TimeoutSec 15
                $quantidadePendente = @($pendentes | Where-Object { $null -ne $_ }).Count
                Verificar-Impressora $config.impressora
                foreach ($pedido in $pendentes) {
                    if (Deve-PararAgente) { break }
                    if (-not $pedido.id) { throw 'Resposta invalida da fila de impressao.' }
                    $texto = Converter-ParaTexto $pedido
                    $numero = if ($pedido.numeroPedido) { $pedido.numeroPedido } else { $pedido.id }
                    Verificar-Impressora $config.impressora
                    Atualizar-StatusAgente 'verificando' "Enviando pedido #$numero para a impressora."
                    $estado = @{ id = $pedido.id; numero = $numero; status = 'incerto' }
                    Gravar-JsonAtomico $estadoPath $estado
                    Enviar-ParaImpressora $config.impressora $texto $numero
                    $estado.status = 'enviado'
                    Gravar-JsonAtomico $estadoPath $estado
                    Invoke-RestMethod -Method Post -Uri ($config.url + "/api/admin/impressao/$($estado.id)/confirmar") -Headers $headers -TimeoutSec 15 | Out-Null
                    Remove-Item -LiteralPath $estadoPath
                    Write-Host "Pedido #$numero enviado a impressora e confirmado."
                    $quantidadePendente--
                }
                if ($configServidor.habilitada) {
                    Atualizar-StatusAgente 'operacional' 'Servidor conectado e impressora reconhecida pelo Windows.' $quantidadePendente
                } else {
                    Atualizar-StatusAgente 'alerta' 'Fila automatica desativada no servidor. Novos pedidos nao entrarao na fila.' $quantidadePendente
                }
            } catch {
                $mensagem = $_.Exception.Message
                if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401 -and $config.autenticacao -eq 'dispositivo') {
                    $mensagem = 'Vinculacao encerrada. Baixe um novo instalador pelo painel administrativo.'
                }
                Write-Warning ("{0} - {1}" -f (Get-Date -Format 'dd/MM/yyyy HH:mm:ss'), $mensagem)
                Atualizar-StatusAgente 'erro' $mensagem
                if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) { $token = $null }
            }
            if (Deve-PararAgente) { break }
            Start-Sleep -Seconds 5
        }
    } finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
}

if ($Instalar) { Instalar-Agente }
elseif ($Configurar) { Configurar-Agente }
elseif ($IniciarComWindows) { Instalar-Inicializacao }
elseif ($Resolver) { Resolver-Estado }
elseif ($MyInvocation.InvocationName -ne '.') {
    try { Iniciar-Agente }
    catch {
        try { Atualizar-StatusAgente 'erro' ("O agente parou: " + $_.Exception.Message) }
        catch { Write-Error "Nao foi possivel registrar o erro do agente: $_" }
        throw
    }
}
