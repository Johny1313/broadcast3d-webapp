@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
call npx wrangler login
call npm run deploy
pause
