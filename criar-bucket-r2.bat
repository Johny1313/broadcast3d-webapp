@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
call npx wrangler login
call npx wrangler r2 bucket create broadcast3d-media
echo.
echo Se o bucket ja existia, a mensagem de erro pode ser ignorada.
pause
