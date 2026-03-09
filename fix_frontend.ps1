$ErrorActionPreference = "Stop"
$MachinePath = [System.Environment]::GetEnvironmentVariable('Path','Machine')
$UserPath = [System.Environment]::GetEnvironmentVariable('Path','User')
$env:Path = $MachinePath + ';' + $UserPath
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

cd frontend
npx tailwindcss init -p
npm install @tanstack/react-query react-router-dom zustand recharts lucide-react axios clsx tailwind-merge date-fns react-hook-form @hookform/resolvers zod --legacy-peer-deps
