$ErrorActionPreference = "Stop"
$MachinePath = [System.Environment]::GetEnvironmentVariable('Path','Machine')
$UserPath = [System.Environment]::GetEnvironmentVariable('Path','User')
$env:Path = $MachinePath + ';' + $UserPath
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

cd backend
npm install @prisma/client
npx prisma generate
