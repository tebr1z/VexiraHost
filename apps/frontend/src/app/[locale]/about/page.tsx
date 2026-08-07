import { getLocale } from "next-intl/server";

import { MarketingShell } from "@/components/layout/marketing-shell";

const WHATSAPP = "994709646466";
const PHONE = "+994709646466";
const EMAIL = "admin@vexirahost.com";

type AboutContent = {
  title: string;
  subtitle: string;
  legalNameLabel: string;
  legalName: string;
  brandLabel: string;
  brand: string;
  foundedLabel: string;
  founded: string;
  hostLabel: string;
  hostYear: string;
  aboutTitle: string;
  aboutLead: string;
  aboutBody: string[];
  storyTitle: string;
  timeline: Array<{ year: string; title: string; text: string }>;
  valuesTitle: string;
  valuesSubtitle: string;
  values: Array<{ icon: string; title: string; text: string }>;
  statsTitle: string;
  stats: Array<{ value: string; label: string }>;
  servicesTitle: string;
  servicesSubtitle: string;
  services: Array<{ icon: string; title: string; text: string }>;
  contactTitle: string;
  contactSubtitle: string;
  addressLabel: string;
  address: string;
  phoneLabel: string;
  whatsappLabel: string;
  emailLabel: string;
  whatsappCta: string;
  hoursTitle: string;
  hours: string;
  responseNote: string;
};

