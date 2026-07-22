import { getLocale } from "next-intl/server";

import { MarketingShell } from "@/components/layout/marketing-shell";

const LAST_UPDATED = "07.07.2026";

type PolicySection = { title: string; items: string[] };
type PolicyContent = { title: string; updatedAtLabel: string; sections: PolicySection[] };

const CONTENT: Record<"tr" | "en" | "ru" | "az", PolicyContent> = {
  tr: {
    title: "Kullanım Şartları",
    updatedAtLabel: "Son güncelleme",
    sections: [
      {
        title: "1. Kapsam",
        items: [
          "Bu kullanım şartları, Vexira Host tarafından sunulan web sitesi, panel ve hosting hizmetlerinin kullanımına ilişkin kuralları belirler.",
          "Hizmetleri kullanarak bu şartları kabul etmiş sayılırsınız.",
        ],
      },
      {
        title: "2. Hesap ve Güvenlik",
        items: [
          "Hesap bilgilerinizi doğru ve güncel tutmakla yükümlüsünüz.",
          "Şifre güvenliğinden kullanıcı sorumludur; şüpheli durumlarda derhal destek ekibiyle iletişime geçilmelidir.",
          "Yetkisiz erişim veya kötüye kullanım tespiti halinde hesap geçici olarak kısıtlanabilir.",
        ],
      },
      {
        title: "3. Hizmet Kullanım Kuralları",
        items: [
          "Hizmetler hukuka uygun amaçlarla kullanılmalıdır.",
          "Spam, zararlı yazılım, DDoS, phishing, yetkisiz erişim girişimleri ve benzeri faaliyetler yasaktır.",
          "Yüksek riskli veya yasa dışı içerikler tespit edilirse hizmet askıya alınabilir ya da sonlandırılabilir.",
        ],
      },
      {
        title: "4. Ücretlendirme ve Ödemeler",
        items: [
          "Hizmet bedelleri sipariş öncesinde belirtilir ve seçilen döneme göre faturalandırılır.",
          "Gecikmiş veya başarısız ödemelerde hizmetin yenilenmesi/erişimi durdurulabilir.",
          "İade koşulları kampanya ve ürün türüne göre değişebilir; aksi belirtilmedikçe yürürlükteki iade politikası uygulanır.",
        ],
      },
      {
        title: "5. Hizmette Değişiklik ve Kesinti",
        items: [
          "Teknik bakım, güvenlik gereksinimleri veya altyapı güncellemeleri nedeniyle geçici kesintiler olabilir.",
          "Vexira Host, hizmetin kapsamını ve özelliklerini makul ölçüde geliştirme amacıyla değiştirebilir.",
        ],
      },
      {
        title: "6. Sorumluluğun Sınırlandırılması",
        items: [
          "Mücbir sebep, üçüncü taraf altyapı arızaları veya kullanıcıdan kaynaklı ihlallerden doğan dolaylı zararlardan Vexira Host sorumlu tutulamaz.",
          "Azami sorumluluk, ilgili hizmet için kullanıcı tarafından son fatura döneminde ödenen tutarla sınırlıdır.",
        ],
      },
      {
        title: "7. Fesih",
        items: [
          "Kullanıcı dilediği zaman hesabını kapatma talebinde bulunabilir.",
          "Şartların ağır ihlali halinde Vexira Host hizmeti tek taraflı olarak sonlandırabilir.",
        ],
      },
      {
        title: "8. Uygulanacak Hukuk",
        items: [
          "Bu şartlar Türkiye Cumhuriyeti hukuku kapsamında yorumlanır.",
          "Uyuşmazlıklarda İstanbul (Merkez) mahkeme ve icra daireleri yetkilidir.",
        ],
      },
    ],
  },
  en: {
    title: "Terms of Service",
    updatedAtLabel: "Last updated",
    sections: [
      {
        title: "1. Scope",
        items: [
          "These terms govern the use of the website, control panel, and hosting services provided by Vexira Host.",
          "By using our services, you agree to these terms.",
        ],
      },
      {
        title: "2. Account and Security",
        items: [
          "You must keep your account information accurate and up to date.",
          "You are responsible for password security; contact support immediately if you suspect unauthorized access.",
          "Accounts may be temporarily restricted in case of unauthorized access or abuse.",
        ],
      },
      {
        title: "3. Acceptable Use",
        items: [
          "Services must be used for lawful purposes only.",
          "Spam, malware, DDoS, phishing, unauthorized access attempts, and similar activities are prohibited.",
          "High-risk or illegal content may result in suspension or termination of service.",
        ],
      },
      {
        title: "4. Billing and Payments",
        items: [
          "Service fees are shown before checkout and billed according to the selected billing cycle.",
          "Late or failed payments may suspend renewal or access to services.",
          "Refund terms may vary by product or promotion; the applicable refund policy applies unless stated otherwise.",
        ],
      },
      {
        title: "5. Changes and Interruptions",
        items: [
          "Temporary interruptions may occur due to maintenance, security requirements, or infrastructure updates.",
          "Vexira Host may reasonably modify service scope and features to improve the platform.",
        ],
      },
      {
        title: "6. Limitation of Liability",
        items: [
          "Vexira Host is not liable for indirect damages caused by force majeure, third-party infrastructure failures, or user violations.",
          "Maximum liability is limited to the amount paid by the user for the relevant service in the last billing period.",
        ],
      },
      {
        title: "7. Termination",
        items: [
          "Users may request account closure at any time.",
          "Vexira Host may terminate service unilaterally in case of material breach of these terms.",
        ],
      },
      {
        title: "8. Governing Law",
        items: [
          "These terms are interpreted under the laws of the Republic of Türkiye.",
          "Istanbul (Central) courts and enforcement offices have jurisdiction over disputes.",
        ],
      },
    ],
  },
  ru: {
    title: "Условия использования",
    updatedAtLabel: "Последнее обновление",
    sections: [
      {
        title: "1. Область применения",
        items: [
          "Настоящие условия регулируют использование сайта, панели управления и хостинг-услуг Vexira Host.",
          "Используя сервис, вы соглашаетесь с этими условиями.",
        ],
      },
      {
        title: "2. Аккаунт и безопасность",
        items: [
          "Вы обязаны поддерживать актуальность данных аккаунта.",
          "Пользователь отвечает за безопасность пароля; при подозрении на взлом немедленно свяжитесь с поддержкой.",
          "Аккаунт может быть временно ограничен при несанкционированном доступе или злоупотреблении.",
        ],
      },
      {
        title: "3. Правила использования",
        items: [
          "Услуги должны использоваться только в законных целях.",
          "Запрещены спам, вредоносное ПО, DDoS, фишинг, попытки несанкционированного доступа и аналогичные действия.",
          "Высокорисковый или незаконный контент может привести к приостановке или прекращению услуги.",
        ],
      },
      {
        title: "4. Оплата",
        items: [
          "Стоимость услуг указывается до оформления заказа и выставляется по выбранному периоду.",
          "При просрочке или неуспешной оплате доступ к услуге может быть приостановлен.",
          "Условия возврата зависят от продукта или акции; применяется действующая политика возврата.",
        ],
      },
      {
        title: "5. Изменения и перебои",
        items: [
          "Возможны временные перебои из-за обслуживания, требований безопасности или обновлений инфраструктуры.",
          "Vexira Host может разумно изменять объем и функции услуг для улучшения платформы.",
        ],
      },
      {
        title: "6. Ограничение ответственности",
        items: [
          "Vexira Host не несет ответственности за косвенный ущерб из-за форс-мажора, сбоев сторонней инфраструктуры или нарушений пользователя.",
          "Максимальная ответственность ограничена суммой, уплаченной пользователем за услугу в последнем расчетном периоде.",
        ],
      },
      {
        title: "7. Расторжение",
        items: [
          "Пользователь может запросить закрытие аккаунта в любое время.",
          "Vexira Host может прекратить услугу в одностороннем порядке при существенном нарушении условий.",
        ],
      },
      {
        title: "8. Применимое право",
        items: [
          "Условия толкуются в соответствии с законодательством Республики Турция.",
          "Споры подлежат рассмотрению судами и исполнительными органами Стамбула (Центральный).",
        ],
      },
    ],
  },
  az: {
    title: "İstifadə Şərtləri",
    updatedAtLabel: "Son yenilənmə",
    sections: [
      {
        title: "1. Əhatə dairəsi",
        items: [
          "Bu şərtlər Vexira Host tərəfindən təqdim olunan vebsayt, panel və hosting xidmətlərinin istifadəsini tənzimləyir.",
          "Xidmətlərdən istifadə etməklə bu şərtləri qəbul etmiş sayılırsınız.",
        ],
      },
      {
        title: "2. Hesab və təhlükəsizlik",
        items: [
          "Hesab məlumatlarınızı düzgün və aktual saxlamaq öhdəliyinizdir.",
          "Şifrə təhlükəsizliyinə görə istifadəçi məsuliyyət daşıyır; şübhəli hallarda dəstək ilə dərhal əlaqə saxlayın.",
          "İcazəsiz giriş və ya sui-istifadə aşkarlanarsa hesab müvəqqəti məhdudlaşdırıla bilər.",
        ],
      },
      {
        title: "3. İstifadə qaydaları",
        items: [
          "Xidmətlər yalnız qanuni məqsədlər üçün istifadə olunmalıdır.",
          "Spam, zərərli proqram, DDoS, fişinq, icazəsiz giriş cəhdləri və oxşar fəaliyyətlər qadağandır.",
          "Yüksək riskli və ya qanunsuz məzmun aşkarlanarsa xidmət dayandırıla və ya ləğv edilə bilər.",
        ],
      },
      {
        title: "4. Ödəniş və hesablaşma",
        items: [
          "Xidmət haqları sifarişdən əvvəl göstərilir və seçilmiş dövrə görə fakturalandırılır.",
          "Gecikmiş və ya uğursuz ödənişlərdə xidmətin yenilənməsi/girişi dayandırıla bilər.",
          "Geri ödəmə şərtləri məhsul və ya kampaniyadan asılı olaraq dəyişə bilər; qüvvədə olan siyasət tətbiq olunur.",
        ],
      },
      {
        title: "5. Dəyişikliklər və fasilələr",
        items: [
          "Texniki baxım, təhlükəsizlik tələbləri və ya infrastruktur yeniləmələri səbəbindən müvəqqəti fasilələr ola bilər.",
          "Vexira Host platformanı təkmilləşdirmək məqsədilə xidmətin əhatəsini və funksiyalarını məqbul dərəcədə dəyişə bilər.",
        ],
      },
      {
        title: "6. Məsuliyyətin məhdudlaşdırılması",
        items: [
          "Force majeure, üçüncü tərəf infrastruktur nasazlıqları və ya istifadəçi pozuntularından yaranan dolayı zərərlərə görə Vexira Host məsuliyyət daşımır.",
          "Maksimum məsuliyyət son faktura dövründə istifadəçinin həmin xidmət üçün ödədiyi məbləğlə məhdudlaşır.",
        ],
      },
      {
        title: "7. Xitam",
        items: [
          "İstifadəçi istənilən vaxt hesabın bağlanmasını tələb edə bilər.",
          "Şərtlərin ciddi pozulması halında Vexira Host xidməti tək tərəfli dayandıra bilər.",
        ],
      },
      {
        title: "8. Tətbiq olunan hüquq",
        items: [
          "Bu şərtlər Türkiyə Respublikasının qanunvericiliyi ilə şərh olunur.",
          "Mübahisələrdə İstanbul (Mərkəz) məhkəmələri və icra orqanları səlahiyyətlidir.",
        ],
      },
    ],
  },
};

export default async function TermsPage(): Promise<React.ReactElement> {
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
              <article
                key={section.title}
                className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 sm:p-6"
              >
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
