@echo off
set "BASE_URL=https://SEU-WORKER.workers.dev"
set "ROOM=studio"
set "TOKEN=SUA_CHAVE"
curl.exe -s "%BASE_URL%/play?room=%ROOM%&token=%TOKEN%" >nul
