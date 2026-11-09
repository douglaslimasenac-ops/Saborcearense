@echo off
start "" powershell.exe -STA -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%~dp0interface.ps1" -InstalarInterface
