import type { FaqPageContent } from "./types";

export const faqAz: FaqPageContent = {
  title: "Tez-tez verilən suallar",
  subtitle: "Vexira Host xidmətləri haqqında ətraflı cavablar",
  intro:
    "Veb hosting, VPS/VDS, domen, lisenziya, VPN, n8n server və fayl deploy xidmətlərimizlə bağlı ən çox verilən sualların cavablarını aşağıda tapa bilərsiniz. Axtardığınız cavabı tapa bilmirsinizsə, 7/24 dəstək komandamızla əlaqə saxlayın.",
  contactCta: "Dəstək sorğusu yarat",
  contactLink: "/dashboard/tickets/new",
  categories: [
    {
      id: "general",
      title: "Vexira Host haqqında",
      items: [
        {
          id: "general-1",
          question: "Vexira Host nədir və kimlər üçün uyğundur?",
          answer:
            "Vexira Host veb hosting, VPS/VDS, domen, proqram lisenziyaları (Windows, Office, antivirus), VPN, n8n avtomatlaşdırma serveri və fayl deploy həlləri təklif edən bulud infrastruktur platformasıdır.\nŞəxsi bloqlardan e-ticarət saytlarına, agentlik layihələrindən korporativ tətbiqlərə qədər hər ölçülü istifadəçi üçün nəzərdə tutulub.",
        },
        {
          id: "general-2",
          question: "Hansı xidmətləri tək paneldən idarə edə bilərəm?",
          answer:
            "Müştəri panelinizdən hosting hesablarınızı, serverlərinizi, domenlərinizi, sifarişlərinizi, fakturalarınızı və dəstək sorğularınızı bir yerdən idarə edə bilərsiniz.\nYeni xidmət almaq üçün kataloq səhifəsindən səbətə əlavə edib təhlükəsiz ödəniş addımı ilə sifarişi tamamlaya bilərsiniz.",
        },
        {
          id: "general-3",
          question: "İşləmə müddəti (uptime) zəmanətiniz varmı?",
          answer:
            "İnfrastrukturumuz %99,9 uptime hədəfi ilə idarə olunur; ehtiyatlı enerji, şəbəkə bağlantısı və proaktiv monitorinq sistemləri istifadə edilir.\nPlanlaşdırılmış texniki xidmət işləri mümkün olduqda aşağı trafik saatlarında aparılır və əvvəlcədən elan edilir.",
        },
        {
          id: "general-4",
          question: "Məlumatlarım harada saxlanılır?",
          answer:
            "Xidmət növünə görə məlumatlarınız təhlükəsiz məlumat mərkəzi infrastrukturunda, izolyasiya edilmiş hesablar və şifrələnmiş bağlantılar vasitəsilə saxlanılır.\nEhtiyat nüsxə, giriş logları və təhlükəsizlik divarı qatları xidmət paketinizə uyğun aktivləşdirilir.",
        },
        {
          id: "general-5",
          question: "Yeni başlayanlar üçün quraşdırma dəstəyi verirsinizmi?",
          answer:
            "Bəli. Hosting planlarında bir kliklə WordPress/CMS quraşdırması, pulsuz sayt köçürməsi və addım-addım panel təlimatları təklif edirik.\nServer və xüsusi həllərdə ehtiyaca görə texniki məsləhət və quraşdırma dəstəyi təmin edilir.",
        },
      ],
    },
    {
      id: "hosting",
      title: "Veb Hosting",
      items: [
        {
          id: "hosting-1",
          question: "Veb hosting planlarınızda nələr daxildir?",
          answer:
            "Planlarımızda NVMe yaddaş, pulsuz SSL, e-poçt hesabları, cPanel və ya Plesk idarəetmə paneli, həftəlik avtomatik ehtiyat nüsxə və 7/24 dəstək yer alır.\nPlan səviyyəsinə görə disk, trafik, domen və poçt qutusu limitləri artır.",
        },
        {
          id: "hosting-2",
          question: "cPanel istifadə etməliyəm, yoxsa Plesk?",
          answer:
            "cPanel geniş yayılmış PHP/WordPress layihələri üçün sürətli və tanış interfeys təqdim edir.\nPlesk isə Windows/.NET və çoxsaylı sayt idarəetməsində güclü seçimlər təklif edir; sifariş zamanı planınıza uyğun panel təyin edilir.",
        },
        {
          id: "hosting-3",
          question: "Mövcud saytımı pulsuz köçürürsünüzmü?",
          answer:
            "Bəli, uyğun hosting planlarında pulsuz sayt köçürmə xidməti təklif edirik.\nKöhnə hosting provayderinizdəki fayllar, verilənlər bazaları və e-poçt hesabları mütəxəssis komandamız tərəfindən təhlükəsiz şəkildə köçürülür.",
        },
        {
          id: "hosting-4",
          question: "WordPress və digər CMS-ləri quraşdıra bilərəmmi?",
          answer:
            "İdarəetmə panelindən bir kliklə WordPress, Joomla, Drupal və digər populyar CMS-ləri quraşdıra bilərsiniz.\nAvtomatik yeniləmələr, SSL və ehtiyat nüsxə ilə saytınız təhlükəsiz şəkildə yayımda qalır.",
        },
        {
          id: "hosting-5",
          question: "Hosting hesabım nə qədər müddətdə aktiv olur?",
          answer:
            "Ödəniş təsdiqləndikdən sonra hosting hesabınız adətən bir neçə dəqiqə ərzində avtomatik yaradılır.\nQuraşdırma statusunu müştəri panelinizdən canlı izləyə, tamamlandıqda panel məlumatlarınıza daxil ola bilərsiniz.",
        },
        {
          id: "hosting-6",
          question: "E-poçt hosting daxildirmi?",
          answer:
            "Bəli, planınıza görə peşəkar e-poçt hesabları yarada, veb-poçt vasitəsilə daxil ola və DNS qeydlərinizi idarə edə bilərsiniz.\nSPF, DKIM və əsas spam filtrasiyası parametrləri panel vasitəsilə konfiqurasiya edilə bilər.",
        },
      ],
    },
    {
      id: "servers",
      title: "VPS, VDS və Server Xidmətləri",
      items: [
        {
          id: "servers-1",
          question: "VPS ilə VDS arasındakı fərq nədir?",
          answer:
            "VPS (Virtual Private Server) paylaşılan resurslar üzərində virtualizasiya edilmiş, miqyaslana bilən və sərfəli bir həlldir.\nVDS (Virtual Dedicated Server) isə daha izolyasiya edilmiş resurslar və sabit performans təqdim edir; yüksək trafikli tətbiqlər üçün idealdır.",
        },
        {
          id: "servers-2",
          question: "Serverimə root girişi verilirmi?",
          answer:
            "VPS və VDS planlarında tam root (administrator) girişi təmin edilir.\nİstədiyiniz əməliyyat sistemini quraşdıra, xüsusi proqram yığınlarını deploy edə və təhlükəsizlik konfiqurasiyanızı özünüz idarə edə bilərsiniz.",
        },
        {
          id: "servers-3",
          question: "Server resurslarını sonradan artıra bilərəmmi?",
          answer:
            "Bəli, CPU, RAM və disk resurslarınızı ehtiyac olduqca artıra bilərsiniz.\nYeniləmə prosesi planınıza və infrastruktur uyğunluğuna görə qısa müddətdə tamamlanır; məlumat itkisi olmadan keçid hədəflənir.",
        },
        {
          id: "servers-4",
          question: "Hansı əməliyyat sistemləri dəstəklənir?",
          answer:
            "Linux paylanmaları (Ubuntu, Debian, AlmaLinux və s.) və Windows Server versiyaları təklif olunur.\nQuraşdırma zamanı seçdiyiniz OS imicini seçə və ya öz imicinizi yükləyə bilərsiniz.",
        },
        {
          id: "servers-5",
          question: "Server ehtiyat nüsxəsi necə işləyir?",
          answer:
            "Avtomatik snapshot və ehtiyat nüsxə seçimləri planınıza görə təklif edilir.\nKritik məlumatlarınız üçün əlavə ehtiyat nüsxə siyasətləri təyin edə, paneldən bərpa əməliyyatı başlada bilərsiniz.",
        },
      ],
    },
    {
      id: "domains",
      title: "Domen və DNS",
      items: [
        {
          id: "domains-1",
          question: "Domen qeydiyyatı və transferi edə bilərəmmi?",
          answer:
            "Bəli, .com, .net, .org və yüzlərlə TLD üçün domen axtarışı, qeydiyyat və transfer xidməti təklif edirik.\nTransfer üçün mövcud registrarınızdan aldığınız EPP/auth kodu ilə prosesi paneldən başlada bilərsiniz.",
        },
        {
          id: "domains-2",
          question: "DNS qeydlərini haradan idarə edirəm?",
          answer:
            "Domen DNS idarəetməsi müştəri panelinizdən aparılır; A, AAAA, CNAME, MX, TXT və NS qeydlərini redaktə edə bilərsiniz.\nDəyişikliklər adətən bir neçə dəqiqədən bir neçə saata qədər qlobal miqyasda yayılır (TTL-ə bağlı).",
        },
        {
          id: "domains-3",
          question: "WHOIS məxfiliyi varmı?",
          answer:
            "Dəstəklənən TLD-lərdə WHOIS məxfilik qorunması təklif edilir.\nŞəxsi əlaqə məlumatlarınız ictimai WHOIS sorğularında gizlədilir.",
        },
        {
          id: "domains-4",
          question: "Domen müddəti bitməzdən əvvəl xatırlatma alarammı?",
          answer:
            "Bəli, domen yeniləmə tarixiniz yaxınlaşdıqca e-poçt bildirişləri göndərilir.\nAvtomatik yeniləmə seçimini aktivləşdirərək domen itkisi riskini azalda bilərsiniz.",
        },
      ],
    },
    {
      id: "licenses",
      title: "Proqram Lisenziyaları",
      items: [
        {
          id: "licenses-1",
          question: "Hansı lisenziyaları satırsınız?",
          answer:
            "Windows Server, Microsoft Office, antivirus (Kaspersky, ESET və s.) və digər korporativ proqram lisenziyalarını təklif edirik.\nCari məhsul siyahısı və qiymətlər qiymətləndirmə səhifəsində kateqoriyalara ayrılmış şəkildə göstərilir.",
        },
        {
          id: "licenses-2",
          question: "Lisenziya çatdırılması nə qədər çəkir?",
          answer:
            "Rəqəmsal lisenziyalar ödəniş təsdiqləndikdən sonra adətən bir neçə dəqiqə ərzində e-poçt və ya panel vasitəsilə çatdırılır.\nKorporativ və toplu lisenziya sifarişlərində müddət məhsul növünə görə dəyişə bilər.",
        },
        {
          id: "licenses-3",
          question: "Lisenziyalarım qanuni və orijinaldırmı?",
          answer:
            "Bütün lisenziyalar səlahiyyətli distribyutor kanallarından təmin edilir və orijinal aktivləşdirmə açarları verilir.\nFaktura və lisenziya sənədləriniz müştəri panelinizdə saxlanılır.",
        },
        {
          id: "licenses-4",
          question: "Lisenziyanı yeniləyə və ya yüksəldə bilərəmmi?",
          answer:
            "Mövcud lisenziyanızın müddəti bitməzdən əvvəl yeniləmə və ya üst versiyaya keçid tələbi edə bilərsiniz.\nDəstək komandamız keçid prosesində addım-addım kömək edəcək.",
        },
      ],
    },
    {
      id: "special",
      title: "VPN, n8n və Fayl Deploy",
      items: [
        {
          id: "special-1",
          question: "VPN server xidmətiniz nə üçündür?",
          answer:
            "Xüsusi VPN serverinizlə təhlükəsiz uzaqdan giriş, şifrələnmiş bağlantı və coğrafi məhdudiyyətləri aşmaq imkanı əldə edirsiniz.\nQuraşdırma, protokol seçimi (WireGuard, OpenVPN və s.) və istifadəçi idarəetməsi ehtiyacınıza görə konfiqurasiya edilir.",
        },
        {
          id: "special-2",
          question: "n8n serveri nədir?",
          answer:
            "n8n kod yazmadan iş axını avtomatlaşdırması qurmağa imkan verən açıq mənbəli platformadır.\nVexira Host n8n serveriniz əvvəlcədən konfiqurasiya edilmiş şəkildə təhvil verilir; API inteqrasiyaları, webhook-lar və planlaşdırılmış tapşırıqlar qura bilərsiniz.",
        },
        {
          id: "special-3",
          question: "Fayl deploy xidməti necə işləyir?",
          answer:
            "Tətbiq fayllarınızı birbaşa serverə yükləyib tez bir zamanda yayıma ala bilərsiniz.\nGit, FTP/SFTP və ya panel vasitəsilə deploy seçimləri layihə strukturunuza görə təklif edilir.",
        },
        {
          id: "special-4",
          question: "Bu xüsusi xidmətlər üçün texniki dəstək varmı?",
          answer:
            "Bəli, VPN, n8n və deploy xidmətlərində quraşdırmadan sonra konfiqurasiya və problem həlli dəstəyi təmin edilir.\n7/24 dəstək sorğusu açaraq mütəxəssis komandamızdan kömək ala bilərsiniz.",
        },
      ],
    },
    {
      id: "billing",
      title: "Ödəniş, Faktura və Geri Qaytarma",
      items: [
        {
          id: "billing-1",
          question: "Hansı ödəniş üsullarını qəbul edirsiniz?",
          answer:
            "Kredit kartı, bank kartı və dəstəklənən digər onlayn ödəniş üsulları qəbul edilir.\nKorporativ müştərilər üçün faktura ilə ödəniş seçimləri də nəzərdən keçirilə bilər.",
        },
        {
          id: "billing-2",
          question: "30 günlük pul geri qaytarma zəmanəti necə işləyir?",
          answer:
            "Uyğun hosting planlarında ilk 30 gün ərzində məmnun qalmazsanız, şərtlər daxilində geri qaytarma tələbi edə bilərsiniz.\nİstifadə edilmiş domen qeydiyyatları və üçüncü tərəf lisenziya xərcləri geri qaytarma sahəsinə daxil olmaya bilər.",
        },
        {
          id: "billing-3",
          question: "Fakturalarımı haradan görə bilərəm?",
          answer:
            "Bütün fakturalarınız müştəri panelinizdə siyahıya alınır; PDF kimi endirə və ödəniş tarixçənizi izləyə bilərsiniz.\nÖdəniş xatırlatmaları e-poçt vasitəsilə göndərilir.",
        },
        {
          id: "billing-4",
          question: "Avtomatik yeniləmə varmı?",
          answer:
            "Xidmətlərinizin fasiləsiz davam etməsi üçün avtomatik yeniləmə aktivləşdirilə bilər.\nİstədiyiniz zaman paneldən avtomatik yeniləməni söndürə və ya ödəniş üsulunuzu yeniləyə bilərsiniz.",
        },
        {
          id: "billing-5",
          question: "Planımı ləğv etmək istəyirəm, nə etməliyəm?",
          answer:
            "Müştəri panelindən xidmət ləğv sorğusu yarada bilərsiniz.\nDövr sonuna qədər xidmətiniz aktiv qalır; məlumatlarınızı ehtiyat nüsxələmək üçün kifayət qədər vaxt verilir.",
        },
      ],
    },
    {
      id: "account",
      title: "Hesab və Təhlükəsizlik",
      items: [
        {
          id: "account-1",
          question: "Necə hesab yaradım?",
          answer:
            "Ana səhifədəki Qeydiyyat düyməsinə klikləyərək e-poçt və şifrə ilə hesab yarada bilərsiniz.\nE-poçt təsdiqi tamamlandıqdan sonra bütün xidmətlərə giriş əldə edirsiniz.",
        },
        {
          id: "account-2",
          question: "Şifrəmi unutmuşam, nə etməliyəm?",
          answer:
            "Giriş səhifəsindəki Şifrəmi unutdum keçidindən e-poçt ünvanınıza sıfırlama linki göndərə bilərsiniz.\nLink müəyyən müddət etibarlıdır; müddəti bitibsə yeni sorğu yaradın.",
        },
        {
          id: "account-3",
          question: "Hesabımı necə təhlükəsiz saxlayım?",
          answer:
            "Güclü və unikal şifrə istifadə edin, e-poçt təsdiqinizi tamamlayın və şübhəli fəaliyyətləri dərhal dəstək komandasına bildirin.\nMümkün olduqda iki faktorlu autentifikasiya (2FA) istifadə etməyinizi tövsiyə edirik.",
        },
        {
          id: "account-4",
          question: "Sessiyam niyə bitir?",
          answer:
            "Təhlükəsizlik səbəbindən müəyyən müddət hərəkətsizlikdən sonra sessiya sonlandırılır.\nYenidən daxil olaraq qaldığınız yerdən davam edə bilərsiniz.",
        },
      ],
    },
    {
      id: "support",
      title: "Dəstək və Texniki Kömək",
      items: [
        {
          id: "support-1",
          question: "Dəstək komandasına necə çata bilərəm?",
          answer:
            "Müştəri panelindən 7/24 dəstək sorğusu (ticket) aça bilərsiniz.\nTəcili hallar üçün prioritetli dəstək planları mövcuddur.",
        },
        {
          id: "support-2",
          question: "Dəstək sorğularına nə qədər müddətdə cavab verilir?",
          answer:
            "Standart sorğular adətən bir neçə saat ərzində cavablandırılır; kritik infrastruktur problemləri prioritetləşdirilir.\nYüklənmə və sorğunun mürəkkəbliyinə görə həll müddəti dəyişə bilər.",
        },
        {
          id: "support-3",
          question: "Sayt köçürmə dəstəyi ödənişlidirmi?",
          answer:
            "Uyğun hosting planlarında sayt köçürməsi pulsuzdur.\nXüsusi server və ya böyük miqyaslı miqrasiya layihələrində xüsusi təklif təqdim edilə bilər.",
        },
        {
          id: "support-4",
          question: "DDoS və təhlükəsizlik hücumlarına qarşı qoruma varmı?",
          answer:
            "İnfrastrukturumuzda əsas DDoS filtrasiyası və təhlükəsizlik divarı qatları aktivdir.\nYüksək riskli layihələr üçün əlavə qoruma paketləri nəzərdən keçirilə bilər.",
        },
        {
          id: "support-5",
          question: "SSL sertifikatı necə quraşdırılır?",
          answer:
            "Hosting planlarında Let's Encrypt SSL pulsuz və avtomatik quraşdırılır.\nKorporativ EV/OV sertifikatları üçün dəstək komandamızla əlaqə saxlayın.",
        },
      ],
    },
  ],
};
