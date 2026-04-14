@echo off
title Detener Invitaciones Digitales
color 0C

set PORT_VITE=3002
set PORT_EXPRESS=3001

echo.
echo ========================================
echo   DETENER SERVIDORES
echo ========================================
echo.

echo  Buscando procesos en puerto %PORT_EXPRESS% (Express)...
set FOUND_EXPRESS=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT_EXPRESS% ^| findstr LISTENING 2^>nul') do (
    echo  [DETENIENDO] Matando proceso PID %%a en puerto %PORT_EXPRESS%...
    taskkill /F /PID %%a >nul 2>&1
    set FOUND_EXPRESS=1
)

if "%FOUND_EXPRESS%"=="0" (
    echo  [INFO] No hay procesos en puerto %PORT_EXPRESS%
)

echo.
echo  Buscando procesos en puerto %PORT_VITE% (Vite)...
set FOUND_VITE=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT_VITE% ^| findstr LISTENING 2^>nul') do (
    echo  [DETENIENDO] Matando proceso PID %%a en puerto %PORT_VITE%...
    taskkill /F /PID %%a >nul 2>&1
    set FOUND_VITE=1
)

if "%FOUND_VITE%"=="0" (
    echo  [INFO] No hay procesos en puerto %PORT_VITE%
)

echo.
echo ========================================
echo  SERVIDORES DETENIDOS
echo ========================================
echo.

pause
