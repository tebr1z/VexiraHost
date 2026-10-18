# Vexira Host — texniki audit və abunəlik planı

Tarix: 11 oktyabr 2026

## 12 oktyabr təhlükəsizlik və keyfiyyət yeniləməsi

- Source kodda saxlanmış Kapital Bank production giriş məlumatları çıxarıldı. Admin status API-si artıq mövcud parolu brauzerə qaytarmır; yalnız parolun konfiqurasiya edilib-edilmədiyini göstərir. Əvvəl istifadə olunmuş production məlumatları bank tərəfində rotasiya edilməlidir.
- Ödəniş, registrar, Proxmox, hosting panel və add-on mock provider-ləri production mühitində əməliyyatı saxta uğurlu göstərə bilmir; `503` ilə fail-closed işləyir.
- `DEPLOY_MOCK_REMOTE=true` production başlanğıcında qəbul edilmir.
- “Add mock card” UI və API axını silindi. Kartla checkout birbaşa Kapital Bank HPP/3D Secure yönləndirməsindən istifadə edir; kart məlumatları Vexira Host-da saxlanmır.
- Renewal fakturalarına DB səviyyəsində unikal idempotency açarı əlavə edildi. Bir neçə backend instansı eyni hosting/domen dövrü üçün yalnız bir faktura yarada bilər.
- Next.js ESLint inteqrasiyası aktivləşdirildi, adi `<img>` istifadələri `next/image` ilə əvəzləndi və frontend lint sıfır xəbərdarlığa endirildi.

## Bu mərhələdə tamamlananlar

- Yeni alınan aylıq və illik hostinglər üçün bitmə tarixi, yenilənmə məbləği və valyuta avtomatik yazılır.
- Əvvəllər yaradılmış, amma yenilənmə məlumatı boş qalmış avtomatik hostinglər lifecycle işi zamanı təhlükəsiz şəkildə tamamlanır.
- Aylıq dövr təqvim ayı ilə hesablanır. Məsələn, 31 yanvarın növbəti dövrü 28/29 fevral olur; sabit 30 gün istifadə edilmir.
- Müddət bitəndə yenilənmə fakturası yaradılır və balans fakturanın tam məbləğinə çatırsa ödəniş avtomatik tutulur.
- Balans tam çatmırsa qismən pul tutulmur. Hosting dayandırılır, 7 günlük möhlət verilir və birbaşa faktura linki göndərilir.
- Ödəniş bildirişi e-poçt, saytdaxili bildiriş və təsdiqlənmiş nömrələr üçün WhatsApp vasitəsilə göndərilir.
- Telefon bildiriş kanalı kimi layihədə mövcud olan WhatsApp sistemi seçilib; ayrıca klassik SMS provayderi tələb edilmir.
- Möhlət ərzində istifadəçi balansını artırarsa sistem hər lifecycle dövründə yenidən yoxlayır, məbləği tutur və hostinqi paneldə yenidən aktivləşdirir.
- Möhlət bitəndə ödənməmiş faktura ləğv edilir, panel hesabı və ona bağlı deploy-lar silinir.
- Balans və faktura əməliyyatlarında paralel sorğuların ikiqat pul tutmasının qarşısını almaq üçün verilənlər bazası kilidləri əlavə olunub.
- Checkout-da balans kifayət edirsə balans ödənişi ilkin seçim olur.
- E-poçtdakı yenilənmə düyməsi ümumi faktura siyahısına yox, konkret fakturaya aparır.

## Domen, DNS və Cloudflare üzrə tamamlananlar

