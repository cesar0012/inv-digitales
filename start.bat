@echo off
title Invitaciones Digitales - Development Server
color 0A

:: ========================================
:: CONFIGURACION
:: ========================================
set PORT_VITE=3002
set PORT_EXPRESS=3001

echo.
echo ========================================
echo   INVITACIONES DIGITALES - DEV SERVER
echo ========================================
echo.

:: ========================================
:: LIMPIEZA DE PUERTOS
:: ========================================
echo  Limpiando puertos %PORT_EXPRESS% y %PORT_VITE%...

:: Matar procesos en puerto 3001 (Express)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT_EXPRESS% ^| findstr LISTENING 2^>nul') do (
    echo  [LIMPIANDO] Matando proceso PID %%a en puerto %PORT_EXPRESS%...
    taskkill /F /PID %%a >nul 2>&1
)

:: Matar procesos en puerto 3002 (Vite)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT_VITE% ^| findstr LISTENING 2^>nul') do (
    echo  [LIMPIANDO] Matando proceso PID %%a en puerto %PORT_VITE%...
    taskkill /F /PID %%a >nul 2>&1
)

:: Esperar a que los puertos se liberen
echo  Esperando 2 segundos...
timeout /t 2 /nobreak >nul

echo  Puertos liberados correctamente.
echo.

:: ========================================
:: VERIFICACION DE PREREQUISITOS
:: ========================================
echo  Verificando prerequisitos...

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo         Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)
echo  [OK] Node.js instalado

:: Verificar npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm no esta instalado.
    pause
    exit /b 1
)
echo  [OK] npm instalado

:: Cambiar al directorio del script
cd /d "%~dp0"

:: Instalar dependencias si faltan
if not exist "node_modules" (
    echo.
    echo  [INFO] Instalando dependencias...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la instalacion de dependencias.
        pause
        exit /b 1
    )
    echo  [OK] Dependencias instaladas
)

echo.
echo ========================================
echo  INICIANDO SERVIDORES
echo ========================================
echo.
echo  Frontend (Vite):    http://localhost:%PORT_VITE%
echo  Backend (Express):  http://localhost:%PORT_EXPRESS%
echo.
echo  Pagina de prueba:   http://localhost:%PORT_VITE%/test
echo.
echo  Presiona Ctrl+C para detener
echo ========================================
echo.

:: ========================================
:: INICIO DE SERVIDORES
:: ========================================
npm run dev

:: Si falla, mostrar error
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Los servidores fallaron al iniciar.
    echo         Revisa los logs arriba para mas detalles.
    echo.
    pause
    exit /b 1
)

pause
