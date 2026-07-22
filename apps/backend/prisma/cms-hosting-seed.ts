import { CmsSectionType, PrismaClient } from "@prisma/client";

type L = { tr: string; en: string; ru: string; az: string };

function l(tr: string, en: string, ru: string, az: string): L {
  return { tr, en, ru, az };
}

export async function seedHostingCmsPage(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.cmsPage.findUnique({ where: { slug: "hosting" } });
  if (existing) return;

  const page = await prisma.cmsPage.create({
    data: {
      slug: "hosting",
      title: l("Web Hosting", "Web Hosting", "Веб-хостинг", "Web Hostinq"),
      sections: {
        create: [
          {
            key: "hero",
            type: CmsSectionType.HERO,
            sortOrder: 0,
            design: { variant: "gradient", padding: "lg" },
            content: {
              discountBadge: l(
                "Yıllık planlarda %75'e varan indirim",
                "Up to 75% off annual plans",
                "Скидка до 75% на годовые планы",
                "İllik planlarda 75%-ə qədər endirim",
              ),
              title: l("Web Hosting", "Web Hosting", "Веб-хостинг", "Web Hostinq"),
              subtitle: l(
                "Güvenli. Hızlı. Web sitenizin olması gerektiği gibi.",
                "Secure. Fast. Your website, the way it should be.",
                "Безопасно. Быстро. Ваш сайт — каким он должен быть.",
                "Təhlükəsiz. Sürətli. Veb saytınız olmalı olduğu kimi.",
              ),
              perks: [
                l("Ücretsiz site taşıma", "Free website migration", "Бесплатный перенос сайта", "Pulsuz sayt köçürməsi"),
                l("WordPress ve diğer CMS'ler", "Run WordPress or any CMS", "WordPress и другие CMS", "WordPress və digər CMS"),
                l("Tam yönetimli web hosting", "Fully managed web hosting", "Полностью управляемый хостинг", "Tam idarə olunan hostinq"),
                l("7/24 müşteri desteği", "24/7 customer support", "Поддержка 24/7", "7/24 müştəri dəstəyi"),
              ],
              ctaPrimary: l("Şimdi Başla", "Get Started", "Начать", "İndi başla"),
              ctaPrimaryHref: "#hosting-plans",
              ctaSecondary: l("Hesap Oluştur", "Create Account", "Создать аккаунт", "Hesab yarat"),
              ctaSecondaryHref: "/register",
              moneyBack: l(
                "30 gün para iade garantili",
                "30-day money-back guarantee",
                "30 дней гарантии возврата",
                "30 gün pul geri qaytarma zəmanəti",
              ),
            },
          },
          {
            key: "plans",
            type: CmsSectionType.PLANS,
            sortOrder: 1,
            design: { padding: "lg", columns: 4 },
            content: {
              title: l(
                "Size en uygun planı seçin",
                "Choose the plan that fits you",
                "Выберите подходящий план",
                "Sizə uyğun planı seçin",
              ),
              guarantees: [
                l("30 gün para iade garantisi", "30-day money-back guarantee", "30 дней возврата", "30 gün pul geri qaytarma"),
                l("İstediğiniz zaman iptal", "Cancel anytime", "Отмена в любое время", "İstədiyiniz zaman ləğv"),
                l("7/24 destek", "24/7 support", "Поддержка 24/7", "7/24 dəstək"),
              ],
              priceNote: l(
                "Gösterilen fiyatlar aylık ücrettir. Vergiler ödeme sırasında hesaplanır.",
                "Prices shown are monthly. Taxes calculated at checkout.",
                "Цены указаны за месяц. Налоги при оформлении.",
                "Qiymətlər aylıqdır. Vergilər ödəniş zamanı hesablanır.",
              ),
              emptyPlans: l(
                "Henüz hosting planı bulunmuyor.",
                "No hosting plans available yet.",
                "Планы хостинга пока недоступны.",
                "Hələ hostinq planı yoxdur.",
              ),
            },
          },
          {
            key: "included",
            type: CmsSectionType.INCLUDED,
            sortOrder: 2,
            design: { columns: 3, padding: "md" },
            content: {
              title: l(
                "Ekstra ücret ödemeden faydalanın",
                "Included at no extra cost",
                "Включено без доплат",
                "Əlavə ödənişsiz daxildir",
              ),
              items: [
                l("Sınırsız ücretsiz SSL sertifikası", "Unlimited free SSL certificates", "Бесплатные SSL", "Limitsiz pulsuz SSL"),
                l("Ücretsiz otomatik site taşıma", "Free automatic site migration", "Бесплатный перенос", "Pulsuz avtomatik köçürmə"),
                l("Otomatik yedeklemeler", "Automatic backups", "Автоматические бэкапы", "Avtomatik ehtiyat nüsxələr"),
                l("7/24 uzman destek", "24/7 expert support", "Экспертная поддержка 24/7", "7/24 ekspert dəstək"),
                l("cPanel ve Plesk kontrol paneli", "cPanel and Plesk control panel", "cPanel и Plesk", "cPanel və Plesk paneli"),
                l("%99,9 çalışma süresi garantisi", "99.9% uptime guarantee", "Гарантия 99.9% uptime", "%99,9 işləmə zəmanəti"),
              ],
            },
          },
          {
            key: "features",
            type: CmsSectionType.FEATURES,
            sortOrder: 3,
            design: { layout: "alternating", padding: "lg" },
            content: {
              blocks: [
                {
                  icon: "shield_lock",
                  layout: "left",
                  title: l("Güvenlik en büyük önceliğimiz", "Security is our top priority", "Безопасность — приоритет", "Təhlükəsizlik prioritetimizdir"),
                  description: l(
                    "Ziyaretçilerinizin verilerini korumak için her katmanda güvenlik.",
                    "Protection at every layer for you and your visitors.",
                    "Защита на каждом уровне.",
                    "Hər səviyyədə qoruma.",
                  ),
                  bullets: [
                    l("Ücretsiz SSL sertifikaları", "Free SSL certificates", "Бесплатные SSL", "Pulsuz SSL"),
                    l("Otomatik güvenlik taramaları", "Automated security scans", "Автосканирование", "Avtomatik təhlükəsizlik skanı"),
                    l("WHOIS gizlilik koruması", "WHOIS privacy protection", "WHOIS privacy", "WHOIS məxfilik"),
                  ],
                },
                {
                  icon: "speed",
                  layout: "right",
                  title: l("Eşsiz web sitesi performansı", "Outstanding website performance", "Высокая производительность", "Üstün performans"),
                  description: l(
                    "NVMe depolama ve optimize sunucu altyapısı ile hızlı yükleme.",
                    "NVMe storage and optimized servers for fast load times.",
                    "NVMe и оптимизированные серверы.",
                    "NVMe və optimallaşdırılmış serverlər.",
                  ),
                  bullets: [
                    l("NVMe SSD depolama", "NVMe SSD storage", "NVMe SSD", "NVMe SSD saxlama"),
                    l("LiteSpeed ve önbellek optimizasyonu", "LiteSpeed and cache optimization", "LiteSpeed и кэш", "LiteSpeed və keş"),
                    l("Yüksek bant genişliği", "High bandwidth limits", "Высокая пропускная способность", "Yüksək bant genişliyi"),
                  ],
                },
                {
                  icon: "trending_up",
                  layout: "left",
                  title: l("İşinizi ölçeklendirin, biz arkanızdayız", "Scale your business, we've got your back", "Масштабируйте бизнес", "Biznesinizi böyüdün"),
                  description: l(
                    "Trafik arttıkça kaynaklarınızı kolayca yükseltin.",
                    "Upgrade resources easily as traffic grows.",
                    "Легко увеличивайте ресурсы.",
                    "Traffik artdıqca resursları artırın.",
                  ),
                  bullets: [
                    l("Plan yükseltme tek tıkla", "One-click plan upgrades", "Апгрейд в один клик", "Bir kliklə plan yüksəltmə"),
                    l("Ölçeklenebilir hosting paketleri", "Scalable hosting packages", "Масштабируемые пакеты", "Ölçülənə bilən paketlər"),
                    l("Küresel veri merkezi ağı", "Global data center network", "Глобальная сеть ЦОД", "Qlobal mərkəz şəbəkəsi"),
                  ],
                },
                {
                  icon: "sync_alt",
                  layout: "right",
                  title: l("Zahmetsizce Vexira Host'a geçin", "Switch to Vexira Host effortlessly", "Переход на Vexira Host", "Vexira Host-a keçin"),
                  description: l(
                    "Mevcut sitenizi ücretsiz ve kesintisiz taşıyın.",
                    "Move your existing site for free with zero downtime.",
                    "Бесплатный перенос без простоя.",
                    "Saytınızı pulsuz və fasiləsiz köçürün.",
                  ),
                  bullets: [
                    l("Ücretsiz site taşıma", "Free website migration", "Бесплатный перенос", "Pulsuz köçürmə"),
                    l("Uzman taşıma desteği", "Expert migration support", "Экспертная поддержка", "Ekspert köçürmə dəstəyi"),
                    l("Taşıma süresince site çevrimiçi kalır", "Site stays online during transfer", "Сайт онлайн при переносе", "Köçürmə zamanı sayt aktiv qalır"),
                  ],
                },
              ],
            },
          },
          {
            key: "faq",
            type: CmsSectionType.FAQ,
            sortOrder: 4,
            design: { padding: "lg" },
            content: {
              title: l("Web hosting SSS", "Web hosting FAQ", "FAQ по хостингу", "Web hostinq SSS"),
              items: [
                {
                  question: l(
                    "Web hosting nedir ve neden buna ihtiyacım var?",
                    "What is web hosting and why do I need it?",
                    "Что такое хостинг?",
                    "Web hostinq nədir?",
                  ),
                  answer: l(
                    "Web hosting, sitenizin dosyalarını saklayıp internette erişilebilir kılan hizmettir.",
                    "Web hosting stores your site files and makes them accessible online.",
                    "Хостинг хранит файлы сайта и делает их доступными в интернете.",
                    "Web hostinq sayt fayllarını saxlayır və onlayn əlçatan edir.",
                  ),
                },
                {
                  question: l(
                    "Nasıl hosting planı satın alabilirim?",
                    "How do I purchase a hosting plan?",
                    "Как купить план?",
                    "Planı necə ala bilərəm?",
                  ),
                  answer: l(
                    "Plan seçin, sepete ekleyin ve ödeme adımlarını tamamlayın.",
                    "Select a plan, add it to cart, and complete checkout.",
                    "Выберите план, добавьте в корзину и оплатите.",
                    "Plan seçin, səbətə əlavə edin və ödənişi tamamlayın.",
                  ),
                },
                {
                  question: l(
                    "Mevcut web sitemi taşıyabilir miyim?",
                    "Can I migrate my existing website?",
                    "Могу ли я перенести сайт?",
                    "Saytımı köçürə bilərəmmi?",
                  ),
                  answer: l(
                    "Evet. Tüm planlarımızda ücretsiz site taşıma desteği sunuyoruz.",
                    "Yes. All plans include free migration support.",
                    "Да. Все планы включают бесплатный перенос.",
                    "Bəli. Bütün planlarda pulsuz köçürmə var.",
                  ),
                },
                {
                  question: l(
                    "cPanel mi Plesk mi kullanmalıyım?",
                    "Should I use cPanel or Plesk?",
                    "cPanel или Plesk?",
                    "cPanel və ya Plesk?",
                  ),
                  answer: l(
                    "cPanel yaygın ve kullanıcı dostudur. Plesk Windows ve çoklu site yönetimi için güçlüdür.",
                    "cPanel is popular and beginner-friendly. Plesk excels at multi-site workloads.",
                    "cPanel популярен. Plesk силён для мультисайта.",
                    "cPanel populyardır. Plesk çoxsaylı saytlar üçün güclüdür.",
                  ),
                },
              ],
            },
          },
        ],
      },
    },
  });

  void page;
}
