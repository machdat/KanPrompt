@echo off
title KanPrompt Companion Restart
echo.
echo   Stopping existing Companion Server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":9177.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1
echo   Starting KanPrompt Companion Server...
echo.
node "%~dp0kanprompt-companion.js"
pause
