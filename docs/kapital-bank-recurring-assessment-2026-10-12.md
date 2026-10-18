# Kapital Bank recurring ödəniş qiymətləndirməsi — 12 oktyabr 2026

## Nəticə

Kapital Bank test e-commerce şlüzü kartın gələcək istifadə üçün qeydiyyata alınmasına
uyğun `Order_DMS` sifarişini `hppCofCapturePurposes: ["Cit", "Recurring"]` və
`aut.purpose: "AddCard"` sahələri ilə qəbul edir. 12 oktyabr 2026 tarixində Vexira
Host üçün yaradılan yalnız sandbox capability order-i `Preparing` statusu ilə qəbul
olundu. Real kart və real pul istifadə edilmədi.

Bu nəticə şlüzdə card-on-file/recurring imkanının mövcud olduğuna güclü texniki
işarədir, lakin production avtomatik abunəlik ödənişini təhlükəsiz aktivləşdirmək
üçün yetərli deyil. Kapital Bank-ın açıq rəsmi saytında COF/MIT/Recurring üçün API
manualı tapılmadı; test və production şlüzündə ehtimal olunan Swagger/OpenAPI
ünvanları da 403 qaytardı. Bankın açıq WooCommerce sənədi yalnız merchant,
sertifikat, test/live və taksit ayarlarını izah edir.

## Niyə kartdan avtomatik tutma hələ aktiv deyil

Avtomatik abunəlik ödənişi sadəcə kart tokenini saxlamaq deyil. Bank aşağıdakıları
rəsmi şəkildə təsdiqləməlidir:

- merchant hesabında COF/Card-on-File, MIT və Recurring icazəsinin aktiv olması;
- ilkin müştəri razılığı və 3-D Secure/CIT əməliyyatının dəqiq payload-u;
- sonrakı merchant-initiated recurring charge payload-u və ilkin əməliyyata link;
- tokenin tipi, ömrü, silinməsi və kart yenilənməsi qaydaları;
- retry, soft/hard decline, reversal/refund və idempotency davranışı;
- Visa/Mastercard mandat mətni, bildiriş müddəti və audit tələbləri;
- test kartları və production sertifikasiya ssenariləri.

İctimai üçüncü tərəf kitabxanalarında `Order_REC`, `set-src-token` və `exec-tran`
nümunələri var, ancaq baxılan nümunə saxlanmış kart ödənişini `cofUsage: Cit`
kimi göndərir. Bu, istifadəçinin həmin anda başladığı ödənişdir; avtomatik aylıq
MIT/Recurring mandatı kimi qəbul edilə bilməz. Buna görə həmin payload production
üçün mənbə sayılmadı.

## Hazırda işləyən təhlükəsiz model

1. Hosting auto-renew tarixi çatanda daxili balans kifayətdirsə məbləğ balansdan
   atomik şəkildə tutulur və xidmət uzadılır.
2. Balans çatmırsa invoice açıq qalır və WhatsApp/e-mail/in-app ödəniş linki
   göndərilir.
3. Linklə kart ödənişi Kapital Bank HPP/3-D Secure səhifəsində tamamlanır.
4. Callback query-si etibarlı sayılmır; backend bank API-sindən order statusunu
   yenidən yoxlayır.
5. Yalnız `FullyPaid` statusu invoice fulfilment edir. `Authorized` sadəcə məbləğin
   bloklandığını bildirir və artıq ödənilmiş sayılmır.
6. Kapital order parolu bazada şifrəli saxlanılır və user/admin API cavablarında
   göstərilmir. Köhnə pending plaintext referanslar callback üçün müvəqqəti olaraq
   oxuna bilir, amma yeni yazılmır.

## Kapital Bank-a göndəriləcək sorğu

> Vexira Host merchant hesabı üçün card-on-file (COF), recurring və
> merchant-initiated transaction (MIT) aktivləşdirilməsini istəyirik. İlkin
> CIT/3DS kart qeydiyyatı, sonrakı recurring charge, token revoke, status,
> reversal/refund, idempotency və test kartları daxil olmaqla cari rəsmi API
> spesifikasiyasını və sertifikasiya checklist-ini təqdim edin. Recurring ödənişin
> ilkin əməliyyat/mandat identifikatoruna necə bağlandığını da göstərin.

## Bank sənədi gələndən sonra icra planı

1. Şifrəli `PaymentMandate` modeli: bank tokeni, consent vaxtı/IP-si, ilkin order,
   kart maskası, status və revoke vaxtı.
2. HPP-də açıq razılıq checkbox-u və abunəlik şərtləri.
3. Callback-dən sonra tokenin yalnız bank API-si ilə doğrulanaraq saxlanması.
4. Renewal prioriteti: balans → aktiv kart mandatı → WhatsApp ödəniş linki.
5. Hər billing cycle üçün idempotency key və eyni invoice üzrə bir charge.
6. Retry cədvəli, istifadəçiyə əvvəlcədən və uğursuzluq bildirişi, mandatın paneldən
   ləğvi.
7. Kapital sandbox integration testləri və bank sertifikasiyası tamamlanmadan
   production feature flag-in açılmaması.
