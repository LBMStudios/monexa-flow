@echo off
title Instalador Monexa Flow
color 06

echo ==================================================
echo         INSTALADOR AUTOMATICO MONEXA FLOW
echo ==================================================
echo.

:: Configuración
set "URL=https://github.com/lbmstudios/monexa-flow/archive/refs/heads/main.zip"
set "TEMP_ZIP=%TEMP%\monexa_temp.zip"
set "DEST_FOLDER=%USERPROFILE%\Documents\MonexaFlow"

echo [1/3] Descargando ultima version...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%URL%' -OutFile '%TEMP_ZIP%'"

echo [2/3] Preparando archivos en su carpeta de Documentos...
if exist "%DEST_FOLDER%" rd /s /q "%DEST_FOLDER%"
powershell -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%DEST_FOLDER%' -Force"

echo [3/3] Abriendo configurador de Chrome...
start chrome "chrome://extensions/"

echo.
echo ==================================================
echo          ¡CASI LISTO! SOLO 2 CLICS MAS:
echo ==================================================
echo 1. Activa el "Modo desarrollador" (arriba a la derecha).
echo 2. Haz clic en "Cargar extension sin empaquetar".
echo 3. SELECCIONA ESTA CARPETA:
echo    %DEST_FOLDER%\monexa-flow-main\extension
echo ==================================================
echo.
pause
