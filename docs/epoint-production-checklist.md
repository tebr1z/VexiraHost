# Epoint canlı ödəniş və recurring sertifikasiya checklist-i

Vexira Host standart checkout, kart tokenləşdirmə və saxlanmış kartdan avtomatik aylıq/illik yenilənməni dəstəkləyir. Kart nömrəsi və CVV Vexira bazasında saxlanmır; yalnız Epoint-in qaytardığı `card_id` şifrəli formada saxlanır.

## Epoint kabinetində tələb olunanlar

1. Hüquqi şəxs və ya fərdi sahibkar merchant hesabını təsdiqlədin.
2. Recurring/card registration funksiyasının müqavilədə aktiv olduğunu Epoint-dən yazılı təsdiqlədin.
3. `public_key` və `private_key` alın.
4. `result_url` olaraq yalnız public HTTPS ünvanını qeyd edin:

   `https://api.vexirahost.com/api/v1/payments/epoint/callback`

5. Success/error URL-ləri `https://vexirahost.com/payment/result` olaraq whitelist etdirin.

## Server environment

```env
PAYMENT_PROVIDER=epoint
EPOINT_PUBLIC_KEY=i000000001
EPOINT_PRIVATE_KEY=replace-with-live-private-key
EPOINT_BASE_URL=https://epoint.az/api/1
EPOINT_RETURN_URL=https://vexirahost.com/payment/result
EPOINT_CARD_RETURN_URL=https://vexirahost.com/az/dashboard/payments
EPOINT_RESULT_URL=https://api.vexirahost.com/api/v1/payments/epoint/callback
EPOINT_ALLOW_INSECURE=false
```

Admin → Sistem → Provider-lər bölməsində Epoint seçildikdə readiness sətri yaşıl olmalıdır. Açarları və callback body-ni loglara yazmayın.

## Sertifikasiya ssenariləri

- Uğurlu birdəfəlik AZN ödənişi callback-dən sonra fakturanı bir dəfə bağlayır.
- Eyni callback ikinci dəfə göndəriləndə əlavə ödəniş və provisioning yaratmır.
- Dəyişdirilmiş `data` və ya `signature` HTTP 400 alır.
- Callback uğurlu görünsə belə `get-status` uğuru təsdiqləmədən faktura bağlanmır.
- Callback/status məbləği pending ödənişdən fərqlidirsə faktura bağlanmır.
- Kart qeydiyyatı uğurlu olduqda maska göstərilir, `card_id` API cavabına çıxmır.
- Balans çatmadıqda aktiv default Epoint kartı ilə renewal sınanır; decline olduqda xidmət dərhal silinmir və WhatsApp/e-poçt bildirişi növbəyə düşür.
- Kart silindikdə token sahəsi təmizlənir və sonrakı auto-renewal onu istifadə etmir.

## Canlı smoke test

İlk canlı yoxlamanı minimum məbləğ və ayrıca test müştərisi ilə edin. Epoint dashboard, Vexira payment qeydi və invoice məbləği eyni olmalıdır. Sonra callback URL-yə xaricdən TLS/DNS çıxışını və server saatının NTP ilə sinxron olduğunu yoxlayın.