- İstifadəçi domen detalında DNS, nameserver, glue record və Cloudflare üçün ayrı idarəetmə bölmələri yaradılıb.
- A, AAAA, CNAME, MX, TXT və NS qeydləri paneldən əlavə edilə, dəyişdirilə və silinə bilir; toplu zone import/export dəstəklənir.
- DNS məlumatları serverdə normallaşdırılır; IP/hostname, dublikat, CNAME/NS konflikti, MX prioriteti, TTL və maksimum qeyd sayı yoxlanılır.
- Cloudflare API tokeni yalnız backend-də saxlanılır. Mövcud zone tapılır, icazə və account ID varsa yeni zone yaradılır.
- Cloudflare-a qoşularkən uzaqdakı qeydlər varsa təhlükəsiz şəkildə lokal bazaya import edilir; boş zone olduqda lokal qeydlər Cloudflare-a ötürülür.
- Sonrakı DNS dəyişiklikləri Cloudflare-a yazıldıqdan sonra lokal bazada saxlanılır. Sinxronlaşdırma, status, son sync vaxtı və ayrılma əməliyyatları əlavə edilib.
- A, AAAA və CNAME qeydləri üçün Cloudflare proxy (“narıncı bulud”) seçimi əlavə edilib. Proxy aktiv olduqda Cloudflare TTL-i avtomatik idarə edir.
- Cloudflare-dan ayrılma zone-u və uzaqdakı qeydləri silmir; məlumat itkisinin qarşısını alan təhlükəsiz disconnect tətbiq olunub.
- Cloudflare qoşulmuş domendə nameserver-in adi formadan dəyişdirilməsi bloklanır; əvvəlcə inteqrasiya ayrılmalıdır.
- Admin panelində bütün domenlər üçün axtarışlı inventar yaradılıb; müştəri, status, idarəetmə növü, DNS provider, qeyd sayı, gözləyən dəyişiklik və bitmə tarixi görünür.
- Admin istifadəçi detalında həm manual, həm registrar domenləri görünür; Cloudflare vəziyyəti və sistem konfiqurasiya statusu admin panelində göstərilir.
- PowerDNS authoritative provider əlavə edilib. Hosting hansı Plesk serverinə yerləşdirilirsə `@`, `www`, `mail`, `MX` və SPF qeydləri həmin server IP-sinə avtomatik bağlanır; admin sistem səhifəsində `ns1/ns2` hazırlığı görünür.
- İstifadəçi nameserver formunun yanlış glue endpoint-inə getməsi düzəldilib; managed DNS istifadə ediləndə NS/glue dəyişiklikləri bloklanır.

## Domen/DNS üzrə növbəti mərhələ

### 1. Real registrar adapteri hələ yoxdur

Domen qeydiyyatı və registrar nameserver əməliyyatları hazırda mock provider üzərindədir. Cloudflare zone yaradılsa belə registrar tərəfində verilmiş Cloudflare nameserver-lərinin avtomatik yazılması üçün real registrar API adapteri lazımdır.

Reseller müqayisəsi və tövsiyə ayrıca `docs/domain-reseller-plan-2026-10-12.md` sənədindədir. Başlanğıc provider namizədi ResellerClub, aşağı həcm üçün qiymət alternativi NameSilo, geniş ccTLD portfeli üçün isə OpenSRS/CentralNic-dir.

### 2. DNSSEC və əlavə record tipləri yoxdur

DNSSEC/DS aktivləşdirmə, CAA, SRV, PTR və SOA görüntüləmə bu mərhələyə daxil edilməyib. Növbəti addımda registrar DS sinxronlaşdırması, açar rotasiyası və DNSSEC status yoxlaması əlavə edilməlidir.

### 3. Cloudflare əməliyyat audit və rollback-i genişləndirilməlidir

Hazırda tətbiq səviyyəsində domen dəyişiklik izi var, amma zone snapshot/rollback, Cloudflare request ID, detallı provider xəta tarixçəsi və admin tərəfindən retry əməliyyatı yoxdur.

### 4. Cloudflare-in digər funksiyaları ayrıca məhsul mərhələsidir

SSL rejimi, cache purge, WAF qaydaları, analytics və bot qoruması üçün ayrıca icazə modeli və UI tələb olunur. DNS tokeninə lazımsız geniş səlahiyyət verilməməlidir.

