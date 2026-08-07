import type { BlogPostContent, BlogUiCopy } from "./types";

export const blogUiTr: BlogUiCopy = {
  title: "Blog",
  subtitle: "Hosting, VPS/VDS ve WhatsApp API hakkında net rehberler.",
  readingTime: "{minutes} dk okuma",
  backToBlog: "Tüm yazılar",
  allPosts: "Tüm makaleler",
  readMore: "Oku",
  categories: {
    hosting: "Hosting",
    vps: "VPS / VDS",
    whatsapp: "WhatsApp API",
  },
  relatedTitle: "Benzer yazılar",
  empty: "Bu kategoride henüz yazı yok.",
};

export const blogPostsTr: Record<string, BlogPostContent> = {
  "vps-vs-vds": {
    title: "VPS ve VDS farkı nedir? Hangisini seçmelisiniz?",
    excerpt:
      "VPS ve VDS sık karıştırılır. Kısa açıklama, gerçek farklar ve Vexira'da neyi ne zaman seçmek.",
    readingMinutes: 6,
    ctaLabel: "VPS planlarına bak",
    body: [
      {
        type: "p",
        text: "Birçok kullanıcı “VPS mi alayım, VDS mi?” sorusunda takılı kalır. Pazarlama dilinde her iki ad bazen aynı anlamda kullanılır; pratikte ise ihtiyacınıza göre seçim değişir.",
      },
      { type: "h2", text: "Kısa tanımlar" },
      {
        type: "ul",
        items: [
          "VPS (Virtual Private Server): fiziksel bir sunucunun sanal bölümlere ayrılması. Kendi işletim sisteminiz, root erişimi ve ayrılmış kaynaklar.",
          "VDS (Virtual Dedicated Server): genelde daha güçlü / daha izole sanal sunucu olarak sunulur; bazı sağlayıcılarda VPS ile neredeyse aynı üründür.",
        ],
      },
      {
        type: "callout",
        text: "Önemli: ada değil, somut CPU, RAM, NVMe disk, trafik ve destek koşullarına bakın. “VDS” yazması otomatik olarak daha iyi demek değildir.",
      },
      { type: "h2", text: "Pratik farklar" },
      {
        type: "ul",
        items: [
          "Kaynak garantisi: iyi bir VPS/VDS'de CPU ve RAM sizin için ayrılmış kalır; zayıf paylaşımlı hostingde komşu siteler yavaşlatabilir.",
          "Yönetim: her ikisinde de genelde root / yönetici erişimi vardır.",
          "Fiyat: aynı özelliklerde isim farkı fiyatı değiştirmemeli — rakamları karşılaştırın.",
        ],
      },
      { type: "h2", text: "Kime VPS, kime daha güçlü plan?" },
      {
        type: "ol",
        items: [
          "Küçük site, bot, test ortamı, API prototipi → başlangıç VPS yeterlidir.",
          "E-ticaret, çoklu site, yüksek trafik, CI/CD → daha fazla RAM/CPU olan plan.",
          "Tam kontrol ve kendi stack'iniz gerekiyorsa paylaşımlı hosting değil, VPS seçin.",
        ],
      },
      {
        type: "p",
        text: "Vexira'da VPS planları NVMe ve şeffaf kaynaklarla sunulur. Adı “VPS” veya “VDS” olsa da seçimi ihtiyacınıza uygun çekirdek, bellek ve disk kapasitesine göre yapın.",
      },
    ],
  },

  "shared-hosting-yoxsa-vps": {
    title: "Paylaşımlı hosting mi VPS mi? Hangisini seçelim?",
    excerpt:
      "Tek tıkla panel mi, tam root mu? Bütçe, trafik ve teknik bilgiye göre basit karar tablosu.",
    readingMinutes: 7,
    ctaLabel: "Hosting planlarına bak",
    body: [
      {
        type: "p",
        text: "Paylaşımlı hosting ucuz ve basittir; VPS ise daha fazla güç ve özgürlük sağlar. Yanlış seçim ya para kaybı ya da sürekli yavaş site demektir.",
      },
      { type: "h2", text: "Paylaşımlı hosting ne zaman yeterlidir?" },
      {
        type: "ul",
        items: [
          "Kişisel blog, portfolyo, küçük şirket sitesi",
          "WordPress / hazır CMS, cPanel veya benzeri panel isteyenler",
          "Aylık ziyaret orta düzeyde, ağır özel backend yok",
        ],
      },
      { type: "h2", text: "VPS ne zaman gerekir?" },
      {
        type: "ul",
        items: [
          "Kendi Docker, Node, Python, DB stack'iniz",
          "Yüksek trafik veya ani yük artışları",
          "Birden fazla projeyi aynı sunucuda yönetmek",
          "Firewall, cron, reverse proxy üzerinde tam kontrol",
        ],
      },
      { type: "h2", text: "Hızlı karar kontrol listesi" },
      {
        type: "ol",
        items: [
          "Panel ve “tek tıkla kurulum” istiyor musunuz? → önce hosting.",
          "Root ve özel yazılım gerekiyor mu? → VPS.",
          "Site sık sık 503 / yavaş açılıyor mu? → kaynakları kontrol edin, çoğu zaman VPS'e geçiş çözüm olur.",
          "Bütçe sınırlıysa hosting ile başlayın; büyüdükçe VPS'e geçin.",
        ],
      },
      {
        type: "callout",
        text: "Vexira'da her iki yol da açık: basit hosting planları ve ihtiyaca uygun VPS. Önce ihtiyacı yazın, sonra plan seçin — tersine değil.",
      },
    ],
  },

  "hosting-nedir": {
    title: "Hosting nedir? Kimin ihtiyacı var?",
    excerpt:
      "Sitenizin internette görünmesi için gereken temel: hosting nedir, neleri kapsar ve nasıl başlanır.",
    readingMinutes: 5,
    ctaLabel: "Hostinge başla",
    body: [
      {
        type: "p",
        text: "Hosting — sitenizin dosyalarının, veritabanının ve e-postasının 7/24 çalışan bir sunucuda barındırılmasıdır. Alan adını “adres”, hostingi ise “ev” gibi düşünün.",
      },
      { type: "h2", text: "Hostinge neler dahildir?" },
      {
        type: "ul",
        items: [
          "Disk alanı (idealde NVMe) ve trafik",
          "SSL sertifikası (HTTPS)",
          "Çoğu zaman panel (cPanel/Plesk), e-posta, yedekleme",
          "Destek ve uptime taahhüdü",
        ],
      },
      { type: "h2", text: "Kimin ihtiyacı var?" },
      {
        type: "p",
        text: "Herkese: kişisel blogdan e-ticarete kadar. Kendi fiziksel sunucunuzu tutmak çoğu işletme için mantıksızdır — profesyonel hosting daha ucuz, daha kararlı ve daha güvenlidir.",
      },
      { type: "h2", text: "Başlamak için 4 adım" },
      {
        type: "ol",
        items: [
          "Alan adı seçin veya mevcut alan adını bağlayın.",
          "İhtiyacınıza uygun hosting planı alın.",
          "SSL ve DNS'i doğru kurun.",
          "Siteyi yükleyin ve yedeklemeyi etkinleştirin.",
        ],
      },
      {
        type: "p",
        text: "Vexira Host'ta amaç basittir: net fiyatlandırma, hızlı kurulum ve ihtiyaç anında gerçek destek. Müşteri memnuniyeti her şeyden önce gelir.",
      },
    ],
  },

  "whatsapp-api-nedir": {
    title: "WhatsApp API nedir? İşletmeye ne kazandırır?",
    excerpt:
      "Bildirim, sipariş durumu ve destek mesajlarını otomatikleştirmek için WhatsApp API'ye kısa giriş.",
    readingMinutes: 6,
    ctaLabel: "WhatsApp API paketlerine bak",
    body: [
      {
        type: "p",
        text: "WhatsApp API — yazılımınızın WhatsApp üzerinden mesaj göndermesini sağlayan entegrasyondur. Elle sohbet yerine sistemden otomatik ve ölçeklenebilir gönderim elde edersiniz.",
      },
      { type: "h2", text: "Nerede kullanılır?" },
      {
        type: "ul",
        items: [
          "Sipariş onayı ve teslimat durumu",
          "Ödeme / abonelik hatırlatmaları",
          "OTP ve güvenlik kodları (politikaya uygun)",
          "Destek ve CRM bildirimleri",
        ],
      },
      { type: "h2", text: "Neden ayrı paket?" },
      {
        type: "p",
        text: "Mesaj hacmi, güvenlik ve kalite kontrolü gerekir. Vexira'da aylık mesaj kotası panelde izlenir; ödeme sonrası kısa inceleme ile API aktifleşir. Uygunsuz ve taciz edici içerik engellenir.",
      },
      {
        type: "callout",
        text: "Spam ve yasaklı içerik hem markanıza hem de altyapıya zarar verir. Temiz, onaya dayalı mesajlaşma uzun vadeli başarının şartıdır.",
      },
      {
        type: "p",
        text: "Paketi seçin, ödemeyi tamamlayın ve panel + API dokümantasyonu ile entegrasyona geçin.",
      },
    ],
  },

  "wordpress-hosting-vps": {
    title: "WordPress için hangi hosting veya VPS uygundur?",
    excerpt: "Blogdan mağazaya: WordPress için NVMe, PHP kaynakları ve ne zaman VPS'e geçmek.",
    readingMinutes: 7,
    ctaLabel: "WordPress için plan seç",
    body: [
      {
        type: "p",
        text: "WordPress hafif bir blogdan ağır WooCommerce mağazasına kadar uzanır. Bu yüzden “en ucuz hosting” her zaman doğru cevap değildir.",
      },
      { type: "h2", text: "Küçük / orta WordPress" },
      {
        type: "ul",
        items: [
          "İyi NVMe hosting + SSL yeterlidir",
          "Önbellek (eklenti veya sunucu) etkinleştirin",
          "Ağır page builder + 40 eklenti = yavaş site; sayıyı azaltın",
        ],
      },
      { type: "h2", text: "Ne zaman VPS?" },
      {
        type: "ul",
        items: [
          "Yüksek trafik veya ani kampanyalar",
          "Kendi Redis, kuyruk, ayrı DB sunucunuz",
          "Birden fazla WordPress + staging ortamı",
        ],
      },
      { type: "h2", text: "Pratik öneriler" },
      {
        type: "ol",
        items: [
          "Her zaman HTTPS (SSL) kullanın.",
          "Otomatik yedeklemeyi kontrol edin.",
          "PHP ve WordPress'i güncel tutun; eski eklenti güvenlik riskidir.",
          "Görsel boyutlarını optimize edin — hosting “yavaş” değil, içerik ağır olabilir.",
        ],
      },
      {
        type: "p",
        text: "Vexira'da WordPress için önce hosting ile başlayabilir, büyüdükçe VPS'e geçebilirsiniz. Aynı ekosistemde kalmak geçişi kolaylaştırır.",
      },
    ],
  },

  "whatsapp-api-rest-limitler": {
    title: "WhatsApp API: REST gönderim, limitler ve aktivasyon",
    excerpt:
      "Ödeme sonrası kısa inceleme, aylık mesaj kotası ve REST API ile gönderim akışı — adım adım.",
    readingMinutes: 6,
    ctaLabel: "API paneline geç",
    body: [
      {
        type: "p",
        text: "Vexira WhatsApp API paketleri REST üzerinden mesaj göndermek içindir. Akış basittir: paket al → öde → kısa inceleme → API anahtarı ile gönder.",
      },
      { type: "h2", text: "Aktivasyon nasıl çalışır?" },
      {
        type: "ol",
        items: [
          "Ürünlerden aylık mesaj paketini seçip ödemeyi tamamlayın.",
          "Ödeme kabul edilir; ekip kısa inceleme yapar.",
          "Onaydan sonra hizmet panelde görünür ve API erişimi açılır.",
          "API anahtarı oluşturup dokümantasyona uygun istek gönderin.",
        ],
      },
      { type: "h2", text: "Limitler" },
      {
        type: "ul",
        items: [
          "Her paketin aylık mesaj limiti vardır; kullanım panelde izlenir.",
          "Limit bitince gönderim durur — ek paket veya yükseltme gerekir.",
          "Uygunsuz dil ve taciz edici içerik otomatik engellenebilir.",
        ],
      },
      {
        type: "callout",
        text: "API anahtarını yalnızca bir kez tam gösteriyoruz. Secret manager'da saklayın; herkese açık repoya koymayın.",
      },
      {
        type: "p",
        text: "Ayrıntılı endpoint'ler için müşteri panelindeki API dokümantasyonuna bakın.",
      },
    ],
  },

  "vps-cpu-ram-nvme": {
    title: "VPS seçerken CPU, RAM ve NVMe nasıl okunur?",
    excerpt:
      "Rakamları pazarlama gibi değil, iş yükünüze göre okuyun: vCPU, RAM ve NVMe neyi etkiler.",
    readingMinutes: 7,
    ctaLabel: "VPS yapılandırmasına bak",
    body: [
      {
        type: "p",
        text: "VPS tablosundaki rakamlar korkutucu görünebilir. Aslında üç sütun en önemlisidir: CPU, RAM, disk tipi (NVMe).",
      },
      { type: "h2", text: "CPU (vCPU)" },
      {
        type: "p",
        text: "Hesaplama gücü. Çoklu eşzamanlı iş (build, video, ağır sorgular) varsa daha fazla çekirdek gerekir. Basit site / API için 2–4 vCPU çoğu zaman yeterlidir.",
      },
      { type: "h2", text: "RAM" },
      {
        type: "p",
        text: "Aynı anda açık süreçler ve önbellek. Veritabanı + uygulama aynı makinedeyse RAM hızla biter. “Yavaş” şikayetinin yarısı aslında RAM yetersizliğidir.",
      },
      { type: "h2", text: "NVMe disk" },
      {
        type: "p",
        text: "Eski HDD/SATA SSD'den belirgin şekilde hızlı okuma/yazma. WordPress, DB ve loglar için NVMe hissedilir fark yaratır.",
      },
      { type: "h2", text: "Basit seçim tablosu" },
      {
        type: "ul",
        items: [
          "Blog / staging: az CPU + 2–4 GB RAM + NVMe",
          "Küçük production API: 2–4 vCPU + 4–8 GB RAM",
          "E-ticaret / çoklu servis: 4+ vCPU + 8+ GB RAM",
        ],
      },
      {
        type: "p",
        text: "Vexira VPS planlarında kaynaklar açıkça gösterilir. Şişirilmiş “sınırsız” vaatlere değil, ölçülebilir yapılandırmaya bakın.",
      },
    ],
  },

  "uptime-ssl-backup": {
    title: "Uptime, SSL ve yedekleme: hostingde gerçekten neye bakmalı?",
    excerpt:
      "Güzel pazarlama yerine üç gerçek ölçüt: çalışır kalma, HTTPS ve geri yüklenebilir yedek.",
    readingMinutes: 6,
    ctaLabel: "Güvenilir hostinge geç",
    body: [
      {
        type: "p",
        text: "Fiyat tablosundan önce üç soru sorun: site ayakta kalıyor mu? Trafik şifreleniyor mu? Bir şey olursa geri dönebilir misiniz?",
      },
      { type: "h2", text: "Uptime" },
      {
        type: "p",
        text: "Uptime SLA — hizmetin erişilebilir kalma taahhüdüdür. %99.99 yüksek bir hedeftir; önemli olan gerçek izleme ve desteğin yanıtıdır.",
      },
      { type: "h2", text: "SSL" },
      {
        type: "p",
        text: "SSL olmadan tarayıcılar “güvensiz” der, SEO ve ödeme formları zayıflar. Ücretsiz veya dahil SSL bugün standarttır — aktif olduğundan emin olun.",
      },
      { type: "h2", text: "Yedekleme" },
      {
        type: "ul",
        items: [
          "Otomatik yedekleme var mı?",
          "Ne kadar geriye geri yükleyebilirsiniz?",
          "Geri yüklemeyi panelden kendiniz yapabilir misiniz?",
        ],
      },
      {
        type: "callout",
        text: "Yedekleme yoksa “ucuz hosting” tek tıkla pahalı derse dönüşebilir. Önce geri yükleme planı, sonra kampanya.",
      },
      {
        type: "p",
        text: "Vexira'da altyapı ve destek bu üç dayanağa dayanır: kararlılık, HTTPS ve müşteri verisini koruma. Plan seçerken bunları sorun.",
      },
    ],
  },
};
