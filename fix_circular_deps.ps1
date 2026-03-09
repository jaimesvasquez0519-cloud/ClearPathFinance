$ErrorActionPreference = "Stop"
$MachinePath = [System.Environment]::GetEnvironmentVariable('Path','Machine')
$UserPath = [System.Environment]::GetEnvironmentVariable('Path','User')
$env:Path = $MachinePath + ';' + $UserPath
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

cd backend/src/controllers
$files = Get-ChildItem -Filter *.ts
foreach ($file in $files) {
    $content = Get-Content $file.FullName
    $content = $content -replace "from '\.\./index(\.js)?'", "from '../db'"
    $content | Set-Content $file.FullName
}
cd ../..
npm run build
npm run dev
