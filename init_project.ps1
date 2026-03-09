$ErrorActionPreference = "Stop"
$MachinePath = [System.Environment]::GetEnvironmentVariable('Path','Machine')
$UserPath = [System.Environment]::GetEnvironmentVariable('Path','User')
$env:Path = $MachinePath + ';' + $UserPath
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host "Creating frontend..."
npm create vite@latest frontend -- --template react-ts

Write-Host "Creating backend..."
mkdir backend
cd backend
npm init -y
npm install express cors dotenv pg
npm install -D typescript @types/node @types/express @types/cors ts-node-dev prisma
npx tsc --init
npx prisma init
Write-Host "Done!"
