# Vexira Host — SSH + Docker deploy (Plesk server)

Serverdə Plesk var. SSH ilə girib Docker Compose işə salırsan. Plesk Node.js istifadə etmə.

---

## 1) SSH

```bash
ssh USER@SERVER_IP
```

---

## 2) Docker yoxla / quraşdır

```bash
docker -v
docker compose version
```

Yoxdursa (root):

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

---

## 3) Kodu yüklə

```bash
cd /var/www
git clone REPO_URL VexiraHost
cd VexiraHost
```

(və ya lokalda ZIP/SCP ilə bütün monorepo-nu `/var/www/VexiraHost` qovluğuna köçür)

---

## 4) Env

```bash
cd /var/www/VexiraHost
cp deploy/.env.docker.example deploy/.env.docker
nano deploy/.env.docker
```

Dəyiş:
- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `HOSTING_CREDENTIALS_KEY`
- Epoint / Kapital / SMTP / OAuth (lazımdırsa)

`HOSTING_CREDENTIALS_KEY` dəyərini bütün backend proseslərində eyni saxlayın və yeniləmə zamanı dəyişməyin: bazadakı Plesk, API token və SSH şifrələri bu açarla şifrələnir. Mövcud `deploy/.env.docker` faylını yeniləmədə nümunə faylla əvəz etməyin. Açar artıq dəyişibsə, əvvəlki açarı bərpa edin və ya admin → Hosting serverləri → serveri redaktə et bölməsində cari Plesk və SSH şifrələrini yenidən daxil edib yadda saxlayın. Yeni Plesk şifrəsi ilə API tokeni boş buraxıldıqda köhnə token silinir; yeni token də daxil edilərsə, API bağlantısı həmin tokendən istifadə edir. Sonra bağlantını və SSH-ni yoxlayın. Bu forma serverin öz şifrəsini dəyişmir; Plesk/SSH-də hazırda qüvvədə olan şifrəni daxil edin.

---

## 5) Docker start

```bash
cd /var/www/VexiraHost
docker compose -f docker/docker-compose.yml --env-file deploy/.env.docker up -d --build
```

Yoxla:

```bash
docker compose -f docker/docker-compose.yml ps
docker logs vexira-backend --tail 50
docker logs vexira-frontend --tail 50
```

Portlar:
- Frontend → `127.0.0.1:3000`
- Backend → `127.0.0.1:4000`

Bu portlar yalnız localhost-a bind olunur; internet trafiki Plesk reverse proxy-dən keçməlidir.

---

## 6) Plesk reverse proxy + SSL

### Domain: `vexirahost.com` → frontend

Plesk → Domains → vexirahost.com → Apache & nginx → **Additional nginx directives**:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Domain: `api.vexirahost.com` → backend

```nginx
location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Sonra hər iki domaində **SSL It!** / Let's Encrypt aktiv et.

---

## 7) Yeniləmə

```bash
cd /var/www/VexiraHost
git pull
docker compose -f docker/docker-compose.yml --env-file deploy/.env.docker up -d --build
```

Production image-ləri multi-stage qurulur:

- frontend yalnız Next.js `standalone` output-u daşıyır;
- backend yalnız `dist`, Prisma schema/client və production dependency-ləri daşıyır;
- build alətləri və dev dependency-lər runtime image-ə keçmir;
- pnpm store BuildKit cache-də saxlanır, ona görə təkrar build daha sürətli olur.

Disk istifadəsini yoxla:

```bash
docker system df
docker images vexira-host-backend vexira-host-frontend
```

Köhnə, heç bir container tərəfindən istifadə olunmayan image qatlarını təhlükəsiz təmizlə və build cache-i 1 GB-la məhdud saxla:

```bash
docker image prune -f
docker builder prune -f --keep-storage 1GB
```

`docker system prune -a --volumes` istifadə etmə: database, Redis və WhatsApp məlumat volume-larını riskə ata bilər. Backend upload/storage məlumatı `backend_storage`, WhatsApp sessiyası `whatsapp_auth` volume-unda qalır.

---

## Əmrlər

```bash
# Log
docker logs -f vexira-backend
docker logs -f vexira-frontend

# Stop / start
docker compose -f docker/docker-compose.yml --env-file deploy/.env.docker stop
docker compose -f docker/docker-compose.yml --env-file deploy/.env.docker start

