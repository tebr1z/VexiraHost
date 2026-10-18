# Vexira Host — domain reseller seçimi

Tarix: 12 oktyabr 2026

## Qısa qərar

Başlanğıc üçün **ResellerClub** tövsiyə olunur. Səbəblər:

- ayrıca sandbox və müasir JSON REST API;
- availability, customer, contact, register, renew, transfer, DNS və nameserver lifecycle endpoint-ləri;
- başlanğıc slab üçün istifadə edilə bilən 25 USD depozit;
- satış artdıqca avtomatik aşağı wholesale qiymət slab-ları;
- Vexira Host-un mövcud registrar interface-inə uyğun tam avtomatlaşdırma imkanı.

Canlı müqavilə bağlamadan əvvəl `.com`, `.net`, `.org`, `.az`, privacy, redemption və premium-domain qiymətləri hesabınıza daxil olaraq export edilməlidir. Saytdakı TLD qiymətləri statik rəqəmlə deyil, provider cost snapshot + marja ilə idarə edilməlidir.

## Alternativlər

### NameSilo

- Aşağı həcm üçün sərfəli ola bilər.
- API və private-label imkanları pulsuzdur.
- 12 oktyabr 2026 tarixində rəsmi səhifə Discount Program daxilində `.com` üçün 0+ portfeldə 11.05 USD göstərir; bu qiymət kampaniya və portfel həddinə görə dəyişə bilər.
- API köhnə üslubda GET query-ləri istifadə edir; yeni inteqrasiya üçün ResellerClub REST qədər rahat deyil.

### OpenSRS

- Minimum tələb olmayan Essential tier və 730-dan çox TLD.
- Güclü compliance və uzunmüddətli reseller infrastrukturu.
- Advanced tier üçün illik 2,000 USD xərcləmə və 100 yeni qeydiyyat/transfer həddi göstərilir.
- Contact Privacy ayrıca xərc ola bilər; rəsmi pricing səhifəsində 3 USD/il göstərilir.

### CentralNic Reseller

- 1,100-dən çox ccTLD/gTLD və EPP, REST, XML, SOAP kimi çoxsaylı API variantları.
- Böyük portfel və çoxlu ölkə uzantısı üçün yaxşı ikinci provider ola bilər.
- Qiymət/müqavilə şərtləri adətən hesab və satış komandası üzərindən dəqiqləşdirilir.

## Satış qiyməti qaydası

Ucuz ilk-il kampaniyasına əsasən qiymət qoymaq olmaz. Minimum satış qiyməti aşağıdakılardan hesablanmalıdır:

```text
max(qeydiyyat maya dəyəri, yenilənmə maya dəyəri)
+ valyuta riski
+ ödəniş komissiyası
+ vergi/ICANN xərci
+ support və fraud ehtiyatı
+ mənfəət marjası
```

Təklif olunan başlanğıc marjası adi TLD-lərdə 15–25%, premium və yüksək-risk TLD-lərdə ayrıca qaydadır. Provider qiyməti sifariş anında snapshot edilməli, renewal qiyməti isə istifadəçiyə checkout-dan əvvəl açıq göstərilməlidir.

## Vexira Host-da növbəti inteqrasiya

Layihədə registrar interface mövcuddur, amma production provider hələ mock-dur. ResellerClub hesabı açıldıqdan sonra aşağıdakılar yazılmalıdır:

1. sandbox API credentials;
2. availability və real price lookup;
3. customer/contact yaradılması;
4. domain register/renew/transfer;
5. `ns1.vexirahost.com`, `ns2.vexirahost.com` nameserver yazılması;
6. action status polling və webhook/reconciliation;
7. provider balansı və aşağı-balance admin xəbərdarlığı;
8. premium domain qiymətinin checkout-da yenidən təsdiqi.

`.az` domenləri üçün ayrıca yerli registrar müqaviləsi və API imkanları yoxlanmalıdır; beynəlxalq reseller kataloqunda görünməsi avtomatik olaraq real-time `.az` qeydiyyatı demək deyil.
