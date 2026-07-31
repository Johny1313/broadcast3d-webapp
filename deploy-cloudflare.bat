@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
call npx wrangler login
call npx wrangler r2 bucket create broadcast3d-media
call npm run check
call npm run deploy
pause
