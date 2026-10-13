@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo Broadcast3D v0.8.5 - Deploy com R2
 echo Upload de GLB ate 48 MB por computador
 echo ==========================================
if not exist node_modules call npm install
if errorlevel 1 goto error
call npx wrangler login
if errorlevel 1 goto error
echo.
echo ATENCAO: Crie no Cloudflare R2 o bucket broadcast3d-media.
echo Se o bucket ja existe, continue normalmente.
echo.
call npm run check
if errorlevel 1 goto error
call npm run deploy:r2
if errorlevel 1 goto error
echo.
echo Deploy com R2 realizado. Confira /api/health.
goto done
:error
echo.
echo Falha. Confirme que o bucket broadcast3d-media ja existe.
echo Para cria-lo, use: npx wrangler r2 bucket create broadcast3d-media
:done
pause
