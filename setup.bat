@echo off
REM GRC Flow Setup Script for Windows

echo.
echo ====================================
echo GRC Flow Setup
echo ====================================
echo.

REM Check Node.js
echo Verificando Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Erro: Node.js nao encontrado. Instale Node.js 16^+.
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo Node.js: %%i

REM Check npm
echo Verificando npm...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Erro: npm nao encontrado.
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do echo npm: %%i

REM Install dependencies
echo.
echo Instalando dependencias...
cd backend
call npm install
cd ..

REM Create .env if it doesn't exist
echo.
echo Configurando ambiente...
if not exist "backend\.env" (
    echo Criando arquivo .env...
    copy backend\.env.example backend\.env
    echo IMPORTANTE: Atualize o arquivo backend\.env com suas credenciais!
)

echo.
echo ====================================
echo Proximos passos:
echo ====================================
echo.
echo 1. Configure o PostgreSQL:
echo    - Crie um banco de dados 'grc_flow'
echo    - Crie um usuario 'grc_user'
echo.
echo 2. Execute as migracoes:
echo    npm run db:migrate
echo.
echo 3. ^(Opcional^) Popule com dados de exemplo:
echo    npm run db:seed
echo.
echo 4. Inicie o servidor:
echo    npm run dev
echo.
echo O servidor estara disponivel em: http://localhost:3000
echo.
