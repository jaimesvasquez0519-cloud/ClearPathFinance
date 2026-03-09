$ErrorActionPreference = "Stop"
$MachinePath = [System.Environment]::GetEnvironmentVariable('Path','Machine')
$UserPath = [System.Environment]::GetEnvironmentVariable('Path','User')
$env:Path = $MachinePath + ';' + $UserPath
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

cd backend
# Stop any node processes that might hold locks
Stop-Process -Name "node" -ErrorAction SilentlyContinue
Stop-Process -Name "ts-node-dev" -ErrorAction SilentlyContinue

Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue

npm install
npm install prisma@5 @prisma/client@5
npx prisma generate
