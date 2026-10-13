@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo  Broadcast3D v0.8.5 - Deploy padrao
 echo  Upload de GLB ate 12 MB sem R2
 echo ==========================================
if not exist node_modules call npm install
if errorlevel 1 goto error
call npx wrangler login
if errorlevel 1 goto error
call npm run check
if errorlevel 1 goto error
call npm run deploy
if errorlevel 1 goto error
echo.
echo Deploy realizado. Confira /api/health para validar a versao.
goto done
:error
echo.
echo Falha no deploy. Confira os erros acima.
:done
pause
