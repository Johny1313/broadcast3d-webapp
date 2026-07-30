@echo off
set "BASE_URL=https://SEU-DOMINIO"
set "ROOM=studio"
set "TOKEN=SUA_CHAVE"
curl.exe -fsS "%BASE_URL%/api/cut/1?room=%ROOM%&token=%TOKEN%" >nul
