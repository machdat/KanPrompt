@echo off
title KanPrompt Companion
echo.
echo   Stopping existing Companion Server...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr "LISTENING" ^| findstr "127.0.0.1:9177"') do (
  if %%a GTR 0 (
    echo   Killing PID %%a...
    taskkill /F /T /PID %%a >nul 2>&1
  )
)

echo   Waiting for port release...
set /a TRIES=0
:waitloop
netstat -aon 2>nul | findstr "LISTENING" | findstr "127.0.0.1:9177" >nul 2>&1
if %errorlevel%==0 (
  set /a TRIES+=1
  if %TRIES% GEQ 15 (
    echo   FEHLER: Port 9177 nach 15s noch belegt!
    pause
    exit /b 1
  )
  timeout /t 1 /nobreak >nul
  goto waitloop
)

echo   Port frei. Starte Companion Server...
echo.
node --no-deprecation "%~dp0kanprompt-companion.js"
pause
