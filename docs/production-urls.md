# Vexira Host — canlı URL-lər

Tək yer: [`deploy/URLS.env`](../deploy/URLS.env)

| Servis   | URL |
|----------|-----|
| Frontend | `https://vexirahost.com` |
| Backend  | `https://api.vexirahost.com` |
| API      | `https://api.vexirahost.com/api/v1` |

## Harada tətbiq olunur

1. **Frontend** — `apps/frontend/.env.production` (şablon: `.env.production.example`)
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_API_URL`

2. **Backend** — `apps/backend/.env` (şablon: `.env.production.example`)
   - `APP_URL`, `API_URL`, `API_PUBLIC_URL`, `CORS_ORIGINS`
   - OAuth callback URL-ləri
   - Kapital `KAPITAL_REDIRECT_URL` / `KAPITAL_RETURN_URL`

## URL dəyişəndə

1. `deploy/URLS.env` içində dəyərləri yenilə
2. Frontend + backend `.env` fayllarına eyni URL-ləri köçür
3. Google OAuth konsolda callback URL-i yenilə
4. Frontend-i yenidən build et (`NEXT_PUBLIC_*` build zamanı yazılır)
5. Backend-i restart et
