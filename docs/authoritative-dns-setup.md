# Vexira Host authoritative DNS — `ns1/ns2.vexirahost.com`

Tarix: 12 oktyabr 2026

## Məqsəd

Altı Plesk serverindən hansına hosting hesabı yerləşdirilərsə, müştəri domeninin DNS zonası həmin serverin public IP-sinə avtomatik bağlanır. Bütün müştərilər eyni nameserver cütündən istifadə edir:

- `ns1.vexirahost.com` — PowerDNS primary/API node
- `ns2.vexirahost.com` — ayrıca şəbəkədə PowerDNS secondary node

`ns1` və `ns2` eyni maşın və eyni public IP üzərində olmamalıdır. Plesk serverləri web/mail xidmətini verir; authoritative DNS isə onlardan ayrı işləyir.

## Trafik axını

1. Vexira tətbiqi mövcud balanslaşdırma qaydasına görə altı Plesk serverindən birini seçir.
2. Plesk-də webspace yaradılır.
3. Tətbiq PowerDNS API-də domen zonası yaradır və `@`, `www`, `mail`, `MX`, `SPF` qeydlərini seçilmiş Plesk IP-sinə yazır.
4. PowerDNS primary zonanı `ns2` secondary node-a AXFR/NOTIFY ilə ötürür.
5. Müştərinin registrar nameserver-ləri `ns1.vexirahost.com` və `ns2.vexirahost.com` olur.

## Şəbəkə tələbləri

Hər iki DNS node-da public internetdən aşağıdakılar açıq olmalıdır:

- UDP 53 — adi DNS sorğuları
- TCP 53 — böyük DNS cavabları və zone transfer

PowerDNS HTTP API portu (adətən `8081`) public internetə açılmamalıdır. Yalnız Vexira backend-in private/VPN IP-si primary API-yə qoşula bilməlidir.

## Hazır Docker qurulumu

Repo daxilində primary və secondary üçün ayrıca, production-a uyğun Compose paketləri var:

- `deploy/dns/docker-compose.primary.yml`
- `deploy/dns/docker-compose.secondary.yml`
- `deploy/dns/powerdns-schema.sql`
- `deploy/dns/configure-firewall.sh`

Hər iki serverdə `deploy/dns/.env.example` faylını `.env` adı ilə kopyalayın və real, eyni dəyərləri daxil edin. Sonra fərqli serverlərdə müvafiq əmri işlədin:

```bash
# ns1 / primary
docker compose --env-file deploy/dns/.env \
  -f deploy/dns/docker-compose.primary.yml up -d

# ns2 / secondary
docker compose --env-file deploy/dns/.env \
  -f deploy/dns/docker-compose.secondary.yml up -d
```

Compose paketləri PowerDNS `5.0.7` image-ni pin edir, bazanı avtomatik yaradır, primary-də AXFR/NOTIFY-ni yalnız secondary IP-yə açır və secondary-də supermaster qeydini idempotent şəkildə yaradır. Image versiyasını plansız `latest` etiketinə dəyişməyin; əvvəl staging-də schema və transfer testi edin.

Firewall qaydalarını mövcud UFW konfiqurasiyasını silmədən əlavə etmək üçün:

```bash
# primary
sudo bash deploy/dns/configure-firewall.sh primary SECONDARY_PUBLIC_IP BACKEND_PRIVATE_CIDR

# secondary
sudo bash deploy/dns/configure-firewall.sh secondary PRIMARY_PUBLIC_IP
```

Skriptin sonunda çıxan qaydaları nəzərdən keçirin. `8081` üçün `Anywhere` qaydası olmamalıdır.

## Manual konfiqurasiya alternativi

`/etc/powerdns/pdns.conf` üçün əsas parametrlər:

```ini
launch=gpgsql
gpgsql-host=127.0.0.1
gpgsql-dbname=powerdns
gpgsql-user=powerdns
gpgsql-password=CHANGE_ME

primary=yes
api=yes
api-key=CHANGE_TO_A_LONG_RANDOM_SECRET
webserver=yes
webserver-address=10.0.0.10
webserver-port=8081
webserver-allow-from=10.0.0.20/32,127.0.0.1

allow-axfr-ips=SECONDARY_PUBLIC_IP/32
also-notify=SECONDARY_PUBLIC_IP
```

