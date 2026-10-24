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
