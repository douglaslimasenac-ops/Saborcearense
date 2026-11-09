param([Parameter(Mandatory = $true)][string]$PastaSdk, [Parameter(Mandatory = $true)][string]$Perfil,
    [string]$Impressora, [string]$PreviaPdf)

$ErrorActionPreference = 'Stop'
try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    $core = Join-Path $PastaSdk 'lib\net462\Microsoft.Web.WebView2.Core.dll'
    $forms = Join-Path $PastaSdk 'lib\net462\Microsoft.Web.WebView2.WinForms.dll'
    Add-Type -Path $core
    Add-Type -Path $forms
    $arquitetura = if ([IntPtr]::Size -eq 8) { 'win-x64' } else { 'win-x86' }
    $loader = Join-Path $PastaSdk ("runtimes\$arquitetura\native")
    $codigo = @'
using System;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

public sealed class ComandaWebView : Form {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool SetDllDirectory(string path);
    private readonly WebView2 web = new WebView2();
    private readonly string script;
    private readonly string perfil;
    private readonly string previaPdf;
    private readonly string impressora;
    public string erro;
    public bool sucesso;

    public static void ConfigurarLoader(string pasta) {
        if (!SetDllDirectory(pasta)) throw new System.ComponentModel.Win32Exception();
    }

    public ComandaWebView(string script, string perfil, string impressora, string previaPdf) {
        this.script = script;
        this.perfil = perfil;
        this.previaPdf = previaPdf;
        this.impressora = impressora;
        Controls.Add(web);
        web.Dock = DockStyle.Fill;
        ShowInTaskbar = false;
        Opacity = 0;
    }

    protected override async void OnShown(EventArgs args) {
        base.OnShown(args);
        try {
            var environment = await CoreWebView2Environment.CreateAsync(null, perfil);
            await web.EnsureCoreWebView2Async(environment);
            var view = web.CoreWebView2;
            view.Settings.IsWebMessageEnabled = false;
            view.Settings.AreDevToolsEnabled = false;
            view.Settings.AreDefaultContextMenusEnabled = false;
            view.NewWindowRequested += (sender, e) => { e.Handled = true; };
            view.PermissionRequested += (sender, e) => { e.State = CoreWebView2PermissionState.Deny; };
            view.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
            view.WebResourceRequested += (sender, e) => {
                e.Response = environment.CreateWebResourceResponse(null, 403, "Forbidden", "");
            };
            bool primeiraNavegacao = true;
            view.NavigationStarting += (sender, e) => {
                if (!primeiraNavegacao) e.Cancel = true;
                primeiraNavegacao = false;
            };
            var carregado = new TaskCompletionSource<bool>();
            view.NavigationCompleted += (sender, e) => {
                if (e.IsSuccess) carregado.TrySetResult(true);
                else carregado.TrySetException(new Exception("Nao foi possivel carregar a comanda: " + e.WebErrorStatus));
            };
            view.NavigateToString("<!doctype html><html><head><meta charset='utf-8'>" +
                "<meta http-equiv='Content-Security-Policy' content=\"default-src 'none'; script-src 'none'; style-src 'unsafe-inline'\"></head><body></body></html>");
            await carregado.Task;
            string resultado = await view.ExecuteScriptAsync(script);
            if (resultado != "\"OK\"") throw new Exception("Falha ao renderizar comanda: " + resultado);
            var configuracao = environment.CreatePrintSettings();
            configuracao.MarginTop = 0;
            configuracao.MarginBottom = 0;
            configuracao.MarginLeft = 0;
            configuracao.MarginRight = 0;
            if (!String.IsNullOrEmpty(previaPdf)) {
                configuracao.PageWidth = 80.0 / 25.4;
                configuracao.PageHeight = 11;
                if (!await view.PrintToPdfAsync(previaPdf, configuracao)) throw new Exception("Falha ao gerar a previa.");
            } else {
                var padrao = new System.Drawing.Printing.PrinterSettings().PrinterName;
                if (String.IsNullOrEmpty(impressora) || !String.Equals(padrao, impressora, StringComparison.OrdinalIgnoreCase))
                    throw new Exception("A impressora selecionada deixou de ser a padrao do Windows.");
                configuracao.PrinterName = impressora;
                CoreWebView2PrintStatus status = await view.PrintAsync(configuracao);
                if (status != CoreWebView2PrintStatus.Succeeded) throw new Exception("Falha ao enviar comanda: " + status);
            }
            sucesso = true;
        } catch (Exception ex) {
            erro = ex.Message;
        }
        Close();
    }
}
'@
    Add-Type -TypeDefinition $codigo -ReferencedAssemblies @('System.Windows.Forms', 'System.Drawing', $core, $forms)
    [ComandaWebView]::ConfigurarLoader($loader)
    [Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
    $scriptComanda = [Console]::In.ReadToEnd()
    if (-not $scriptComanda) { throw 'Comanda vazia.' }
    $janela = New-Object ComandaWebView($scriptComanda, $Perfil, $Impressora, $PreviaPdf)
    [System.Windows.Forms.Application]::Run($janela)
    if (-not $janela.sucesso) { throw $janela.erro }
    exit 0
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