## Secondary nümunə konfiqurasiyası

`ns2` ayrıca serverdə və ayrıca şəbəkə/provider-də qurulmalıdır:

```ini
launch=gpgsql
gpgsql-host=127.0.0.1
gpgsql-dbname=powerdns
gpgsql-user=powerdns
gpgsql-password=CHANGE_ME

secondary=yes
autosecondary=yes
allow-notify-from=PRIMARY_PUBLIC_IP/32
```

Secondary bazasında primary server-i təsdiqləyin:

```sql
INSERT INTO supermasters (ip, nameserver, account)
VALUES ('PRIMARY_PUBLIC_IP', 'ns1.vexirahost.com', 'vexira');
```

PowerDNS versiyasına uyğun rəsmi paket repository-si və həmin versiyanın database schema faylı istifadə edilməlidir.

## Glue/child nameserver qeydiyyatı

`vexirahost.com` domeninin registrar panelində “Register nameserver”, “Child nameserver” və ya “Host records” bölməsində bunları yaradın:

```text
ns1.vexirahost.com -> PRIMARY_PUBLIC_IP
ns2.vexirahost.com -> SECONDARY_PUBLIC_IP
```

Eyni A/AAAA qeydləri `vexirahost.com` zonasının içində də olmalıdır. Glue yalnız burada bir dəfə yaradılır; hər müştəri domenində ayrıca glue yaradılmır.

## Backend environment

```env
POWERDNS_API_URL=http://10.0.0.10:8081/api/v1
POWERDNS_API_KEY=CHANGE_TO_A_LONG_RANDOM_SECRET
POWERDNS_SERVER_ID=localhost
AUTHORITATIVE_NAMESERVERS=ns1.vexirahost.com,ns2.vexirahost.com
POWERDNS_MONITOR_DOMAIN=vexirahost.com
```

Backend monitorinqi primary API-yə qoşulur, `ns1` və `ns2`-yə birbaşa SOA sorğusu göndərir və serialların eyni olduğunu yoxlayır. Migration tətbiq edildikdən və backend yenidən başladıldıqdan sonra admin sistem statusunda “Vexira authoritative DNS” yalnız API, glue və replikasiya birlikdə sağlam olduqda hazır görünür.

## Yoxlama

Test domeni hostingə bağladıqdan sonra:

```bash
dig +short NS example.com
dig @ns1.vexirahost.com example.com A
dig @ns2.vexirahost.com example.com A
dig +trace example.com
```

Hər iki authoritative cavab eyni serial və eyni Plesk IP-sini göstərməlidir. Secondary cavab vermədən nameserver-ləri müştərilərə təqdim etməyin.

Eyni yoxlamanı avtomatik və CI/monitoring üçün exit-code ilə işlətmək olar:

```bash
DNS_TEST_DOMAIN=example.com \
DNS_EXPECTED_ADDRESS=PLESK_SERVER_PUBLIC_IP \
AUTHORITATIVE_NAMESERVERS=ns1.vexirahost.com,ns2.vexirahost.com \
node deploy/dns/verify-authoritative-dns.mjs
```

Altı Plesk serverinin hər biri üçün ayrıca test domeni yaradıb `DNS_EXPECTED_ADDRESS` dəyərini həmin serverin public IP-si ilə yoxlayın. Backend hosting yaradılarkən seçilmiş serverin IP-sini `@`, `www`, `mail`, `MX` və SPF qeydlərinə avtomatik yazır; nameserver cütü dəyişmir.

## Cloudflare ilə münasibət

Müştəri Cloudflare qoşarsa authoritative provider Cloudflare olur və domen Cloudflare-ın verdiyi nameserver-lərə keçir. `ns1/ns2.vexirahost.com` adlarını Cloudflare Free/Pro zonalarında saxlamaq olmur; Cloudflare account custom nameserver funksiyası Business/Enterprise tələb edir.