## Kritik — yayımdan əvvəl tamamlanmalıdır

### 1. Tamamlandı — istehsalatda mock provayderə düşmə qoruması

Mock provider-lər production-da artıq əməliyyatı tamamlamır. Real adapter konfiqurasiya olunmayıbsa istifadəçiyə xidmətin hazır olmadığı qaytarılır; deploy simulyasiyası isə production start zamanı bloklanır.

### 2. Kod tamamlandı — Epoint merchant aktivləşdirməsi gözlənilir

Epoint kart qeydiyyatı, imzalı callback, şifrəli token saxlanması və sonrakı recurring charge axını əlavə edilib. Hosting yenilənməsi balans çatmadıqda aktiv Epoint kartını sınayır; ödəniş yenə alınmasa faktura linki göndərilir. Provider yalnız AZN fakturaları qəbul edir.

Canlıya çıxış üçün Epoint müqaviləsi, recurring/card registration icazəsi, production public/private key-lər, callback qeydiyyatı və sandbox/certification testləri qalır. Cari siyahı: `docs/production-readiness-2026-10-14.md`.

## Yüksək prioritet

### 5. Domen yenilənməsi balansdan avtomatik tutulmur

Domen lifecycle sistemi xatırlatma, gecikmə haqqı, faktura və grace period dəstəkləyir, amma yalnız manual domenləri emal edir və balansdan avtomatik ödəniş etmir. Registrar vasitəsilə alınan domenlərin avtomatik uzadılması ayrıca yoxlanmalıdır.

### 6. VPS və dedicated server üçün renewal axını yoxdur

Server müddəti bitəndə yalnız `SUSPENDED` olur. Renewal fakturası, balans ödənişi, grace period, bildiriş və ödənişdən sonra reaktivasiya modeli yoxdur. `Server` modelində bunun üçün `autoRenew`, `billingAmount`, `billingCurrency`, `renewalInvoiceId` və `graceEndsAt` sahələri də yoxdur.

### 7. Əlavə xidmətlər üçün renewal axını yoxdur

SSL, lisenziya, backup, e-poçt və WhatsApp API xidmətləri bitəndə yalnız `EXPIRED` edilir. Qiymət snapshot-u, yenilənmə fakturası, balans ödənişi və bildiriş yoxdur.

### 8. Tamamlandı — renewal faktura idempotency-si

Hosting və domen renewal dövrü üçün unikal `Invoice.idempotencyKey` istifadə edilir. Paralel instanslar eyni fakturanı `upsert` edir; balans ödənişi ayrıca invoice/user row lock-ları ilə qorunur. Redis production-da artıq məcburidir.

### 9. Bildirişlər üçün davamlı outbox/retry yoxdur

E-poçt və WhatsApp xətaları loglanır, amma sonradan etibarlı şəkildə təkrar göndərilmir. Pul tutulması uğurlu olub bildiriş uğursuz qala bilər.

Tövsiyə: notification outbox cədvəli, retry sayı, son xəta, növbəti cəhd vaxtı və admin re-send əməliyyatı əlavə edilsin.

### 10. Panel reaktivasiyası uğursuz olduqda avtomatik retry yoxdur

Faktura ödənəndən sonra panel müvəqqəti əlçatan olmasa lokal xidmət aktiv edilir və xəta loglanır. Bu, pul ödənmiş halda panel hesabının bağlı qalmasına səbəb ola bilər.

Tövsiyə: `PANEL_REACTIVATION_PENDING` işi, exponential retry və admin xəbərdarlığı əlavə edilsin.

## Orta prioritet

### 11. Hosting fakturası yalnız müddət bitəndə yaranır

