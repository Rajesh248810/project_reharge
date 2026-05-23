# Cable Operator Assistant - All-In-One Unified Start Script
# This boots up:
# 1. Django Backend API (Port 8000)
# 2. React Frontend Dev Server (Port 5173)
# 3. Embedded Native WhatsApp Gateway (Port 18789)

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "      STARTING CABLE OPERATOR ASSISTANT SERVICES          " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# 1. Start Embedded WhatsApp Gateway
Write-Host "[1/3] Starting Native WhatsApp Gateway on port 18789..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'whatsapp_gateway'; node index.js" -WindowStyle Normal

# 2. Start Django API Backend
Write-Host "[2/3] Starting Django API Backend on port 8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\venv\Scripts\python manage.py runserver" -WindowStyle Normal

# 3. Start React Frontend Server
Write-Host "[3/3] Starting React Frontend Dev Server on port 5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'frontend'; npm run dev" -WindowStyle Normal

Write-Host "----------------------------------------------------------" -ForegroundColor Yellow
Write-Host "All three services are launching in separate windows." -ForegroundColor Yellow
Write-Host "Go to: http://localhost:5173/ to open the dashboard." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
