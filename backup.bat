@echo off
title Respaldo - Invitaciones Digitales
color 0B

set "SOURCE=%~dp0"
set "DEST=C:\Users\Usuario\Documents\Linksocially\respaldo-invitaciones-digitales"
set "DATESTAMP=%date:~-4,4%%date:~-7,2%%date:~-10,2%"
set "TIMESTAMP=%time:~0,2%%time:~3,2%"
set "TIMESTAMP=%TIMESTAMP: =0%
set "BACKUP_DIR=%DEST%_%DATESTAMP%_%TIMESTAMP%"

echo.
echo ========================================
echo   RESPALDO - INVITACIONES DIGITALES
echo ========================================
echo.
echo  Origen: %SOURCE%
echo  Destino: %BACKUP_DIR%
echo.
echo  Excluyendo:
echo   - node_modules
echo   - .git
echo   - dist
echo   - server\storage
echo.
echo ========================================
echo.

if exist "%BACKUP_DIR%" (
    echo [ERROR] El directorio de respaldo ya existe.
    pause
    exit /b 1
)

echo [1/3] Creando directorio de respaldo...
mkdir "%BACKUP_DIR%"
if errorlevel 1 (
    echo [ERROR] No se pudo crear el directorio de respaldo.
    pause
    exit /b 1
)

echo [2/3] Copiando archivos...
echo.

robocopy "%SOURCE%" "%BACKUP_DIR%" /E /XD node_modules .git dist server\storage /NFL /NDL /NJH /NJS /nc /ns /np

echo.
echo [3/3] Creando archivo de informacion...

echo Respaldo creado: %DATESTAMP% %TIMESTAMP% > "%BACKUP_DIR%\_RESPALDO_INFO.txt"
echo. >> "%BACKUP_DIR%\_RESPALDO_INFO.txt"
echo Archivos incluidos: >> "%BACKUP_DIR%\_RESPALDO_INFO.txt"
echo  - Codigo fuente (App.tsx, components/, services/, etc.) >> "%BACKUP_DIR%\_RESPALDO_INFO.txt"
echo  - Configuracion (package.json, vite.config.ts, tsconfig.json, etc.) >> "%BACKUP_DIR%\_RESPALDO_INFO.txt"
echo  - Archivos de servidor (server/) >> "%BACKUP_DIR%\_RESPALDO_INFO.txt"
echo. >> "%BACKUP_DIR%\_RESPALDO_INFO.txt"
echo Excluidos: >> "%BACKUP_DIR%\_RESPALDO_INFO.txt"
echo  - node_modules/ (dependencias) >> "%BACKUP_DIR%\_RESPALDO_INFO.txt"
echo  - .git/ (control de versiones) >> "%BACKUP_DIR%\_RESPALDO_INFO.txt"
echo  - dist/ (build) >> "%BACKUP_DIR%\_RESPALDO_INFO.txt"
echo  - server/storage/ (datos de usuario) >> "%BACKUP_DIR%\_RESPALDO_INFO.txt"

echo.
echo ========================================
echo   RESPALDO COMPLETADO
echo ========================================
echo.
echo  Ubicacion: %BACKUP_DIR%
echo.

for /f %%A in ('dir /s /a-d "%BACKUP_DIR%" 2^>nul ^| find "File(s)"') do set FILECOUNT=%%A
echo  Archivos respaldados: %FILECOUNT%
echo.

pause
