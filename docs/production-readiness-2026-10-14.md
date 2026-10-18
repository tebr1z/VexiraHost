# Vexira Host — production hazırlıq siyahısı

Tarix: 14 oktyabr 2026

Bu sənəd hazırkı kod vəziyyətini və Epoint merchant məlumatları gələnədək görülə biləcək işləri ayırır.

## Bu mərhələdə tamamlandı

- Epoint checkout, kart qeydiyyatı, imzalı callback yoxlaması və saxlanmış kart tokeni ilə recurring charge kodu hazırdır.
- Hosting yenilənməsi əvvəl balansı yoxlayır, balans çatmırsa aktiv Epoint kartını sınayır; yenə alınmırsa WhatsApp/e-poçt/saytdaxili faktura linki göndərir.
- Epoint kart tokeni verilənlər bazasında şifrəli saxlanılır və provider yalnız AZN fakturalarına buraxılır.
- Admin paneldə ödəniş provider-i `epoint` seçilə bilir və callback URL göstərilir.
- Next.js production image yalnız `standalone` output-u daşıyır.
- NestJS production image dev dependency və source kod əvəzinə yalnız production dependency, `dist`, Prisma schema/client və migration CLI-ni daşıyır.
- Auto-deploy build context-dən `.git`, `node_modules`, əvvəlki build output-ları və `.env` faylları çıxarılır.
- Next.js build env-i müştəri reposuna yazılmır; BuildKit secret kimi yalnız build addımına mount edilir.
- Uğurlu source deploy-dan sonra istifadə olunmayan image qatları silinir və BuildKit cache 1 GB-la məhdudlaşdırılır.
- Əsas Docker Compose portları yalnız `127.0.0.1`-ə bind edilir, backend/frontend healthcheck-ləri və persistent backend storage volume-u var.

## P0 — canlı satışdan əvvəl bloklayan işlər

### 1. Epoint merchant aktivləşdirməsi

- Epoint müqaviləsi və recurring/card registration icazəsi alınmalıdır.
- `EPOINT_PUBLIC_KEY` və `EPOINT_PRIVATE_KEY` yalnız production secret/env-də yazılmalıdır.
- `PAYMENT_PROVIDER=epoint` edilməlidir.
- Epoint kabinetində callback/result URL `https://api.vexirahost.com/api/v1/payments/epoint/callback` kimi qeyd edilməlidir.
- Return URL-lər canlı domen və HTTPS ilə yoxlanmalıdır.
- Uğurlu kart qeydiyyatı, uğurlu auto-charge, insufficient funds, expired card, səhv imza, təkrar callback və manual payment testləri keçirilməlidir.
- Recurring razılığı, ləğv qaydası, məxfilik mətni və refund/chargeback əməliyyat prosesi təsdiqlənməlidir.

### 2. Real domen registrar provider-i

Hazırda domen axtarışı, qeydiyyat və transfer `MockRegistrarProvider` üzərindədir və production-da fail-closed işləyir. ResellerClub/NameSilo/OpenSRS qərarından sonra real adapter, availability, register, renew, transfer, nameserver və glue əməliyyatları yazılmalıdır. `.az` üçün ayrıca yerli registrar/API müqaviləsi lazım ola bilər.

### 3. `ns1/ns2` canlı infrastruktur

- `ns1.vexirahost.com` və `ns2.vexirahost.com` üçün iki fərqli public IP-də authoritative PowerDNS qurulmalıdır.
- Registrar-da host/glue records yaradılmalıdır.
- Secondary zone transfer/replication, TCP+UDP 53 firewall, DNSSEC və monitorinq yoxlanmalıdır.
- Altı Plesk serveri üçün DNS template və server-IP marşrutlaşdırması canlı sınaqdan keçirilməlidir.

### 4. Production secret və backup yoxlaması

- Əvvəl istifadə edilmiş Kapital credential-ları rotasiya edilməlidir.
- JWT, hosting credential encryption key, SMTP, OAuth, Cloudflare, SSH və database secret-ləri secret manager/env ilə verilməlidir.
- PostgreSQL, Redis, `backend_storage` və WhatsApp sessiyası üçün avtomatik backup/restore sınağı olmalıdır.

## P1 — satışdan dərhal sonra vacib

- VPS satışında real Proxmox adapteri; hazırda provider mock-dur.
- Domen renewal: balans → saxlanmış kart → ödəniş linki ardıcıllığı və registrar renew çağırışı.
- VPS və əlavə xidmətlər üçün vahid renewal engine, grace period və reaktivasiya.
- E-poçt/WhatsApp üçün persistent outbox, retry və admin re-send.
- Plesk reaktivasiya/provision xətaları üçün background retry və admin alarmı.
- Epoint transaction reconciliation, refund və chargeback statuslarının admin panelə düşməsi.
- S3 və ya Cloudflare R2 storage provider-i; hazırkı provider-lər implement edilməyib.

## P2 — məhsul və əməliyyat keyfiyyəti

- Fakturanı bitmə tarixindən 3–7 gün əvvəl yaratmaq və əvvəlcədən xəbərdarlıq etmək.
- Vahid `Subscription` və `RenewalAttempt` tarixçəsi.
- Qiymət artımı, kupon, vergi və mövcud müştərinin köhnə qiymətinin qorunması siyasəti.
- Cloudflare zone snapshot/rollback, request ID və admin retry.
- DNSSEC/DS, CAA, SRV, PTR və SOA funksiyaları.
- Real PostgreSQL concurrency, Epoint callback və tam checkout/renewal browser E2E testləri.
- Auto-deploy üçün zero-downtime start/healthcheck/switch və uğursuz image rollback. Hazırkı axın image-i kiçildir və disk cache-ni məhdudlaşdırır, amma container dəyişimi zamanı qısa kəsinti ola bilər.

## Epoint gələnədək tövsiyə edilən ardıcıllıq

1. Real registrar seçib adapteri və domain renewal-u tamamla.
2. `ns1/ns2` PowerDNS serverlərini və glue record-ları canlı qur.
3. Notification outbox və Plesk retry növbəsini yaz.
4. Backup/restore məşqi və production secret rotasiyasını tamamla.
5. Docker image ölçülərini canlı Linux serverdə `docker images` və `docker system df` ilə ölç, sonra deploy smoke test et.
6. Epoint açarları gələndə sandbox/certification ssenarilərini icra et və yalnız bundan sonra provider-i `epoint` et.
