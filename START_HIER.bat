@echo off
title Grunneger 1000 Rad Generator
color 0A
cls

echo ==========================================
echo   GRUNNEGER 1000 RAD GENERATOR
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is niet geinstalleerd!
    echo.
    echo Download en installeer Node.js van: https://nodejs.org/
    echo Kies de LTS versie en installeer met standaard instellingen.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js gevonden
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Eerste keer opstarten - installeer dependencies...
    echo Dit kan een paar minuten duren...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Installatie mislukt!
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies geinstalleerd
    echo.
)

REM Check if FFmpeg is available
where ffmpeg >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] FFmpeg niet gevonden!
    echo Video generatie werkt mogelijk niet correct.
    echo Download FFmpeg van: https://ffmpeg.org/download.html
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
node server.js

pause
