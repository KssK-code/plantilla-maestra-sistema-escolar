@echo off
echo.
echo ===============================================
echo    RESPALDO AUTOMATICO - SISTEMA AVANZA
echo ===============================================
echo.

cd /d "%~dp0"

echo 🔄 Ejecutando respaldo automatico...
node respaldo-automatico.cjs

echo.
echo ===============================================
echo           RESPALDO COMPLETADO
echo ===============================================
echo.
echo 📁 Revisa la carpeta "respaldos" para encontrar tu archivo
echo 🌤️ Ahora puedes subir el archivo a tu nube preferida
echo.
pause
