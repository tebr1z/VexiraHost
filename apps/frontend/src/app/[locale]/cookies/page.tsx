import { MarketingShell } from "@/components/layout/marketing-shell";
import { getLocale } from "next-intl/server";

const LAST_UPDATED = "07.07.2026";

type PolicySection = { title: string; items: string[] };
type PolicyContent = { title: string; updatedAtLabel: string; sections: PolicySection[] };

const CONTENT: Record<"tr" | "en" | "ru" | "az", PolicyContent> = {
  tr: {
    title: "Çerez Politikası",
    updatedAtLabel: "Son güncelleme",
    sections: [
      {
        title: "1. Çerez Nedir?",
        items: [
          "Çerezler, web sitesini ziyaret ettiğinizde tarayıcınıza kaydedilen küçük metin dosyalarıdır.",
          "Çerezler; oturum yönetimi, güvenlik, tercihlerin hatırlanması ve kullanım analizi gibi amaçlarla kullanılır.",
        ],
      },
      {
        title: "2. Hangi Çerezleri Kullanıyoruz?",
        items: [
          "Zorunlu çerezler: Hesap girişi, güvenlik doğrulaması ve temel site işlevleri için gereklidir.",
          "İşlevsel çerezler: Dil, tema ve kullanıcı tercihlerinizi hatırlar.",
          "Analitik çerezler: Trafik, sayfa performansı ve kullanım davranışlarını ölçmek için kullanılır.",
          "Pazarlama çerezleri: Kampanya etkinliğini ölçmek ve kişiselleştirilmiş içerik sunmak için (aktifse) kullanılır.",
        ],
      },
      {
        title: "3. Çerez Bazlı İşleme Amaçları",
        items: [
          "Hesabınızın güvenli şekilde oturum açmasını sağlamak.",
          "Sitenin performansını ölçmek ve hataları azaltmak.",
          "Kullanıcı deneyimini geliştirmek ve tercihlerinizi korumak.",
          "Yasal yükümlülükler ve güvenlik kayıtları kapsamında teknik log tutmak.",
        ],
      },
      {
        title: "4. Hukuki Dayanak",
        items: [
          "Zorunlu çerezler, hizmetin sunulması ve meşru menfaat kapsamında işlenebilir.",
          "Zorunlu olmayan analitik/pazarlama çerezleri yalnızca açık rızanızla etkinleştirilir.",
          "Rızanızı dilediğiniz zaman geri çekebilir, geleceğe dönük olarak çerez kullanımını durdurabilirsiniz.",
        ],
      },
      {
        title: "5. Çerez Süreleri",
        items: [
          "Oturum çerezleri tarayıcınızı kapattığınızda silinir.",
          "Kalıcı çerezler, çerez türüne göre belirli bir süre boyunca cihazınızda tutulur.",
          "Süreler; işlevin gerekliliği, güvenlik ihtiyaçları ve yasal yükümlülüklere göre belirlenir.",
        ],
      },
      {
        title: "6. Çerez Tercihlerini Nasıl Yönetebilirsiniz?",
        items: [
          "Çerez tercih panelinden kategorilere göre izin verip izinleri geri alabilirsiniz.",
          "Tarayıcı ayarlarınızdan çerezleri silebilir veya tamamen engelleyebilirsiniz.",
          "Bazı çerezleri devre dışı bırakmanız, sitenin bazı özelliklerinin düzgün çalışmamasına neden olabilir.",
        ],
      },
      {
        title: "7. Üçüncü Taraf Çerezler",
        items: [
          "Analitik, ödeme, güvenlik veya destek hizmetlerinde üçüncü taraf sağlayıcı çerezleri kullanılabilir.",
          "Bu sağlayıcıların veri işleme süreçleri kendi gizlilik/çerez politikalarına tabidir.",
          "Üçüncü taraf çerezler için tercihlerinizi çerez paneli üzerinden yönetebilirsiniz.",
        ],
      },
      {
        title: "8. Politika Güncellemeleri",
        items: [
          "Bu politika, mevzuat değişiklikleri veya teknik güncellemeler doğrultusunda revize edilebilir.",
          "Önemli değişikliklerde güncel sürüm web sitemizde yayımlanır.",
        ],
      },
      {
        title: "9. İletişim",
        items: ["Çerez kullanımıyla ilgili sorularınız için: privacy@vexirahost.com"],
      },
    ],
  },
  en: {
    title: "Cookie Policy",
    updatedAtLabel: "Last updated",
    sections: [
      {
        title: "1. What Are Cookies?",
        items: [
          "Cookies are small text files stored in your browser when you visit our website.",
          "They are used for session management, security, remembering preferences, and usage analytics.",
        ],
      },
      {
        title: "2. Cookie Categories We Use",
        items: [
          "Strictly necessary cookies: required for login, security, and core website functionality.",
          "Functional cookies: remember settings such as language and theme.",
          "Analytics cookies: help us measure traffic, performance, and user behavior.",
          "Marketing cookies: used for campaign measurement and personalized content (when enabled).",
        ],
      },
      {
        title: "3. Legal Basis",
        items: [
          "Necessary cookies may be processed under legitimate interest and service necessity.",
          "Non-essential cookies are activated only with your consent.",
          "You can withdraw consent at any time from the cookie settings panel.",
        ],
      },
      {
        title: "4. Retention and Control",
        items: [
          "Session cookies are deleted when you close your browser.",
          "Persistent cookies remain for a defined period based on their purpose.",
          "You can manage or disable cookies via browser settings and our cookie panel.",
        ],
      },
      {
        title: "5. Third-Party Cookies and Contact",
        items: [
          "Some services (analytics, payments, security) may place third-party cookies.",
          "Third-party processing is governed by their own privacy and cookie terms.",
          "For questions: privacy@vexirahost.com",
        ],
      },
    ],
  },
  ru: {
    title: "Политика cookies",
    updatedAtLabel: "Последнее обновление",
    sections: [
      {
        title: "1. Что такое cookies?",
        items: [
          "Cookies — это небольшие текстовые файлы, которые сохраняются в браузере при посещении сайта.",
          "Они используются для сессий, безопасности, запоминания настроек и аналитики.",
        ],
      },
      {
        title: "2. Типы cookies",
        items: [
          "Обязательные cookies: вход, безопасность и базовые функции сайта.",
          "Функциональные cookies: язык, тема и пользовательские настройки.",
          "Аналитические cookies: измерение трафика и поведения пользователей.",
          "Маркетинговые cookies: анализ кампаний и персонализация (если активны).",
        ],
      },
      {
        title: "3. Правовое основание и управление",
        items: [
          "Обязательные cookies могут использоваться на основании законного интереса.",
          "Необязательные cookies включаются только после вашего согласия.",
          "Вы можете изменить или отозвать согласие в панели настроек cookies.",
          "Вопросы: privacy@vexirahost.com",
        ],
      },
    ],
  },
  az: {
    title: "Cookie Siyasəti",
    updatedAtLabel: "Son yenilənmə",
    sections: [
      {
        title: "1. Cookie nədir?",
        items: [
          "Cookie-lər saytı ziyarət etdikdə brauzerinizdə saxlanılan kiçik mətn fayllarıdır.",
          "Bunlar sessiya idarəetməsi, təhlükəsizlik, seçimlərin yadda saxlanması və analitika üçün istifadə olunur.",
        ],
      },
      {
        title: "2. İstifadə etdiyimiz cookie növləri",
        items: [
          "Məcburi cookie-lər: giriş, təhlükəsizlik və əsas sayt funksiyaları üçün lazımdır.",
          "Funksional cookie-lər: dil, tema və digər seçimlərinizi xatırlayır.",
          "Analitik cookie-lər: trafik və istifadə davranışını ölçür.",
          "Marketinq cookie-ləri: kampaniya ölçümü və fərdiləşdirmə üçün (aktivdirsə) istifadə olunur.",
        ],
      },
      {
        title: "3. Hüquqi əsas və idarəetmə",
        items: [
          "Məcburi cookie-lər legitim maraq əsasında emal edilə bilər.",
          "Məcburi olmayan cookie-lər yalnız açıq razılığınızla aktivləşdirilir.",
          "Razılığınızı cookie panelindən istənilən vaxt dəyişə və geri götürə bilərsiniz.",
          "Suallar üçün: privacy@vexirahost.com",
        ],
      },
    ],
  },
};

export default async function CookiesPolicyPage(): Promise<React.ReactElement> {
  const locale = await getLocale();
  const policy = CONTENT[(locale in CONTENT ? locale : "en") as keyof typeof CONTENT];

  return (
    <MarketingShell>
      <section className="apple-page py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--label)] sm:text-4xl">
            {policy.title}
          </h1>
          <p className="mt-3 text-sm text-[var(--label-tertiary)]">
            {policy.updatedAtLabel}: {LAST_UPDATED}
          </p>

          <div className="mt-8 space-y-8">
            {policy.sections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-[var(--label)]">{section.title}</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--label-secondary)] sm:text-[15px]">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