# Tam dayandır (DB qalır)
docker compose -f docker/docker-compose.yml --env-file deploy/.env.docker down
```

---

## Qısa checklist

1. SSH
2. Docker quraşdır
3. Monorepo `/var/www/VexiraHost`
4. `deploy/.env.docker` doldur
5. `docker compose ... up -d --build`
6. Plesk proxy: `:3000` və `:4000`
7. SSL

## Məhsul səhifələri və dillər

Məhsulların sabit, ada uyğun URL-i `products.publicSlug` sahəsində saxlanır. `20261024150000_product_public_slugs` miqrasiyası əvvəlki məhsullar üçün bu sahəni doldurur, eyni adlı məhsulları fərqləndirir və sifarişlərin istifadə etdiyi daxili `slug`/ID-ni dəyişmir. Backend konteyneri başladıqda mövcud entrypoint miqrasiyanı avtomatik tətbiq edir; həm backend, həm frontend image-lərini yeniləyin. Köhnə məhsul ünvanları yeni canonical ünvana yönləndirilir.

AZ, EN, RU, TR, DE və ES marşrutları dəstəklənir. İngilis dili əsas URL-dədir; digər dillər `/az`, `/ru`, `/tr`, `/de`, `/es` prefikslərindən istifadə edir. Yeni dillərdə CMS-ə daxil edilmiş mətn tərcüməsi yoxdursa, mövcud ingilis məzmunu göstərilir. Alman və ispan dili üçün alış, hosting və naviqasiya mətnləri tərcümə olunub; idarəetmə paneli və mövcud e-poçt şablonlarında ingilis dili ehtiyat variantdır.

Serverdən kataloq sorğuları Docker şəbəkəsində `API_INTERNAL_URL=http://backend:4000/api/v1` ünvanından istifadə edir. Bu ünvan brauzerə ötürülmür.


### Project proposals and deploy secret recovery

The homepage development cards link to `/project-quote?service=web|mobile|desktop`.
The six-language configurator sends the selected scope and preliminary AZN estimate with the customer's message through the existing protected contact form. It does not charge or create a cart order.
Initial defaults live in `packages/types/src/project-quote.ts`; after the first admin save, database settings are authoritative: landing 399, company 799, store 1499, web MVP 2499, mobile MVP 2999, desktop MVP 1999 AZN. Extra pages/screens are 35 AZN, each additional UI language is 100 AZN (content translation separate); feature prices are listed in the same module. Included features are never charged twice.
All packages include one non-premium .com/.net domain and standard hosting with SSL for the first year. Landing/company include 6 months of agreed-scope defect and security support; other packages include 12 months. Renewals, new features and third-party subscriptions are separate and require agreement.
Pricing rationale (24 October 2026): entry-level local providers advertise 299/599/1299 AZN at https://c0der.pro/az/qiymetler; https://techgroup.az/bloq/veb-sayt-hazirlanmasi-ne-qederdir-2026-ci-ilde-qiymetler-ve-esas-amiller-ac5f lists landing 300–800, small business 500–1500 and stores 1500–5000+ AZN. These are Vexira's proposed starting prices, not promises of a fully custom enterprise system.

If Auto Deploy fails after `Runtime: PM2` with `Unsupported state or unable to authenticate data` after changing `HOSTING_CREDENTIALS_KEY`, the stored application `envVarsEnc` may still use the old key. Plesk/SSH passwords and application environment variables are separate encrypted records.

1. Keep the active encryption key stable. Restore the original valid key from a secure backup if all old values must be recovered. Changing keys again can make newly saved values unreadable.
2. Open the affected application's Environment settings. Unreadable saved variables now have a warning and require explicit replacement confirmation; they are never silently presented as an empty environment.
3. Re-enter the complete original application `.env`, including database URLs and signing secrets, confirm replacement, and choose **Save & redeploy**. This encrypts the replacement with the active key and rebuilds public frontend variables too. Do not submit backend/server credentials in the application form unless the application actually needs them.
4. If the next error names the GitHub token, reconnect GitHub through Auto Deploy. Server SSH/Plesk credentials are re-entered separately in the admin hosting-server settings.

Deploy validates the encrypted environment before remote port/domain changes, including jobs already in the queue. Recovery requires the old key or original plaintext values; unreadable ciphertext cannot be recovered by retries.


### Admin-managed project pricing

Open **Admin → Project pricing** at `/az/t4abriz/panel/project-pricing` (also available in EN/TR/RU/DE/ES). The area and its GET/PUT API `/api/v1/admin/project-pricing` require an authenticated administrator; staff/customer sessions cannot change these rates.

