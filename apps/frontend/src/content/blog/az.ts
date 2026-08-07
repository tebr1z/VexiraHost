import type { BlogPostContent, BlogUiCopy } from "./types";

export const blogUiAz: BlogUiCopy = {
  title: "Blog",
  subtitle: "Hosting, VPS/VDS və WhatsApp API haqqında aydın bələdçilər.",
  readingTime: "{minutes} dəq oxuma",
  backToBlog: "Bütün yazılar",
  allPosts: "Bütün məqalələr",
  readMore: "Oxu",
  categories: {
    hosting: "Hosting",
    vps: "VPS / VDS",
    whatsapp: "WhatsApp API",
  },
  relatedTitle: "Oxşar yazılar",
  empty: "Bu kateqoriyada hələ yazı yoxdur.",
};

export const blogPostsAz: Record<string, BlogPostContent> = {
  "vps-vs-vds": {
    title: "VPS və VDS fərqi nədir? Hansını seçmək lazımdır?",
    excerpt:
      "VPS və VDS tez-tez qarışdırılır. Qısa izah, real fərqlər və Vexira-da nəyi nə vaxt seçmək.",
    readingMinutes: 6,
    ctaLabel: "VPS planlarına bax",
    body: [
      {
        type: "p",
        text: "Bir çox istifadəçi “VPS alım, yoxsa VDS?” sualında ilişib qalır. Marketinqdə hər iki ad bəzən eyni mənada işlədilir; praktikada isə ehtiyacınıza görə seçim dəyişir.",
      },
      { type: "h2", text: "Qısa təriflər" },
      {
        type: "ul",
        items: [
          "VPS (Virtual Private Server): bir fiziki serverin virtual hissələrə bölünməsi. Öz OS-iniz, root girişi və ayrılmış resurslar.",
          "VDS (Virtual Dedicated Server): adətən daha güclü / daha təcrid olunmuş virtual server kimi təqdim olunur; bəzi provayderlərdə VPS ilə demək olar ki, eyni məhsuldur.",
        ],
      },
      {
        type: "callout",
        text: "Vacib: ad yox, konkret CPU, RAM, NVMe disk, trafik və dəstək şərtlərinə baxın. “VDS” yazılması avtomatik olaraq daha yaxşı demək deyil.",
      },
      { type: "h2", text: "Praktik fərqlər" },
      {
        type: "ul",
        items: [
          "Resurs təminatı: yaxşı VPS/VDS-də CPU və RAM sizin üçün ayrılmış qalır; zəif paylaşımlı hostinqdə isə qonşu saytlar yavaşlada bilər.",
          "İdarəetmə: hər ikisində adətən root / administrator girişi olur.",
          "Qiymət: eyni spesifikasiyada ad fərqi qiyməti dəyişdirməməlidir — rəqəmləri müqayisə edin.",
        ],
      },
      { type: "h2", text: "Kimə VPS, kimə daha güclü plan?" },
      {
        type: "ol",
        items: [
          "Kiçik sayt, bot, test mühiti, API prototipi → başlanğıc VPS kifayətdir.",
          "E-ticarət, çoxlu sayt, yüksək trafik, CI/CD → daha çox RAM/CPU olan plan.",
          "Tam nəzarət və öz stack-iniz lazımdırsa shared hosting yox, VPS seçin.",
        ],
      },
      {
        type: "p",
        text: "Vexira-da VPS planları NVMe və şəffaf resurslarla təqdim olunur. Adı “VPS” və ya “VDS” olsa da, seçimi ehtiyacınıza uyğun nüvə, yaddaş və disk həcminə görə edin.",
      },
    ],
  },

  "shared-hosting-yoxsa-vps": {
    title: "Shared hosting yoxsa VPS? Hansını seçək?",
    excerpt:
      "Bir kliklə panel, yoxsa tam root? Büdcə, trafik və texniki bilik üzrə sadə qərar cədvəli.",
    readingMinutes: 7,
    ctaLabel: "Hosting planlarına bax",
    body: [
      {
        type: "p",
        text: "Shared (paylaşımlı) hosting ucuz və sadədir; VPS isə daha çox güc və azadlıq verir. Səhv seçim ya pul itkisi, ya da daim yavaş sayt deməkdir.",
      },
      { type: "h2", text: "Shared hosting nə vaxt kifayətdir?" },
      {
        type: "ul",
        items: [
          "Şəxsi bloq, portfolio, kiçik şirkət saytı",
          "WordPress / hazır CMS, cPanel və ya oxşar panel istəyənlər",
          "Aylıq ziyarət orta səviyyədə, ağır custom backend yoxdur",
        ],
      },
      { type: "h2", text: "VPS nə vaxt lazımdır?" },
      {
        type: "ul",
        items: [
          "Öz Docker, Node, Python, DB stack-iniz",
          "Yüksək trafik və ya ani yük artımları",
          "Bir neçə layihəni eyni serverdə idarə etmək",
          "Firewall, cron, reverse proxy üzərində tam nəzarət",
        ],
      },
      { type: "h2", text: "Tez qərar checklist" },
      {
        type: "ol",
        items: [
          "Panel və “bir kliklə quraşdır” istəyirsiniz? → əvvəl hosting.",
          "Root və custom proqram lazımdır? → VPS.",
          "Sayt tez-tez 503 / yavaş açılır? → resursları yoxlayın, çox vaxt VPS-ə keçid həll olur.",
          "Büdcə məhduddursa hostinglə başlayın; böyüyəndə VPS-ə keçin.",
        ],
      },
      {
        type: "callout",
        text: "Vexira-da hər iki yol açıqdır: sadə hosting planları və ölçüyə uyğun VPS. Əvvəl ehtiyacı yazın, sonra plan seçin — əksinə yox.",
      },
    ],
  },

  "hosting-nedir": {
    title: "Hosting nədir? Kimə lazımdır?",
    excerpt:
      "Saytınızın internetdə görünməsi üçün lazım olan əsas: hosting nədir, nə daxildir və necə başlamaq.",
    readingMinutes: 5,
    ctaLabel: "Hostingə başla",
    body: [
      {
        type: "p",
        text: "Hosting — saytınızın fayllarının, bazasının və e-poçtunun 24/7 işləyən serverdə yerləşməsidir. Domen adını “ünvan”, hosting isə “ev” kimi düşünün.",
      },
      { type: "h2", text: "Hostingə nə daxildir?" },
      {
        type: "ul",
        items: [
          "Disk sahəsi (idealda NVMe) və trafik",
          "SSL sertifikatı (HTTPS)",
          "Çox vaxt panel (cPanel/Plesk), e-poçt, ehtiyat nüsxə",
          "Dəstək və uptime öhdəliyi",
        ],
      },
      { type: "h2", text: "Kimə lazımdır?" },
      {
        type: "p",
        text: "Hər kəsə: şəxsi bloqdan e-ticarətə qədər. Öz fiziki server saxlamaq əksər bizneslər üçün mənasızdır — peşəkar hosting daha ucuz, daha sabit və daha təhlükəsizdir.",
      },
      { type: "h2", text: "Başlamaq üçün 4 addım" },
      {
        type: "ol",
        items: [
          "Domen seçin və ya mövcud domeni bağlayın.",
          "Ehtiyacınıza uyğun hosting planı alın.",
          "SSL və DNS-i düzgün qurun.",
          "Saytı yükləyin və ehtiyat nüsxəni aktiv edin.",
        ],
      },
      {
        type: "p",
        text: "Vexira Host-da məqsəd sadədir: aydın qiymət, sürətli quraşdırma və ehtiyac anında real dəstək. Müştəri məmnuniyyəti hər şeydən üstündür.",
      },
    ],
  },

  "whatsapp-api-nedir": {
    title: "WhatsApp API nədir? Biznesə nə verir?",
    excerpt:
      "Bildiriş, sifariş statusu və dəstək mesajlarını avtomatlaşdırmaq üçün WhatsApp API-yə qısa giriş.",
    readingMinutes: 6,
    ctaLabel: "WhatsApp API paketlərinə bax",
    body: [
      {
        type: "p",
        text: "WhatsApp API — proqramınızın WhatsApp üzərindən mesaj göndərməsinə imkan verən inteqrasiyadır. Əl ilə chat əvəzinə sistemdən avtomatik və ölçülə bilən göndəriş əldə edirsiniz.",
      },
      { type: "h2", text: "Harada istifadə olunur?" },
      {
        type: "ul",
        items: [
          "Sifariş təsdiqi və çatdırılma statusu",
          "Ödəniş / abunə xatırlatmaları",
          "OTP və təhlükəsizlik kodları (siyasətə uyğun)",
          "Dəstək və CRM bildirişləri",
        ],
      },
      { type: "h2", text: "Niyə ayrıca paket?" },
      {
        type: "p",
        text: "Mesaj həcmi, təhlükəsizlik və keyfiyyətə nəzarət lazımdır. Vexira-da aylıq mesaj limiti paneldə izlənir; ödənişdən sonra qısa yoxlama ilə API aktivləşir. Uyğunsuz və təhqiredici məzmun bloklanır.",
      },
      {
        type: "callout",
        text: "Spam və qadağan məzmun həm sizin brendinizi, həm də infrastrukturu zədələyir. Təmiz, razılığa əsaslanan mesajlaşma uzunmüddətli uğurun şərtidir.",
      },
      {
        type: "p",
        text: "Paketi seçin, ödənişi tamamlayın və panel + API sənədləşməsi ilə inteqrasiyaya keçin.",
      },
    ],
  },

  "wordpress-hosting-vps": {
    title: "WordPress üçün hansı hosting və ya VPS uyğundur?",
    excerpt: "Bloqdan mağazaya: WordPress üçün NVMe, PHP resursları və nə vaxt VPS-ə keçmək.",
    readingMinutes: 7,
    ctaLabel: "WordPress üçün plan seç",
    body: [
      {
        type: "p",
        text: "WordPress yüngül bloqdan ağır WooCommerce mağazasına qədər uzanır. Ona görə “ən ucuz hosting” həmişə düzgün cavab deyil.",
      },
      { type: "h2", text: "Kiçik / orta WordPress" },
      {
        type: "ul",
        items: [
          "Yaxşı NVMe hosting + SSL kifayət edir",
          "Cache (plugin və ya server) aktiv edin",
          "Ağır page builder + 40 plugin = yavaş sayt; sayı azaldın",
        ],
      },
      { type: "h2", text: "Nə vaxt VPS?" },
      {
        type: "ul",
        items: [
          "Yüksək trafik və ya flash kampaniyalar",
          "Öz Redis, queue, ayrı DB serveri",
          "Bir neçə WordPress + staging mühiti",
        ],
      },
      { type: "h2", text: "Praktik məsləhətlər" },
      {
        type: "ol",
        items: [
          "Həmişə HTTPS (SSL) istifadə edin.",
          "Avtomatik ehtiyat nüsxəni yoxlayın.",
          "PHP və WordPress-i yeniləyin; köhnə plugin təhlükəsizlik riskidir.",
          "Şəkil ölçülərini optimallaşdırın — hosting “yavaş” deyil, kontent ağır ola bilər.",
        ],
      },
      {
        type: "p",
        text: "Vexira-da WordPress üçün əvvəl hostinglə başlaya, böyüdükcə VPS-ə keçə bilərsiniz. Eyni ekosistemdə qalmaq migrasiyanı asanlaşdırır.",
      },
    ],
  },

  "whatsapp-api-rest-limitler": {
    title: "WhatsApp API: REST göndəriş, limitlər və aktivləşmə",
    excerpt:
      "Ödənişdən sonra qısa yoxlama, aylıq mesaj kvotası və REST API ilə göndəriş axını — addım-addım.",
    readingMinutes: 6,
    ctaLabel: "API panelinə keç",
    body: [
      {
        type: "p",
        text: "Vexira WhatsApp API paketləri REST üzərindən mesaj göndərmək üçündür. Axın sadədir: paket al → ödə → qısa yoxlama → API açarı ilə göndər.",
      },
      { type: "h2", text: "Aktivləşmə necə işləyir?" },
      {
        type: "ol",
        items: [
          "Məhsullardan aylıq mesaj paketini seçib ödənişi tamamlayın.",
          "Ödəniş qəbul edilir; komanda qısa yoxlama aparır.",
          "Təsdiqdən sonra xidmət paneldə görünür və API girişi açılır.",
          "API açarı yaradıb sənədləşməyə uyğun sorğu göndərin.",
        ],
      },
      { type: "h2", text: "Limitlər" },
      {
        type: "ul",
        items: [
          "Hər paketin aylıq mesaj limiti var; istifadə panelde izlənir.",
          "Limit bitəndə göndəriş dayanır — əlavə paket və ya yüksəltmə lazımdır.",
          "Uyğunsuz dil və təhqiredici məzmun avtomatik bloklana bilər.",
        ],
      },
      {
        type: "callout",
        text: "API açarını yalnız bir dəfə tam göstəririk. Secret manager-də saxlayın; ictimai repo-ya qoymayın.",
      },
      {
        type: "p",
        text: "Ətraflı endpoint-lər üçün müştəri panelindəki API sənədləşməsinə baxın.",
      },
    ],
  },

  "vps-cpu-ram-nvme": {
    title: "VPS seçərkən CPU, RAM və NVMe necə oxunur?",
    excerpt:
      "Rəqəmləri marketinq kimi yox, iş yükünüzə görə oxuyun: vCPU, RAM və NVMe nəyə təsir edir.",
    readingMinutes: 7,
    ctaLabel: "VPS konfiqurasiyasına bax",
    body: [
      {
        type: "p",
        text: "VPS cədvəlindəki rəqəmlər qorxuducu görünə bilər. Əslində üç sütun ən vacibdir: CPU, RAM, disk tipi (NVMe).",
      },
      { type: "h2", text: "CPU (vCPU)" },
      {
        type: "p",
        text: "Hesablama gücü. Çoxlu eyni anda iş (build, video, ağır sorğular) varsa daha çox nüvə lazımdır. Sadə sayt / API üçün 2–4 vCPU tez-tez kifayətdir.",
      },
      { type: "h2", text: "RAM" },
      {
        type: "p",
        text: "Eyni anda açıq proseslər və cache. Verilənlər bazası + tətbiq eyni maşındadırsa RAM tez bitər. “Yavaşdır” şikayətinin yarısı əslində RAM çatışmazlığıdır.",
      },
      { type: "h2", text: "NVMe disk" },
      {
        type: "p",
        text: "Köhnə HDD/SATA SSD-dən xeyli sürətli oxuma/yazma. WordPress, DB və loglar üçün NVMe hiss olunacaq fərq yaradır.",
      },
      { type: "h2", text: "Sadə seçim cədvəli" },
      {
        type: "ul",
        items: [
          "Bloq / staging: az CPU + 2–4 GB RAM + NVMe",
          "Kiçik production API: 2–4 vCPU + 4–8 GB RAM",
          "E-ticarət / çoxsaylı xidmət: 4+ vCPU + 8+ GB RAM",
        ],
      },
      {
        type: "p",
        text: "Vexira VPS planlarında resurslar açıq göstərilir. Şişirdilmiş “limitsiz” vədlərə yox, ölçülə bilən konfiqurasiyaya baxın.",
      },
    ],
  },

  "uptime-ssl-backup": {
    title: "Uptime, SSL və backup: hostingdə əslində nəyə baxmaq lazımdır?",
    excerpt:
      "Gözəl marketinq əvəzinə üç real meyar: işlək qalma, HTTPS və bərpa oluna bilən ehtiyat nüsxə.",
    readingMinutes: 6,
    ctaLabel: "Etibarlı hostingə keç",
    body: [
      {
        type: "p",
        text: "Qiymət cədvəlindən əvvəl üç sual verin: sayt ayaqda qalır? Trafik şifrələnir? Nəsə olanda geri qayıda bilərsiniz?",
      },
      { type: "h2", text: "Uptime" },
      {
        type: "p",
        text: "Uptime SLA — xidmətin əlçatan qalma öhdəliyidir. 99.99% yüksək hədəfdir; vacib olan həm də real monitorinq və dəstəyin cavabıdır.",
      },
      { type: "h2", text: "SSL" },
      {
        type: "p",
        text: "SSL olmadan brauzerlər “təhlükəli” deyir, SEO və ödəniş formaları zəifləyir. Pulsuz və ya daxil SSL bu gün standartdır — aktiv olduğundan əmin olun.",
      },
      { type: "h2", text: "Backup" },
      {
        type: "ul",
        items: [
          "Avtomatik ehtiyat nüsxə varmı?",
          "Nə qədər geriyə bərpa edə bilərsiniz?",
          "Bərpanı özünüz panelden edə bilərsinizmi?",
        ],
      },
      {
        type: "callout",
        text: "Backup yoxdursa, “ucuz hosting” bir kliklə bahalı dərsə çevrilə bilər. Əvvəl bərpa planı, sonra kampaniya.",
      },
      {
        type: "p",
        text: "Vexira-da infrastruktur və dəstək bu üç dayağa söykənir: sabitlik, HTTPS və müştərinin məlumatını qorumaq. Plan seçərkən bunları soruşun.",
      },
    ],
  },
};
