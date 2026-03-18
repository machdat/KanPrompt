@echo off
title KanPrompt Companion Restart
echo.
echo   Stopping existing Companion Server...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr "LISTENING" ^| findstr "127.0.0.1:9177"') do (
  if %%a GTR 0 (
    echo   Killing PID %%a...
    taskkill /F /PID %%a >nul 2>&1
  )
)
echo   Waiting for port release...
timeout /t 2 /nobreak >nul
echo   Starting KanPrompt Companion Server...
echo.
node --no-deprecation "%~dp0kanprompt-companion.js"
pause