- Edit each package's base AZN price, a percentage or fixed-AZN discount, included pages/screens, free features, and support period. Discounts apply only to the base package. Additional pages, languages and features use their separate rates; included features are not charged again.
- The Add-ons & gifts tab manages the seven extra rates and domain/hosting gift periods. A zero gift/support period removes that benefit. Scope descriptions and the customer preview follow the selected package's saved configuration.
- Save publishes one complete, validated price list atomically to the existing `system_settings` table under `project_pricing_v1`. This feature needs no new database migration. Concurrent edits are rejected instead of overwriting a newer version. Revert only discards the current draft.
- Public `/api/v1/project-pricing` reads the database without a cache. The server-rendered calculator fetches it with `no-store`: publishing a price requires no frontend rebuild or redeploy. Defaults are used only before any settings have been saved. A missing API or unreadable saved list pauses pricing instead of advertising stale defaults.
- Proposal submissions carry the selection and pricing revision, never a trusted client total. The backend recalculates from the saved list. If prices changed, the form asks the visitor to refresh and review the estimate before sending, keeping their brief and selections.

Deploy the new backend API before or together with the frontend. Existing live prices stay at the initial defaults until an admin saves changes. UI test fixtures and their example discounts are local scratch data and are not production settings.


### Hosting domain selection and additional locales

Hosting details first ask for a new domain, transfer or existing domain, then billing duration and cart. New registration and transfer quotes require an active matching TLD price and confirmed registrar availability. Zero or missing prices, premium names and unsupported extensions are rejected. Existing domains carry no purchase fee.

Domain registration/transfer is a **team-processed service after payment**. It is not an immediate registrar API call from checkout. The operator must confirm the invoice is PAID, process the registration or transfer in the registrar, record it under the customer's Domains, and contact the customer for an unlocked domain and EPP code for transfers. Never put EPP codes in order notes. Domain requests and their separate one-time fees appear in customer and admin order details and invoice lines. Hosting renewal prices and product promotions exclude these fees. Availability at checkout is not a reservation; resolve registrar failures with the customer before delivering the domain.

French (`fr`), Italian (`it`) and Portuguese (`pt`) routes, language selection and public purchase/proposal messages are included. Admin and untranslated CMS/editorial content retain the English fallback. Authentication email templates still use the four original languages, with English fallback for other locales. Language changes retain query parameters and anchors.

Auto Deploy storage prerequisite: `DEPLOY_BASE_PATH` (default `/var/www/vexira-deploy`) must resolve to an XFS filesystem with **both user and project quota accounting and enforcement enabled** (`uquota,prjquota`). Inspect first with `findmnt -T /var/www/vexira-deploy -o TARGET,SOURCE,FSTYPE,OPTIONS` and `lsblk -f`. On XFS, inspect `xfs_quota -x -c 'state' <mountpoint>`. Do not format an existing Plesk filesystem or blindly remount a shared server. Existing ext4 storage requires a planned move to a suitable separate XFS volume/node; XFS with disabled accounting requires a planned mount/boot configuration change. Restarting the application alone does not enable filesystem quotas.


### Kapital Bank hosted payment window

Cart checkout and invoice card payments open Kapital's own HPP in a native dialog. The iframe accepts only HTTPS `/flex` URLs on `e-commerce.kapitalbank.az` or `txpgtst.kapitalbank.az`, with a bank order ID/password. Card entry remains inside the bank origin; no PAN/CVV fields, collection endpoints or card storage are added to Vexira Host.

This does **not** override bank framing restrictions. Kapital must permit the merchant's HPP to be framed by the storefront origin. An unauthenticated GET to `/flex` returned HTTP 403 with `X-Frame-Options: SAMEORIGIN` during the 24 October 2026 preliminary check; this does not prove what a valid merchant session will allow. The dialog always provides **Open bank page**, reusing the exact same payment in a new tab if embedding or 3DS is blocked. Never strip/proxy bank security headers or serve the bank's form through Vexira's origin.

Authenticated `GET /api/v1/payments/kapital/:paymentId/status` checks payment ownership and re-verifies the bank order ID, fully paid state, amount and currency. Responses are `no-store`, in-flight checks are combined and short cached per user/payment. The window checks every 5 seconds while visible, then pauses automatic checks after 10 minutes; manual checks remain possible. Returning iframe messages only trigger a server check and never authorize fulfilment.

Closing the window does not cancel or mark a payment failed. Cart users return to the existing invoice. Paying that invoice again reopens its pending Kapital order; failed/expired orders may start a new one after server verification. An unreadable pending reference or changed amount stops a new charge for manual review. Callback/poll races claim completion atomically, so only one fulfils the payment. Deploy backend and frontend together; no database migration or credential changes are required for this feature.