const CONTENT: Record<"tr" | "en" | "ru" | "az", AboutContent> = {
  az: {
    title: "Haqqımızda",
    subtitle:
      "Vexira Labs LLC — 2021-dən texnologiya, 2023-dən isə Vexira Host ilə etibarlı infrastruktur",
    legalNameLabel: "Hüquqi ad",
    legalName: "Vexira Labs LLC",
    brandLabel: "Brend",
    brand: "Vexira Host",
    foundedLabel: "Təsis ili",
    founded: "2021",
    hostLabel: "Vexira Host",
    hostYear: "2023",
    aboutTitle: "Biz kimik?",
    aboutLead:
      "Bizim üçün müştəri məmnuniyyəti hər şeydən üstündür. Sabit sistem, aydın qiymət və ehtiyac anında real dəstək — Vexira-nın iş prinsipinin əsası budur.",
    aboutBody: [
      "Vexira Labs LLC 2021-ci ildə təsis olunub. İlk gündən şirkətlərə lisenziyalar, IT həlləri, şəbəkə təhlükəsizliyi, bulut sistemləri, SEO və server optimizasiyası üzrə peşəkar dəstək verdik. Eyni zamanda daxili təhlükəsiz şəbəkə və VPN xidmətlərinin qurulması ilə idarə edilməsi, veb saytlar, mobil tətbiqlər və xüsusi proqram həllərinin hazırlanması bizim əsas fəaliyyət istiqamətlərimiz oldu.",
      "2023-cü ildə bu təcrübəni bir addım irəli apararaq Vexira Host brendini qurduq. Hosting, VPS, domen və rəqəmsal məhsulları bir platformada toplayaraq müştərilərə sadə sifariş, şəffaf proses və güclü infrastruktur təqdim edirik. Bu gün Vexira həm texniki bilik, həm də müştəriyə yaxın dəstək mədəniyyəti ilə böyüyür.",
    ],
    storyTitle: "Yolumuz",
    timeline: [
      {
        year: "2021",
        title: "Vexira Labs LLC yarandı",
        text: "Lisenziyalar, IT həlləri, şəbəkə təhlükəsizliyi, bulud və SEO ilə şirkətlərə texniki tərəfdaşlıq başladı.",
      },
      {
        year: "2021–22",
        title: "Geniş xidmət spektri",
        text: "VPN və daxili təhlükəsiz şəbəkələr, server optimizasiyası, veb və mobil tətbiq hazırlanması portfelə əlavə olundu.",
      },
      {
        year: "2023",
        title: "Vexira Host doğuldu",
        text: "Hostinq, VPS, domen və rəqəmsal məhsullar vahid brend altında toplandı — etibarlı infrastruktur platforması.",
      },
      {
        year: "Bu gün",
        title: "Müştəriyə fokus",
        text: "Qlobal PoP şəbəkəsi, yüksək uptime və sürətli dəstək ilə məmnuniyyəti hər qərarın mərkəzində saxlayırıq.",
      },
    ],
    valuesTitle: "Nəyə inanırıq",
    valuesSubtitle: "Texniki güc yalnız müştəriyə real fayda verəndə məna daşıyır.",
    values: [
      {
        icon: "favorite",
        title: "Müştəri məmnuniyyəti birinci",
        text: "Hər qərarda sabitlik, şəffaflıq və ehtiyac anında əlçatan dəstək prioritetdir.",
      },
      {
        icon: "verified_user",
        title: "Etibar və təhlükəsizlik",
        text: "Şəbəkə, VPN və infrastrukturda təhlükəsizlik standartları işimizin ayrılmaz hissəsidir.",
      },
      {
        icon: "bolt",
        title: "Sürət və sabitlik",
        text: "Yüksək uptime, NVMe depolama və optimallaşdırılmış serverlər — performans vəd deyil, öhdəlikdir.",
      },
      {
        icon: "handshake",
        title: "Uzunmüddətli tərəfdaşlıq",
        text: "Birdəfəlik satış yox: quraşdırma, idarəetmə və inkişafda yanınızdayıq.",
      },
    ],
    statsTitle: "İnfrastruktur göstəriciləri",
    stats: [
      { value: "99.99%", label: "Uptime SLA" },
      { value: "24+", label: "Küresel PoP" },
      { value: "NVMe", label: "NVMe depolama" },
      { value: "120TB", label: "Ana omurga" },
    ],
    servicesTitle: "Xidmətlərimiz",
    servicesSubtitle: "Labs təcrübəsi ilə Host infrastrukturunu bir yerdə təqdim edirik.",
    services: [
      {
        icon: "language",
        title: "Hosting, domen və SSL",
        text: "Stabil veb hosting, domen qeydiyyatı və təhlükəsiz SSL ilə saytınızı etibarlı işə salın.",
      },
      {
        icon: "dns",
        title: "VPS / VDS və bulud",
        text: "Yüksək performanslı virtual və bulud serverlər — layihənizin ölçüsünə uyğun resurs.",
      },
      {
        icon: "key",
        title: "Proqram lisenziyaları",
        text: "Windows, Office və digər korporativ lisenziyalar — sürətli çatdırılma və aydın şərtlər.",
      },
      {
        icon: "vpn_lock",
        title: "Şəbəkə və VPN",
        text: "Daxili təhlükəsiz şəbəkə, VPN qurulması və idarə edilməsi ilə məlumatlarınızı qoruyun.",
      },
      {
        icon: "tune",
        title: "SEO və server optimizasiyası",
        text: "Axtarış görünürlüyü və server performansı üçün praktik IT dəstək.",
      },
      {
        icon: "devices",
        title: "Veb və mobil tətbiqlər",
        text: "Şirkətiniz üçün veb, mobil və xüsusi tətbiqlərin hazırlanması və dəstəyi.",
      },
    ],
    contactTitle: "Əlaqə",
    contactSubtitle: "Sifariş, aktivləşdirmə və texniki suallar üçün birbaşa yazın.",
    addressLabel: "Ünvan",
    address: "Bakı şəhəri, Sabunçu rayonu, Bakıxanov, ev 350",
    phoneLabel: "Telefon",
    whatsappLabel: "WhatsApp",
    emailLabel: "Dəstək e-poçtu",
    whatsappCta: "WhatsApp ilə yazın",
    hoursTitle: "Dəstək saatları",
    hours: "B.e. – Şənbə, 09:00 – 22:00 (GMT+4)",
    responseNote:
      "Komanda mümkün qədər tez cavab verir. Təcili məsələlər üçün WhatsApp ən sürətli kanaldır.",
  },
  tr: {
    title: "Hakkımızda",
    subtitle:
      "Vexira Labs LLC — 2021’den beri teknoloji, 2023’ten beri Vexira Host ile güvenilir altyapı",
    legalNameLabel: "Yasal unvan",
    legalName: "Vexira Labs LLC",
    brandLabel: "Marka",
    brand: "Vexira Host",
    foundedLabel: "Kuruluş",
    founded: "2021",
    hostLabel: "Vexira Host",
    hostYear: "2023",
    aboutTitle: "Biz kimiz?",
    aboutLead:
      "Bizim için müşteri memnuniyeti her şeyden üstündür. İstikrarlı sistem, net fiyatlandırma ve ihtiyaç anında gerçek destek — Vexira’nın çalışma prensibinin özü budur.",
    aboutBody: [
      "Vexira Labs LLC 2021 yılında kuruldu. İlk günden şirketlere lisanslar, IT çözümleri, ağ güvenliği, bulut sistemleri, SEO ve sunucu optimizasyonu konusunda profesyonel destek sunduk. Aynı dönemde dahili güvenli ağ ve VPN hizmetlerinin kurulumu ile yönetimi; web siteleri, mobil uygulamalar ve özel yazılım çözümlerinin geliştirilmesi temel faaliyet alanlarımız oldu.",
      "2023’te bu birikimi bir adım öteye taşıyarak Vexira Host markasını kurduk. Hosting, VPS, domain ve dijital ürünleri tek platformda toplayarak müşterilere sade sipariş, şeffaf süreç ve güçlü altyapı sunuyoruz. Bugün Vexira hem teknik bilgi hem de müşteriye yakın destek kültürü ile büyümeye devam ediyor.",
    ],
    storyTitle: "Yolculuğumuz",
    timeline: [
      {
        year: "2021",
        title: "Vexira Labs LLC kuruldu",
        text: "Lisanslar, IT çözümleri, ağ güvenliği, bulut ve SEO ile şirketlere teknik ortaklık başladı.",
      },
      {
        year: "2021–22",
        title: "Hizmet yelpazesi genişledi",
        text: "VPN ve dahili güvenli ağlar, sunucu optimizasyonu, web ve mobil uygulama geliştirme portföye eklendi.",
      },
      {
        year: "2023",
        title: "Vexira Host doğdu",
        text: "Hosting, VPS, domain ve dijital ürünler tek marka altında toplandı — güvenilir altyapı platformu.",
      },
      {
        year: "Bugün",
        title: "Müşteri odaklı büyüme",
        text: "Küresel PoP ağı, yüksek uptime ve hızlı destek ile memnuniyeti her kararın merkezinde tutuyoruz.",
      },
    ],
    valuesTitle: "Neye inanıyoruz",
    valuesSubtitle: "Teknik güç, müşteriye gerçek fayda sağladığında anlam kazanır.",
    values: [
      {
        icon: "favorite",
        title: "Müşteri memnuniyeti önce",
        text: "Her kararda istikrar, şeffaflık ve ihtiyaç anında erişilebilir destek önceliklidir.",
      },
      {
        icon: "verified_user",
        title: "Güven ve güvenlik",
        text: "Ağ, VPN ve altyapıda güvenlik standartları işimizin ayrılmaz parçasıdır.",
      },
      {
        icon: "bolt",
        title: "Hız ve kararlılık",
        text: "Yüksek uptime, NVMe depolama ve optimize sunucular — performans vaat değil, taahhüttür.",
      },
      {
        icon: "handshake",
        title: "Uzun vadeli ortaklık",
        text: "Tek seferlik satış değil: kurulum, yönetim ve büyümede yanınızdayız.",
      },
    ],
    statsTitle: "Altyapı göstergeleri",
    stats: [
      { value: "99.99%", label: "Uptime SLA" },
      { value: "24+", label: "Küresel PoP" },
      { value: "NVMe", label: "NVMe depolama" },
      { value: "120TB", label: "Ana omurga" },
    ],
    servicesTitle: "Hizmetlerimiz",
    servicesSubtitle: "Labs deneyimini Host altyapısı ile bir arada sunuyoruz.",
    services: [
      {
        icon: "language",
        title: "Hosting, domain ve SSL",
        text: "Stabil web hosting, domain kaydı ve güvenli SSL ile sitenizi güvenle yayına alın.",
      },
      {
        icon: "dns",
        title: "VPS / VDS ve bulut",
        text: "Yüksek performanslı sanal ve bulut sunucular — projenizin ölçeğine uygun kaynak.",
      },
      {
        icon: "key",
        title: "Yazılım lisansları",
        text: "Windows, Office ve diğer kurumsal lisanslar — hızlı teslimat ve net koşullar.",
      },
      {
        icon: "vpn_lock",
        title: "Ağ ve VPN",
        text: "Dahili güvenli ağ, VPN kurulumu ve yönetimi ile verilerinizi koruyun.",
      },
      {
        icon: "tune",
        title: "SEO ve sunucu optimizasyonu",
        text: "Arama görünürlüğü ve sunucu performansı için pratik IT destek.",
      },
      {
        icon: "devices",
        title: "Web ve mobil uygulamalar",
        text: "Şirketiniz için web, mobil ve özel uygulamaların geliştirilmesi ile desteği.",
      },
    ],
    contactTitle: "İletişim",
    contactSubtitle: "Sipariş, aktivasyon ve teknik sorular için doğrudan yazın.",
    addressLabel: "Adres",
    address: "Bakü şehri, Sabunçu rayonu, Bakıxanov, ev 350",
    phoneLabel: "Telefon",
    whatsappLabel: "WhatsApp",
    emailLabel: "Destek e-postası",
    whatsappCta: "WhatsApp ile yazın",
    hoursTitle: "Destek saatleri",
    hours: "Pzt – Cmt, 09:00 – 22:00 (GMT+4)",
    responseNote:
      "Ekibimiz en kısa sürede yanıt verir. Acil konular için WhatsApp en hızlı kanaldır.",
  },
  en: {
    title: "About Us",
    subtitle:
      "Vexira Labs LLC — technology since 2021, trusted infrastructure with Vexira Host since 2023",
    legalNameLabel: "Legal business name",
    legalName: "Vexira Labs LLC",
    brandLabel: "Brand",
    brand: "Vexira Host",
    foundedLabel: "Founded",
    founded: "2021",
    hostLabel: "Vexira Host",
    hostYear: "2023",
    aboutTitle: "Who we are",
    aboutLead:
      "Customer satisfaction comes first. Stable systems, clear pricing, and real support when it matters — that is the core of how Vexira works.",
    aboutBody: [
      "Vexira Labs LLC was founded in 2021. From day one we helped companies with software licenses, IT solutions, network security, cloud systems, SEO, and server optimization. Building and managing internal secure networks and VPN services, plus delivering websites, mobile apps, and custom software, became core parts of what we do.",
      "In 2023 we took that experience further and launched Vexira Host. By bringing hosting, VPS, domains, and digital products onto one platform, we offer simple ordering, transparent processes, and strong infrastructure. Today Vexira keeps growing through technical expertise and a support culture that stays close to the customer.",
    ],
    storyTitle: "Our journey",
    timeline: [
      {
        year: "2021",
        title: "Vexira Labs LLC founded",
        text: "Technical partnership began with licenses, IT solutions, network security, cloud, and SEO.",
      },
      {
        year: "2021–22",
        title: "Service scope expanded",
        text: "VPN and internal secure networks, server optimization, and web/mobile development joined the portfolio.",
      },
      {
        year: "2023",
        title: "Vexira Host launched",
        text: "Hosting, VPS, domains, and digital products united under one brand — a trusted infrastructure platform.",
      },
      {
        year: "Today",
        title: "Customer-first growth",
        text: "With a global PoP network, high uptime, and fast support, satisfaction stays at the center of every decision.",
      },
    ],
    valuesTitle: "What we believe",
    valuesSubtitle: "Technical strength only matters when it creates real value for customers.",
    values: [
      {
        icon: "favorite",
        title: "Satisfaction first",
        text: "Stability, transparency, and reachable support when you need it guide every decision.",
      },
      {
        icon: "verified_user",
        title: "Trust and security",
        text: "Security standards across networks, VPN, and infrastructure are non-negotiable.",
      },
      {
        icon: "bolt",
        title: "Speed and reliability",
        text: "High uptime, NVMe storage, and optimized servers — performance is a commitment, not a slogan.",
      },
      {
        icon: "handshake",
        title: "Long-term partnership",
        text: "Not a one-off sale: we stay with you through setup, operations, and growth.",
      },
    ],
    statsTitle: "Infrastructure highlights",
    stats: [
      { value: "99.99%", label: "Uptime SLA" },
      { value: "24+", label: "Global PoPs" },
      { value: "NVMe", label: "NVMe storage" },
      { value: "120TB", label: "Core backbone" },
    ],
    servicesTitle: "Our services",
    servicesSubtitle: "Labs expertise and Host infrastructure, delivered together.",
    services: [
      {
        icon: "language",
        title: "Hosting, domains & SSL",
        text: "Reliable web hosting, domain registration, and secure SSL to launch with confidence.",
      },
      {
        icon: "dns",
        title: "VPS / VDS & cloud",
        text: "High-performance virtual and cloud servers sized to your project.",
      },
      {
        icon: "key",
        title: "Software licenses",
        text: "Windows, Office, and other enterprise licenses — fast delivery and clear terms.",
      },
      {
        icon: "vpn_lock",
        title: "Network & VPN",
        text: "Internal secure networks plus VPN setup and management to protect your data.",
      },
      {
        icon: "tune",
        title: "SEO & server optimization",
        text: "Practical IT support for search visibility and server performance.",
      },
      {
        icon: "devices",
        title: "Web & mobile apps",
        text: "Development and support for web, mobile, and custom applications.",
      },
    ],
    contactTitle: "Contact",
    contactSubtitle: "Write to us directly for orders, activation, or technical questions.",
    addressLabel: "Address",
    address: "Baku city, Sabunchu district, Bakikhanov, house 350",
    phoneLabel: "Phone",
    whatsappLabel: "WhatsApp",
    emailLabel: "Support email",
    whatsappCta: "Message on WhatsApp",
    hoursTitle: "Support hours",
    hours: "Mon – Sat, 09:00 – 22:00 (GMT+4)",
    responseNote:
      "Our team responds as quickly as possible. For urgent matters, WhatsApp is the fastest channel.",
  },
  ru: {
    title: "О нас",
    subtitle:
      "Vexira Labs LLC — технологии с 2021 года, надёжная инфраструктура с Vexira Host с 2023",
    legalNameLabel: "Юридическое название",
    legalName: "Vexira Labs LLC",
    brandLabel: "Бренд",
    brand: "Vexira Host",
    foundedLabel: "Основана",
    founded: "2021",
    hostLabel: "Vexira Host",
    hostYear: "2023",
    aboutTitle: "Кто мы",
    aboutLead:
      "Для нас удовлетворённость клиентов важнее всего. Стабильные системы, понятные цены и реальная поддержка в нужный момент — основа подхода Vexira.",
    aboutBody: [
      "Vexira Labs LLC основана в 2021 году. С первого дня мы помогали компаниям с лицензиями, IT-решениями, сетевой безопасностью, облачными системами, SEO и оптимизацией серверов. Построение и сопровождение внутренних защищённых сетей и VPN, а также разработка сайтов, мобильных и специальных приложений стали ключевыми направлениями нашей работы.",
      "В 2023 году мы сделали следующий шаг и запустили Vexira Host. Объединив хостинг, VPS, домены и цифровые продукты на одной платформе, мы предлагаем простой заказ, прозрачные процессы и сильную инфраструктуру. Сегодня Vexira растёт благодаря технической экспертизе и культуре поддержки, близкой к клиенту.",
    ],
    storyTitle: "Наш путь",
    timeline: [
      {
        year: "2021",
        title: "Основана Vexira Labs LLC",
        text: "Техническое партнёрство началось с лицензий, IT, сетевой безопасности, облака и SEO.",
      },
      {
        year: "2021–22",
        title: "Расширение услуг",
        text: "VPN и внутренние защищённые сети, оптимизация серверов, веб- и мобильная разработка вошли в портфель.",
      },
      {
        year: "2023",
        title: "Запущен Vexira Host",
        text: "Хостинг, VPS, домены и цифровые продукты объединены в одном бренде — платформа надёжной инфраструктуры.",
      },
      {
        year: "Сегодня",
        title: "Фокус на клиенте",
        text: "Глобальная сеть PoP, высокий uptime и быстрая поддержка держат удовлетворённость в центре решений.",
      },
    ],
    valuesTitle: "Во что мы верим",
    valuesSubtitle: "Техническая сила имеет смысл, когда даёт реальную пользу клиенту.",
    values: [
      {
        icon: "favorite",
        title: "Сначала клиент",
        text: "Стабильность, прозрачность и доступная поддержка — приоритет в каждом решении.",
      },
      {
        icon: "verified_user",
        title: "Доверие и безопасность",
        text: "Стандарты безопасности в сетях, VPN и инфраструктуре — неотъемлемая часть работы.",
      },
      {
        icon: "bolt",
        title: "Скорость и надёжность",
        text: "Высокий uptime, NVMe-хранилище и оптимизированные серверы — обязательство, а не лозунг.",
      },
      {
        icon: "handshake",
        title: "Долгосрочное партнёрство",
        text: "Не разовая продажа: мы рядом на этапах внедрения, эксплуатации и роста.",
      },
    ],
    statsTitle: "Показатели инфраструктуры",
    stats: [
      { value: "99.99%", label: "Uptime SLA" },
      { value: "24+", label: "Глобальные PoP" },
      { value: "NVMe", label: "NVMe-хранилище" },
      { value: "120TB", label: "Магистраль" },
    ],
    servicesTitle: "Наши услуги",
    servicesSubtitle: "Опыт Labs и инфраструктура Host — вместе.",
    services: [
      {
        icon: "language",
        title: "Хостинг, домены и SSL",
        text: "Стабильный веб-хостинг, регистрация доменов и безопасный SSL для уверенного запуска.",
      },
      {
        icon: "dns",
        title: "VPS / VDS и облако",
        text: "Высокопроизводительные виртуальные и облачные серверы под масштаб вашего проекта.",
      },
      {
        icon: "key",
        title: "Программные лицензии",
        text: "Windows, Office и другие корпоративные лицензии — быстрая доставка и понятные условия.",
      },
      {
        icon: "vpn_lock",
        title: "Сеть и VPN",
        text: "Внутренние защищённые сети, установка и управление VPN для защиты данных.",
      },
      {
        icon: "tune",
        title: "SEO и оптимизация серверов",
        text: "Практическая IT-поддержка видимости в поиске и производительности серверов.",
      },
      {
        icon: "devices",
        title: "Веб и мобильные приложения",
        text: "Разработка и поддержка веб-, мобильных и специальных приложений.",
      },
    ],
    contactTitle: "Контакты",
    contactSubtitle: "Пишите напрямую по заказам, активации и техническим вопросам.",
    addressLabel: "Адрес",
    address: "г. Баку, Сабунчинский район, Бакиханов, дом 350",
    phoneLabel: "Телефон",
    whatsappLabel: "WhatsApp",
    emailLabel: "Email поддержки",
    whatsappCta: "Написать в WhatsApp",
    hoursTitle: "Часы поддержки",
    hours: "Пн – Сб, 09:00 – 22:00 (GMT+4)",
    responseNote:
      "Мы отвечаем максимально быстро. Для срочных вопросов WhatsApp — самый быстрый канал.",
  },
};

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex gap-3 rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4">
      <span className="material-symbols-outlined mt-0.5 text-[22px] text-[var(--accent)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
          {label}
        </p>
        <div className="mt-1 text-sm leading-relaxed text-[var(--label-secondary)]">{children}</div>
      </div>
    </div>
  );
}

