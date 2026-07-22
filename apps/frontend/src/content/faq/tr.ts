import type { FaqPageContent } from "./types";

export const faqTr: FaqPageContent = {
    title: "Sıkça Sorulan Sorular",
    subtitle: "Vexira Host hizmetleri hakkında detaylı yanıtlar",
    intro:
      "Web hosting, VPS/VDS, domain, lisans, VPN, n8n sunucu ve dosya deploy hizmetlerimizle ilgili en çok sorulan konuları aşağıda bulabilirsiniz. Aradığınız cevabı göremezseniz 7/24 destek ekibimizle iletişime geçin.",
    contactCta: "Destek talebi oluştur",
    contactLink: "/dashboard/tickets/new",
    categories: [
      {
        id: "general",
        title: "Vexira Host Hakkında",
        items: [
          {
            id: "general-1",
            question: "Vexira Host nedir ve kimler için uygundur?",
            answer:
              "Vexira Host; web hosting, VPS/VDS, domain, yazılım lisansları (Windows, Office, antivirüs), VPN, n8n otomasyon sunucusu ve dosya deploy çözümleri sunan bulut altyapı platformudur.\nKişisel bloglardan e-ticaret sitelerine, ajans projelerinden kurumsal uygulamalara kadar her ölçekteki kullanıcı için tasarlanmıştır.",
          },
          {
            id: "general-2",
            question: "Hangi hizmetleri tek panelden yönetebilirim?",
            answer:
              "Müşteri panelinizden hosting hesaplarınızı, sunucularınızı, domainlerinizi, siparişlerinizi, faturalarınızı ve destek taleplerinizi tek yerden yönetebilirsiniz.\nYeni hizmet satın almak için katalog sayfasından sepete ekleyip güvenli ödeme adımıyla siparişi tamamlayabilirsiniz.",
          },
          {
            id: "general-3",
            question: "Çalışma süresi (uptime) garantiniz var mı?",
            answer:
              "Altyapımız %99,9 uptime hedefiyle yönetilir; yedekli güç, ağ bağlantısı ve proaktif izleme sistemleri kullanılır.\nPlanlı bakım çalışmaları mümkün olduğunca düşük trafik saatlerinde yapılır ve önceden duyurulur.",
          },
          {
            id: "general-4",
            question: "Verilerim nerede saklanıyor?",
            answer:
              "Hizmet türüne göre verileriniz güvenli veri merkezi altyapısında, izole hesaplar ve şifreli bağlantılar üzerinden saklanır.\nYedekleme, erişim logları ve güvenlik duvarı katmanları hizmet paketinize göre aktif edilir.",
          },
          {
            id: "general-5",
            question: "Yeni başlayanlar için kurulum desteği veriyor musunuz?",
            answer:
              "Evet. Hosting planlarında tek tıkla WordPress/CMS kurulumu, ücretsiz site taşıma ve adım adım panel rehberleri sunuyoruz.\nSunucu ve özel çözümlerde ihtiyaca göre teknik danışmanlık ve kurulum desteği sağlanır.",
          },
        ],
      },
      {
        id: "hosting",
        title: "Web Hosting",
        items: [
          {
            id: "hosting-1",
            question: "Web hosting planlarınızda neler dahil?",
            answer:
              "Planlarımızda NVMe depolama, ücretsiz SSL, e-posta hesapları, cPanel veya Plesk kontrol paneli, haftalık otomatik yedekleme ve 7/24 destek yer alır.\nPlan seviyesine göre disk, bant genişliği, domain ve posta kutusu limitleri artar.",
          },
          {
            id: "hosting-2",
            question: "cPanel mi Plesk mi kullanmalıyım?",
            answer:
              "cPanel yaygın PHP/WordPress projeleri için hızlı ve tanıdık bir arayüz sunar.\nPlesk ise Windows/.NET ve çoklu site yönetiminde güçlü seçenekler sağlar; sipariş sırasında planınıza uygun panel atanır.",
          },
          {
            id: "hosting-3",
            question: "Mevcut sitemi ücretsiz taşıyor musunuz?",
            answer:
              "Evet, uygun hosting planlarında ücretsiz site taşıma hizmeti sunuyoruz.\nEski hosting sağlayıcınızdaki dosyalar, veritabanları ve e-posta hesapları uzman ekibimiz tarafından güvenli şekilde aktarılır.",
          },
          {
            id: "hosting-4",
            question: "WordPress ve diğer CMS'leri kurabilir miyim?",
            answer:
              "Kontrol panelinden tek tıkla WordPress, Joomla, Drupal ve benzeri popüler CMS'leri kurabilirsiniz.\nOtomatik güncellemeler, SSL ve yedekleme ile siteniz güvenli şekilde yayında kalır.",
          },
          {
            id: "hosting-5",
            question: "Hosting hesabım ne kadar sürede aktif olur?",
            answer:
              "Ödeme onayından sonra hosting hesabınız genellikle birkaç dakika içinde otomatik olarak oluşturulur.\nKurulum durumunu müşteri panelinizden canlı olarak takip edebilir, tamamlandığında panel bilgilerinize erişebilirsiniz.",
          },
          {
            id: "hosting-6",
            question: "E-posta hosting dahil mi?",
            answer:
              "Evet, planınıza bağlı olarak profesyonel e-posta hesapları oluşturabilir, webmail üzerinden erişebilir ve DNS kayıtlarınızı yönetebilirsiniz.\nSPF, DKIM ve temel spam filtreleme ayarları panel üzerinden yapılandırılabilir.",
          },
        ],
      },
      {
        id: "servers",
        title: "VPS, VDS ve Sunucu Hizmetleri",
        items: [
          {
            id: "servers-1",
            question: "VPS ile VDS arasındaki fark nedir?",
            answer:
              "VPS (Virtual Private Server) paylaşımlı kaynaklar üzerinde sanallaştırılmış, ölçeklenebilir ve uygun maliyetli bir çözümdür.\nVDS (Virtual Dedicated Server) ise daha izole kaynaklar ve tutarlı performans sunar; yoğun trafikli uygulamalar için idealdir.",
          },
          {
            id: "servers-2",
            question: "Sunucuma root erişimi veriliyor mu?",
            answer:
              "VPS ve VDS planlarında tam root (yönetici) erişimi sağlanır.\nİstediğiniz işletim sistemini kurabilir, özel yazılım yığınları deploy edebilir ve güvenlik yapılandırmanızı kendiniz yönetebilirsiniz.",
          },
          {
            id: "servers-3",
            question: "Sunucu kaynaklarını sonradan yükseltebilir miyim?",
            answer:
              "Evet, CPU, RAM ve disk kaynaklarınızı ihtiyaç duydukça yükseltebilirsiniz.\nYükseltme süreci planınıza ve altyapı uygunluğuna göre kısa sürede tamamlanır; veri kaybı olmadan geçiş hedeflenir.",
          },
          {
            id: "servers-4",
            question: "Hangi işletim sistemleri destekleniyor?",
            answer:
              "Linux dağıtımları (Ubuntu, Debian, AlmaLinux vb.) ve Windows Server sürümleri sunulmaktadır.\nKurulum sırasında tercih ettiğiniz OS imajını seçebilir veya kendi imajınızı yükleyebilirsiniz.",
          },
          {
            id: "servers-5",
            question: "Sunucu yedeklemesi nasıl çalışır?",
            answer:
              "Otomatik snapshot ve yedekleme seçenekleri planınıza göre sunulur.\nKritik verileriniz için ek yedekleme politikaları tanımlayabilir, panelden geri yükleme işlemi başlatabilirsiniz.",
          },
        ],
      },
      {
        id: "domains",
        title: "Domain ve DNS",
        items: [
          {
            id: "domains-1",
            question: "Domain kaydı ve transferi yapabilir miyim?",
            answer:
              "Evet, .com, .net, .org ve yüzlerce TLD için domain arama, kayıt ve transfer hizmeti sunuyoruz.\nTransfer için mevcut registrarınızdan aldığınız EPP/auth kodu ile süreci panelden başlatabilirsiniz.",
          },
          {
            id: "domains-2",
            question: "DNS kayıtlarını nereden yönetirim?",
            answer:
              "Domain DNS yönetimi müşteri panelinizden yapılır; A, AAAA, CNAME, MX, TXT ve NS kayıtlarını düzenleyebilirsiniz.\nDeğişiklikler genellikle birkaç dakika ile birkaç saat içinde global olarak yayılır (TTL'e bağlı).",
          },
          {
            id: "domains-3",
            question: "WHOIS gizliliği var mı?",
            answer:
              "Desteklenen TLD'lerde WHOIS gizlilik koruması sunulur.\nKişisel iletişim bilgileriniz halka açık WHOIS sorgularında gizlenir.",
          },
          {
            id: "domains-4",
            question: "Domain süresi dolmadan önce hatırlatma alır mıyım?",
            answer:
              "Evet, domain yenileme tarihiniz yaklaştığında e-posta bildirimleri gönderilir.\nOtomatik yenileme seçeneğini etkinleştirerek domain kaybı riskini azaltabilirsiniz.",
          },
        ],
      },
      {
        id: "licenses",
        title: "Yazılım Lisansları",
        items: [
          {
            id: "licenses-1",
            question: "Hangi lisansları satıyorsunuz?",
            answer:
              "Windows Server, Microsoft Office, antivirüs (Kaspersky, ESET vb.) ve diğer kurumsal yazılım lisanslarını sunuyoruz.\nGüncel ürün listesi ve fiyatlar fiyatlandırma sayfasında kategorilere ayrılmış şekilde listelenir.",
          },
          {
            id: "licenses-2",
            question: "Lisans teslimi ne kadar sürer?",
            answer:
              "Dijital lisanslar ödeme onayından sonra genellikle dakikalar içinde e-posta veya panel üzerinden teslim edilir.\nKurumsal ve toplu lisans siparişlerinde süre ürün türüne göre değişebilir.",
          },
          {
            id: "licenses-3",
            question: "Lisanslarım yasal ve orijinal mi?",
            answer:
              "Tüm lisanslar yetkili distribütör kanallarından temin edilir ve orijinal aktivasyon anahtarları sağlanır.\nFatura ve lisans belgeleriniz müşteri panelinizde saklanır.",
          },
          {
            id: "licenses-4",
            question: "Lisans yenileme ve yükseltme yapabilir miyim?",
            answer:
              "Mevcut lisansınızın süresi dolmadan yenileme veya üst sürüme yükseltme talebinde bulunabilirsiniz.\nDestek ekibimiz geçiş sürecinde size adım adım yardımcı olur.",
          },
        ],
      },
      {
        id: "special",
        title: "VPN, n8n ve Dosya Deploy",
        items: [
          {
            id: "special-1",
            question: "VPN sunucusu hizmetiniz ne işe yarar?",
            answer:
              "Özel VPN sunucunuz ile güvenli uzaktan erişim, şifreli bağlantı ve coğrafi kısıtlamaları aşma imkânı elde edersiniz.\nKurulum, protokol seçimi (WireGuard, OpenVPN vb.) ve kullanıcı yönetimi ihtiyacınıza göre yapılandırılır.",
          },
          {
            id: "special-2",
            question: "n8n sunucusu nedir?",
            answer:
              "n8n, kod yazmadan iş akışı otomasyonu kurmanızı sağlayan açık kaynak bir platformdur.\nVexira Host n8n sunucunuz önceden yapılandırılmış şekilde teslim edilir; API entegrasyonları, webhook'lar ve zamanlanmış görevler kurabilirsiniz.",
          },
          {
            id: "special-3",
            question: "Dosya deploy hizmeti nasıl çalışır?",
            answer:
              "Uygulama dosyalarınızı doğrudan sunucuya yükleyip hızlıca yayına alabilirsiniz.\nGit, FTP/SFTP veya panel üzerinden deploy seçenekleri proje yapınıza göre sunulur.",
          },
          {
            id: "special-4",
            question: "Bu özel hizmetler için teknik destek var mı?",
            answer:
              "Evet, VPN, n8n ve deploy hizmetlerinde kurulum sonrası yapılandırma ve sorun giderme desteği sağlanır.\n7/24 destek talebi açarak uzman ekibimizden yardım alabilirsiniz.",
          },
        ],
      },
      {
        id: "billing",
        title: "Ödeme, Fatura ve İade",
        items: [
          {
            id: "billing-1",
            question: "Hangi ödeme yöntemlerini kabul ediyorsunuz?",
            answer:
              "Kredi kartı, banka kartı ve desteklenen diğer online ödeme yöntemleri kabul edilir.\nKurumsal müşteriler için fatura ile ödeme seçenekleri değerlendirilebilir.",
          },
          {
            id: "billing-2",
            question: "30 gün para iade garantisi nasıl işler?",
            answer:
              "Uygun hosting planlarında ilk 30 gün içinde memnun kalmazsanız koşullar dahilinde iade talep edebilirsiniz.\nKullanılmış domain kayıtları ve üçüncü taraf lisans maliyetleri iade kapsamı dışında olabilir.",
          },
          {
            id: "billing-3",
            question: "Faturalarımı nereden görürüm?",
            answer:
              "Tüm faturalarınız müşteri panelinizde listelenir; PDF olarak indirebilir ve ödeme geçmişinizi takip edebilirsiniz.\nÖdeme hatırlatmaları e-posta ile gönderilir.",
          },
          {
            id: "billing-4",
            question: "Otomatik yenileme var mı?",
            answer:
              "Hizmetlerinizin kesintisiz devam etmesi için otomatik yenileme etkinleştirilebilir.\nİstediğiniz zaman panelden otomatik yenilemeyi kapatabilir veya ödeme yönteminizi güncelleyebilirsiniz.",
          },
          {
            id: "billing-5",
            question: "Planımı iptal etmek istiyorum, ne yapmalıyım?",
            answer:
              "Müşteri panelinden hizmet iptal talebi oluşturabilirsiniz.\nDönem sonuna kadar hizmetiniz aktif kalır; verilerinizi yedeklemeniz için yeterli süre tanınır.",
          },
        ],
      },
      {
        id: "account",
        title: "Hesap ve Güvenlik",
        items: [
          {
            id: "account-1",
            question: "Nasıl hesap oluştururum?",
            answer:
              "Ana sayfadaki Kayıt Ol butonuna tıklayarak e-posta ve şifre ile hesap oluşturabilirsiniz.\nE-posta doğrulaması tamamlandıktan sonra tüm hizmetlere erişim sağlanır.",
          },
          {
            id: "account-2",
            question: "Şifremi unuttum, ne yapmalıyım?",
            answer:
              "Giriş sayfasındaki Şifremi Unuttum bağlantısından e-posta adresinize sıfırlama linki gönderebilirsiniz.\nLink belirli bir süre geçerlidir; süresi dolmuşsa yeni talep oluşturun.",
          },
          {
            id: "account-3",
            question: "Hesabımı nasıl güvende tutarım?",
            answer:
              "Güçlü ve benzersiz şifre kullanın, e-posta doğrulamanızı tamamlayın ve şüpheli aktiviteleri derhal destek ekibine bildirin.\nMümkün olduğunda iki faktörlü doğrulama (2FA) kullanmanızı öneririz.",
          },
          {
            id: "account-4",
            question: "Oturumum neden sona eriyor?",
            answer:
              "Güvenlik nedeniyle belirli süre hareketsizlikten sonra oturum sonlandırılır.\nTekrar giriş yaparak kaldığınız yerden devam edebilirsiniz.",
          },
        ],
      },
      {
        id: "support",
        title: "Destek ve Teknik Yardım",
        items: [
          {
            id: "support-1",
            question: "Destek ekibine nasıl ulaşırım?",
            answer:
              "Müşteri panelinden 7/24 destek talebi (ticket) açabilirsiniz.\nAcil durumlar için öncelikli destek planları mevcuttur.",
          },
          {
            id: "support-2",
            question: "Destek taleplerine ne kadar sürede yanıt veriliyor?",
            answer:
              "Standart talepler genellikle birkaç saat içinde yanıtlanır; kritik altyapı sorunları önceliklendirilir.\nYoğunluk ve talep karmaşıklığına göre çözüm süresi değişebilir.",
          },
          {
            id: "support-3",
            question: "Site taşıma desteği ücretli mi?",
            answer:
              "Uygun hosting planlarında site taşıma ücretsizdir.\nÖzel sunucu veya büyük ölçekli migrasyon projelerinde özel teklif sunulabilir.",
          },
          {
            id: "support-4",
            question: "DDoS ve güvenlik saldırılarına karşı koruma var mı?",
            answer:
              "Altyapımızda temel DDoS filtreleme ve güvenlik duvarı katmanları aktiftir.\nYüksek riskli projeler için ek koruma paketleri değerlendirilebilir.",
          },
          {
            id: "support-5",
            question: "SSL sertifikası nasıl kurulur?",
            answer:
              "Hosting planlarında Let's Encrypt SSL ücretsiz ve otomatik olarak kurulur.\nKurumsal EV/OV sertifikaları için destek ekibimizle iletişime geçebilirsiniz.",
          },
        ],
      },
    ],
};
