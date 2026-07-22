import { getLocale } from "next-intl/server";

import { MarketingShell } from "@/components/layout/marketing-shell";

const LAST_UPDATED = "07.07.2026";

type PolicySection = { title: string; items: string[] };
type PolicyContent = { title: string; updatedAtLabel: string; sections: PolicySection[] };

const CONTENT: Record<"tr" | "en" | "ru" | "az", PolicyContent> = {
  tr: {
    title: "Gizlilik Politikası",
    updatedAtLabel: "Son güncelleme",
    sections: [
      {
        title: "1. Veri Sorumlusu",
        items: [
          "Bu gizlilik politikası, Vexira Host tarafından sunulan hizmetlerde kişisel verilerin işlenmesine ilişkin esasları açıklar.",
          "Veri sorumlusu: Vexira Host. İletişim: privacy@vexirahost.com",
        ],
      },
      {
        title: "2. Hangi Verileri Topluyoruz",
        items: [
          "Kimlik ve iletişim verileri (ad, soyad, e-posta, telefon).",
          "Hesap ve işlem verileri (sipariş, fatura, ödeme durumu, destek kayıtları).",
          "Teknik veriler (IP adresi, cihaz bilgisi, tarayıcı türü, oturum kayıtları).",
          "Çerez ve kullanım verileri (site içi gezinme, tercih bilgileri).",
        ],
      },
      {
        title: "3. Verileri İşleme Amaçları",
        items: [
          "Hesap oluşturma, hizmetlerin sunulması ve yönetilmesi.",
          "Ödeme süreçlerinin yürütülmesi ve muhasebe yükümlülüklerinin yerine getirilmesi.",
          "Güvenlik, dolandırıcılık önleme ve sistem performansının izlenmesi.",
          "Müşteri desteği, bildirimler ve hizmet kalitesinin iyileştirilmesi.",
        ],
      },
      {
        title: "4. Hukuki Sebepler",
        items: [
          "Sözleşmenin kurulması ve ifası.",
          "Hukuki yükümlülüklerin yerine getirilmesi.",
          "Meşru menfaatler (güvenlik, hizmet sürekliliği, hata analizi).",
          "Gerekli hallerde açık rıza.",
        ],
      },
      {
        title: "5. Veri Aktarımı",
        items: [
          "Yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına.",
          "Ödeme, altyapı, e-posta ve güvenlik hizmeti sağlayıcılarına (hizmetin sunulması amacıyla).",
          "Yurt dışına veri aktarımı gerektiğinde, yürürlükteki mevzuata uygun teknik ve idari tedbirler alınır.",
        ],
      },
      {
        title: "6. Saklama Süreleri",
        items: [
          "Kişisel veriler, ilgili mevzuatta öngörülen süre boyunca veya işleme amacının gerektirdiği süre kadar saklanır.",
          "Süre sonunda veriler silinir, yok edilir veya anonim hale getirilir.",
        ],
      },
      {
        title: "7. Haklarınız",
        items: [
          "Verilerinize erişme, düzeltme, silme ve işlenmesini kısıtlama talep etme.",
          "Belirli durumlarda işlemeye itiraz etme ve veri taşınabilirliği talep etme.",
          "Açık rızaya dayalı işlemlerde rızayı geri çekme.",
          "Başvurular için: privacy@vexirahost.com",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updatedAtLabel: "Last updated",
    sections: [
      {
        title: "1. Data Controller",
        items: [
          "This privacy policy explains how personal data is processed when you use services provided by Vexira Host.",
          "Data controller: Vexira Host. Contact: privacy@vexirahost.com",
        ],
      },
      {
        title: "2. Data We Collect",
        items: [
          "Identity and contact data (name, surname, email, phone).",
          "Account and transaction data (orders, invoices, payment status, support records).",
          "Technical data (IP address, device information, browser type, session logs).",
          "Cookie and usage data (on-site navigation and preference information).",
        ],
      },
      {
        title: "3. Purposes of Processing",
        items: [
          "Account creation, service delivery, and account management.",
          "Processing payments and fulfilling accounting obligations.",
          "Security, fraud prevention, and system performance monitoring.",
          "Customer support, notifications, and service quality improvements.",
        ],
      },
      {
        title: "4. Legal Bases",
        items: [
          "Performance of a contract.",
          "Compliance with legal obligations.",
          "Legitimate interests (security, service continuity, error analysis).",
          "Consent where required.",
        ],
      },
      {
        title: "5. Data Transfers",
        items: [
          "To competent public authorities when legally required.",
          "To payment, infrastructure, email, and security providers for service delivery.",
          "When international transfers are required, appropriate technical and organizational safeguards are applied.",
        ],
      },
      {
        title: "6. Retention Periods",
        items: [
          "Personal data is retained for the period required by applicable law or for the purpose of processing.",
          "After retention ends, data is deleted, destroyed, or anonymized.",
        ],
      },
      {
        title: "7. Your Rights",
        items: [
          "Request access, correction, deletion, and restriction of processing.",
          "Object to processing and request data portability where applicable.",
          "Withdraw consent for processing based on consent.",
          "Requests: privacy@vexirahost.com",
        ],
      },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    updatedAtLabel: "Последнее обновление",
    sections: [
      {
        title: "1. Оператор данных",
        items: [
          "Настоящая политика описывает обработку персональных данных при использовании услуг Vexira Host.",
          "Оператор данных: Vexira Host. Контакт: privacy@vexirahost.com",
        ],
      },
      {
        title: "2. Какие данные мы собираем",
        items: [
          "Идентификационные и контактные данные (имя, фамилия, email, телефон).",
          "Данные аккаунта и транзакций (заказы, счета, статус оплаты, обращения в поддержку).",
          "Технические данные (IP-адрес, устройство, браузер, журналы сессий).",
          "Данные cookies и использования (навигация на сайте, предпочтения).",
        ],
      },
      {
        title: "3. Цели обработки",
        items: [
          "Создание аккаунта, предоставление и управление услугами.",
          "Обработка платежей и выполнение бухгалтерских обязательств.",
          "Безопасность, предотвращение мошенничества и мониторинг производительности.",
          "Поддержка клиентов, уведомления и улучшение качества сервиса.",
        ],
      },
      {
        title: "4. Правовые основания",
        items: [
          "Исполнение договора.",
          "Соблюдение юридических обязательств.",
          "Законные интересы (безопасность, непрерывность сервиса, анализ ошибок).",
          "Согласие, когда это требуется.",
        ],
      },
      {
        title: "5. Передача данных",
        items: [
          "Государственным органам при наличии законного требования.",
          "Поставщикам платежей, инфраструктуры, email и безопасности для оказания услуг.",
          "При трансграничной передаче применяются необходимые меры защиты.",
        ],
      },
      {
        title: "6. Сроки хранения",
        items: [
          "Данные хранятся в течение срока, установленного законом или целью обработки.",
          "По истечении срока данные удаляются, уничтожаются или обезличиваются.",
        ],
      },
      {
        title: "7. Ваши права",
        items: [
          "Запросить доступ, исправление, удаление и ограничение обработки.",
          "Возразить против обработки и запросить переносимость данных, где применимо.",
          "Отозвать согласие, если обработка основана на согласии.",
          "Запросы: privacy@vexirahost.com",
        ],
      },
    ],
  },
  az: {
    title: "Məxfilik Siyasəti",
    updatedAtLabel: "Son yenilənmə",
    sections: [
      {
        title: "1. Məlumat Operatoru",
        items: [
          "Bu məxfilik siyasəti Vexira Host xidmətlərindən istifadə edərkən şəxsi məlumatların necə emal olunduğunu izah edir.",
          "Məlumat operatoru: Vexira Host. Əlaqə: privacy@vexirahost.com",
        ],
      },
      {
        title: "2. Topladığımız Məlumatlar",
        items: [
          "Şəxsiyyət və əlaqə məlumatları (ad, soyad, e-poçt, telefon).",
          "Hesab və əməliyyat məlumatları (sifariş, faktura, ödəniş statusu, dəstək qeydləri).",
          "Texniki məlumatlar (IP ünvanı, cihaz, brauzer, sessiya logları).",
          "Cookie və istifadə məlumatları (saytda naviqasiya, seçimlər).",
        ],
      },
      {
        title: "3. Emal Məqsədləri",
        items: [
          "Hesab yaradılması, xidmətlərin göstərilməsi və idarə edilməsi.",
          "Ödəniş proseslərinin aparılması və mühasibat öhdəliklərinin yerinə yetirilməsi.",
          "Təhlükəsizlik, fırıldaqçılığın qarşısının alınması və sistem performansının izlənməsi.",
          "Müştəri dəstəyi, bildirişlər və xidmət keyfiyyətinin yaxşılaşdırılması.",
        ],
      },
      {
        title: "4. Hüquqi Əsaslar",
        items: [
          "Müqavilənin bağlanması və icrası.",
          "Hüquqi öhdəliklərin yerinə yetirilməsi.",
          "Qanuni maraqlar (təhlükəsizlik, xidmət davamlılığı, xəta analizi).",
          "Tələb olunduqda açıq razılıq.",
        ],
      },
      {
        title: "5. Məlumat Ötürülməsi",
        items: [
          "Qanuni tələb olduqda dövlət orqanlarına.",
          "Ödəniş, infrastruktur, e-poçt və təhlükəsizlik provayderlərinə (xidmətin göstərilməsi üçün).",
          "Xaricə ötürülmə tələb olunduqda müvafiq texniki və idarəetmə tədbirləri tətbiq olunur.",
        ],
      },
      {
        title: "6. Saxlama Müddətləri",
        items: [
          "Şəxsi məlumatlar qanunvericilikdə nəzərdə tutulan və ya emal məqsədinin tələb etdiyi müddət ərzində saxlanılır.",
          "Müddət bitdikdən sonra məlumatlar silinir, məhv edilir və ya anonimləşdirilir.",
        ],
      },
      {
        title: "7. Hüquqlarınız",
        items: [
          "Məlumatlara çıxış, düzəliş, silinmə və emalın məhdudlaşdırılması tələb etmək.",
          "Müəyyən hallarda etiraz etmək və məlumat daşınması tələb etmək.",
          "Razılığa əsaslanan emalda razılığı geri götürmək.",
          "Müraciətlər: privacy@vexirahost.com",
        ],
      },
    ],
  },
};

export default async function PrivacyPolicyPage(): Promise<React.ReactElement> {
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