Hazırkı axında balans yoxdursa xidmət müddət bitən anda dayandırılır. Daha yumşaq müştəri təcrübəsi üçün faktura 3–7 gün əvvəl yaradılmalı, balans əvvəlcədən yoxlanmalı və bir neçə xəbərdarlıq göndərilməlidir.

### 12. S3 və R2 storage provider-ləri implement edilməyib

Kodda S3 və Cloudflare R2 metodları açıq şəkildə `not implemented` xətası verir. Ticket əlavələri/local fayllar bir server diskində qalarsa horizontal scale və disaster recovery zəif olur.

### 13. Abunəlik üçün vahid model və tarixçə yoxdur

Hosting, domen, server və addon öz statuslarını ayrı saxlayır. Renewal cəhdləri, qiymət dəyişikliyi, istifadəçi razılığı, retry sayı və növbəti ödəniş tarixi üçün vahid subscription/renewal tarixçəsi yoxdur.

Tövsiyə: ayrıca `Subscription` və `RenewalAttempt` modeli qurulsun; xidmət modulları onun üzərindən işləsin.

### 14. Renewal qiymət siyasəti dəqiqləşdirilməlidir

Yeni hostingdə cari plan qiyməti `billingAmount` kimi snapshot edilir. Köhnə hesabların backfill-i isə indiki plan qiymətini götürür. Endirim, kupon, vergi, qiymət artımı və “mövcud müştərinin köhnə qiyməti qorunsunmu?” qaydası ayrıca təsdiqlənməlidir.

### 15. Tamamlandı — frontend mock ödəniş axını çıxarıldı

Saxta kart yaratma düyməsi, avtomatik `4242` kartı və backend POST endpoint-i silindi. Ödəniş səhifəsi balans və Kapital Bank redirect modelini düzgün izah edir.

### 16. Test əhatəsi məhduddur

Backend unit testləri işləyir; renewal, Cloudflare provider və DNS validasiya halları üçün testlər əlavə olunub. Frontend DNS zone parser üçün də unit test mövcuddur. Bununla yanaşı real PostgreSQL transaction, Kapital callback, paralel payment, Plesk/registrar/Cloudflare sandbox və tam brauzer checkout/DNS ssenariləri üçün integration/E2E testlər lazımdır.

## Tövsiyə edilən icra ardıcıllığı

1. İfşa olunmuş Kapital production credential-larını bank tərəfində rotasiya et və yeni məlumatları yalnız secret/env vasitəsilə yaz.
2. ResellerClub real registrar adapterini qoş; bundan sonra domen auto-balance renewal-u aktivləşdir.
3. Server və addon modellərinə billing/renewal sahələrini əlavə et və vahid renewal engine qur.
4. Notification outbox, provider retry və reconciliation işlərini qur.
5. Epoint merchant hesabını recurring/card registration ilə aktivləşdir və canlı callback/auto-charge ssenarilərini sertifikasiya et.
6. PowerDNS `ns1/ns2` VPS-lərini və registrar glue qeydlərini canlıda qur.
7. Integration və brauzer E2E ssenarilərini CI-a əlavə et.

## Qəbul ssenariləri

- Balans tam çatır: bir dəfə pul tutulur, faktura `PAID`, xidmət `ACTIVE`, növbəti tarix bir təqvim ayı/ili irəli gedir.
- Balans çatmır: balans dəyişmir, faktura `OPEN`, xidmət `SUSPENDED`, birbaşa linkli bildiriş yaranır.
- Balans möhlət ərzində artırılır: növbəti lifecycle işində pul tutulur və xidmət yenidən açılır.
- Eyni renewal işi paralel iki dəfə başlayır: yalnız bir faktura və bir ödəniş yaranır.
- Panel əlçatan deyil: ödəniş itmir, reaktivasiya retry növbəsinə düşür və admin xəbərdar olur.
- Möhlət bitir və ödəniş yoxdur: faktura `VOID`, panel hesabı və deploy-lar silinir, əməliyyat audit jurnalına yazılır.
