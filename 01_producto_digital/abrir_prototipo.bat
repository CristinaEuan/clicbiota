@echo off
setlocal
cd /d "%~dp0app"
start "Clicbiota - servidor local" cmd /k py -3 -m http.server 8000
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8000
endlocal
