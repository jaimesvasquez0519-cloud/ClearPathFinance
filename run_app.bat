@echo off
echo Starting ClearPath Finance...

:: Start Backend
start "ClearPath Backend" powershell -ExecutionPolicy Bypass -Command "cd backend; npm run dev"

:: Start Frontend
start "ClearPath Frontend" powershell -ExecutionPolicy Bypass -Command "cd frontend; npm run dev"

echo.
echo Servers are being started in separate windows.
echo - Backend: http://localhost:5000
echo - Frontend: http://localhost:3000
echo.
echo Note: If the browser doesn't open automatically, please visit http://localhost:3000
echo.
pause
