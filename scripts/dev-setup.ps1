# PowerShell development setup script for Windows
$ErrorActionPreference = "Stop"

Write-Host "Starting Vexira Host development environment..." -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Host "Creating root .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

if (-not (Test-Path "apps/backend/.env")) {
    Write-Host "Creating apps/backend/.env from .env.example..." -ForegroundColor Yellow
    Copy-Item "apps/backend/.env.example" "apps/backend/.env"
}

if (-not (Test-Path "apps/frontend/.env.local")) {
    Write-Host "Creating apps/frontend/.env.local from .env.example..." -ForegroundColor Yellow
    Copy-Item "apps/frontend/.env.example" "apps/frontend/.env.local"
}

Write-Host "Starting infrastructure (PostgreSQL, Redis)..." -ForegroundColor Cyan
docker compose -f docker/docker-compose.dev.yml up -d

Write-Host "Installing dependencies..." -ForegroundColor Cyan
pnpm install

Write-Host "Generating Prisma client..." -ForegroundColor Cyan
pnpm --filter @vexira/backend prisma:generate

Write-Host "Development environment ready!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:  pnpm --filter @vexira/frontend dev"
Write-Host "  Backend:   pnpm --filter @vexira/backend dev"
Write-Host "  All apps:  pnpm dev"