export default async function AboutPage(): Promise<React.ReactElement> {
  const locale = await getLocale();
  const c = CONTENT[(locale in CONTENT ? locale : "en") as keyof typeof CONTENT];
  const whatsappUrl = `https://wa.me/${WHATSAPP}`;

  return (
    <MarketingShell>
      <section className="apple-page relative overflow-hidden py-16 sm:py-20">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_65%)]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl px-5 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Vexira Labs LLC
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--label)] sm:text-4xl md:text-5xl">
            {c.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--label-secondary)] sm:text-lg">
            {c.subtitle}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: c.legalNameLabel, value: c.legalName },
              { label: c.brandLabel, value: c.brand },
              { label: c.foundedLabel, value: c.founded },
              { label: c.hostLabel, value: c.hostYear },
            ].map((item) => (
              <article
                key={item.label}
                className="bg-[var(--bg-elevated)]/90 rounded-2xl border border-[var(--separator)] p-4 sm:p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--label)] sm:text-base">
                  {item.value}
                </p>
              </article>
            ))}
          </div>

          <article className="mt-10 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--label)]">
              {c.aboutTitle}
            </h2>
            <p className="mt-4 text-base font-medium leading-relaxed text-[var(--label)] sm:text-[17px]">
              {c.aboutLead}
            </p>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-[var(--label-secondary)] sm:text-[15px]">
              {c.aboutBody.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>
          </article>

          <div className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--label)]">
              {c.storyTitle}
            </h2>
            <ol className="relative mt-8 space-y-0 border-l border-[var(--separator)] pl-6 sm:pl-8">
              {c.timeline.map((item) => (
                <li key={item.year} className="relative pb-10 last:pb-0">
                  <span
                    className="absolute -left-[1.65rem] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--bg)] sm:-left-[2.15rem]"
                    aria-hidden
                  />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                    {item.year}
                  </p>
                  <h3 className="mt-1.5 text-lg font-semibold text-[var(--label)]">{item.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--label-secondary)]">
                    {item.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--label)]">
              {c.valuesTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-[var(--label-secondary)] sm:text-base">
              {c.valuesSubtitle}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {c.values.map((value) => (
                <article
                  key={value.title}
                  className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 sm:p-6"
                >
                  <span className="material-symbols-outlined text-[26px] text-[var(--accent)]">
                    {value.icon}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-[var(--label)]">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--label-secondary)]">
                    {value.text}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-14 overflow-hidden rounded-[28px] border border-[var(--separator)] bg-[var(--bg-elevated)]">
            <div className="border-b border-[var(--separator)] px-6 py-5 sm:px-8">
              <h2 className="text-lg font-semibold text-[var(--label)] sm:text-xl">
                {c.statsTitle}
              </h2>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-[var(--separator)] lg:grid-cols-4 lg:divide-y-0">
              {c.stats.map((stat) => (
                <div key={stat.label} className="px-5 py-6 text-center sm:px-6 sm:py-8">
                  <p className="text-2xl font-semibold tracking-tight text-[var(--label)] sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--label-tertiary)]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--label)]">
              {c.servicesTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-[var(--label-secondary)] sm:text-base">
              {c.servicesSubtitle}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {c.services.map((service) => (
                <article
                  key={service.title}
                  className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5"
                >
                  <span className="material-symbols-outlined text-[24px] text-[var(--accent)]">
                    {service.icon}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-[var(--label)]">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--label-secondary)]">
                    {service.text}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--label)]">
              {c.contactTitle}
            </h2>
            <p className="mt-3 text-sm text-[var(--label-secondary)] sm:text-base">
              {c.contactSubtitle}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ContactRow icon="location_on" label={c.addressLabel}>
                {c.address}
              </ContactRow>
              <ContactRow icon="call" label={c.phoneLabel}>
                <a
                  href={`tel:${PHONE}`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  {PHONE}
                </a>
              </ContactRow>
              <ContactRow icon="chat" label={c.whatsappLabel}>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-[var(--accent)] hover:underline"
                >
                  {PHONE}
                  <span className="text-xs text-[var(--label-tertiary)]">({c.whatsappCta})</span>
                </a>
              </ContactRow>
              <ContactRow icon="mail" label={c.emailLabel}>
                <a
                  href={`mailto:${EMAIL}`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  {EMAIL}
                </a>
              </ContactRow>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
              {c.whatsappCta}
            </a>
          </div>

          <article className="mt-8 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-[var(--label)]">{c.hoursTitle}</h2>
            <p className="mt-2 text-sm text-[var(--label-secondary)]">{c.hours}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--label-tertiary)]">
              {c.responseNote}
            </p>
          </article>
        </div>
      </section>
    </MarketingShell>
  );
}
