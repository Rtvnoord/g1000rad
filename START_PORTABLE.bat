@echo off
title Grunneger 1000 Rad Generator
color 0A
cls

echo ==========================================
echo   GRUNNEGER 1000 RAD GENERATOR
echo ==========================================
echo.

REM Gebruik portable Node.js als het bestaat
if exist "nodejs\node.exe" (
    set NODE_PATH=%~dp0nodejs
    set PATH=%NODE_PATH%;%PATH%
    echo [OK] Portable Node.js gevonden
) else (
    where node >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Node.js niet gevonden!
        echo.
        echo Installeer Node.js OF plaats de portable Node.js map in:
        echo %~dp0nodejs
        echo.
        pause
        exit /b 1
    )
    echo [INFO] Gebruik systeem Node.js
)

REM Gebruik portable FFmpeg als het bestaat
if exist "ffmpeg\bin\ffmpeg.exe" (
    set FFMPEG_PATH=%~dp0ffmpeg\bin
    set PATH=%FFMPEG_PATH%;%PATH%
    echo [OK] Portable FFmpeg gevonden
) else (
    where ffmpeg >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] FFmpeg niet gevonden!
        echo Video generatie werkt mogelijk niet.
        echo.
    )
)

echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Eerste keer opstarten - installeer dependencies...
    echo Dit kan een paar minuten duren...
    echo.
    if exist "nodejs\npm.cmd" (
        call nodejs\npm.cmd install
    ) else (
        call npm install
    )
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Installatie mislukt!
        pause
        exit /b 1
    )
    echo.
)

echo [INFO] Start server...
echo.
echo ==========================================
echo   Server draait nu!
echo ==========================================
echo.
echo Open je browser en ga naar:
echo.
echo     http://localhost:3000
echo.
echo ==========================================
echo.
echo TIP: Laat dit venster open zolang je de
echo      applicatie gebruikt!
echo.
echo Druk op Ctrl+C om te stoppen
echo ==========================================
echo.

REM Start browser automatically after 2 seconds
timeout /t 2 /nobreak >nul
start http://localhost:3000

REM Start the server
if exist "nodejs\node.exe" (
    nodejs\node.exe server.js
) else (
    node server.js
)

pause
