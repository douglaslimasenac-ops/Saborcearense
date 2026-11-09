@echo off
echo Instalacao do agente de impressao Sabor Cearense
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0agente.ps1" -Instalar
if errorlevel 1 (
    echo.
    echo A instalacao ou o agente terminou com erro. Confira a mensagem acima.
    pause
)
