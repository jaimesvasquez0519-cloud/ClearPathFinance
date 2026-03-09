$ErrorActionPreference = "Stop"
$MachinePath = [System.Environment]::GetEnvironmentVariable('Path','Machine')
$UserPath = [System.Environment]::GetEnvironmentVariable('Path','User')
$env:Path = $MachinePath + ';' + $UserPath
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host "Setting up backend..."
cd backend
npm init -y
npm install express cors dotenv pg
npm install -D typescript @types/node @types/express @types/cors ts-node-dev prisma
npx tsc --init
npx prisma init
Write-Host "Done setting up backend!"
