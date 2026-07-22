import type { AuthEmailLocale } from "./auth-email.locale";

export interface AuthEmailCopy {
  brandTagline: string;
  welcome: {
    title: string;
    subtitle: (name: string) => string;
    actionText: string;
    footer: string;
  };
  googleWelcome: {
    title: string;
    subtitle: (name: string) => string;
    actionText: string;
    footer: string;
  };
  googleSignIn: {
    title: string;
    subtitle: (name: string) => string;
    actionText: string;
    footer: string;
  };
  googleAccountLinked: {
    title: string;
    subtitle: (name: string, email: string) => string;
    actionText: string;
    footer: string;
  };
  verify: {
    title: string;
    subtitle: string;
    actionText: string;
    footer: string;
  };
  resetPassword: {
    title: string;
    subtitle: string;
    actionText: string;
    footer: string;
  };
  failedPasswordAttempts: {
    title: string;
    subtitle: (name: string) => string;
    actionText: string;
    footer: string;
  };
}

const COPY: Record<AuthEmailLocale, AuthEmailCopy> = {
  tr: {
    brandTagline: "Güvenli Bulut ve Hosting Platformu",
    welcome: {
      title: "Vexira Host'a hoş geldiniz",
      subtitle: (name) =>
        `Merhaba ${name}, hesabınız başarıyla oluşturuldu. Kontrol panelinizden hosting, sunucu ve lisans hizmetlerinizi yönetebilirsiniz.`,
      actionText: "Panele git",
      footer: "Bu hesabı siz oluşturmadıysanız lütfen destek ekibimizle iletişime geçin.",
    },
    googleWelcome: {
      title: "Google ile hesabınız oluşturuldu",
      subtitle: (name) =>
        `Merhaba ${name}, Google hesabınızla Vexira Host'a başarıyla kayıt oldunuz. Hizmetlerinizi hemen keşfedebilirsiniz.`,
      actionText: "Panele git",
      footer: "Bu işlemi siz yapmadıysanız hesabınızı güvence altına almak için bizimle iletişime geçin.",
    },
    googleSignIn: {
      title: "Google ile giriş yaptınız",
      subtitle: (name) =>
        `Merhaba ${name}, Vexira Host hesabınıza Google ile başarıyla giriş yapıldı.`,
      actionText: "Hesabımı aç",
      footer: "Bu girişi siz yapmadıysanız derhal şifrenizi değiştirin ve destek ekibimize bildirin.",
    },
    googleAccountLinked: {
      title: "Google hesabınız bağlandı",
      subtitle: (name, email) =>
        `Merhaba ${name}, Google hesabınız ${email} adresli Vexira Host hesabınıza başarıyla bağlandı. Artık e-posta şifreniz veya Google ile giriş yapabilirsiniz.`,
      actionText: "Panele git",
      footer: "Bu işlemi siz yapmadıysanız derhal destek ekibimizle iletişime geçin.",
    },
    verify: {
      title: "E-posta adresinizi doğrulayın",
      subtitle: "Hesabınızı güvenli şekilde aktif etmek için aşağıdaki butona tıklayın.",
      actionText: "E-postayı doğrula",
      footer: "Bu isteği siz yapmadıysanız e-postayı yok sayabilirsiniz.",
    },
    resetPassword: {
      title: "Şifre sıfırlama talebiniz",
      subtitle: "Hesap şifrenizi sıfırlamak için aşağıdaki güvenli bağlantıyı kullanın.",
      actionText: "Şifremi sıfırla",
      footer: "Bu isteği siz yapmadıysanız hesabınız güvende kalır, bu e-postayı yok sayabilirsiniz.",
    },
    failedPasswordAttempts: {
      title: "Şifreniz 3 kez yanlış girildi",
      subtitle: (name) =>
        `Merhaba ${name}, Vexira Host hesabınıza ardışık 3 kez yanlış şifre girildi. Hesabınızı korumak için şifrenizi sıfırlamanızı öneririz.`,
      actionText: "Şifremi sıfırla",
      footer: "Bu giriş denemelerini siz yapmadıysanız derhal destek ekibimizle iletişime geçin.",
    },
  },
  en: {
    brandTagline: "Secure Cloud & Hosting Platform",
    welcome: {
      title: "Welcome to Vexira Host",
      subtitle: (name) =>
        `Hi ${name}, your account has been created successfully. Manage hosting, servers, and licenses from your dashboard.`,
      actionText: "Go to dashboard",
      footer: "If you did not create this account, please contact our support team.",
    },
    googleWelcome: {
      title: "Your account was created with Google",
      subtitle: (name) =>
        `Hi ${name}, you have successfully signed up for Vexira Host with your Google account. Explore our services right away.`,
      actionText: "Go to dashboard",
      footer: "If you did not perform this action, contact us to secure your account.",
    },
    googleSignIn: {
      title: "Signed in with Google",
      subtitle: (name) =>
        `Hi ${name}, you have successfully signed in to your Vexira Host account with Google.`,
      actionText: "Open my account",
      footer: "If this was not you, change your password immediately and notify support.",
    },
    googleAccountLinked: {
      title: "Your Google account has been linked",
      subtitle: (name, email) =>
        `Hi ${name}, your Google account has been successfully linked to your Vexira Host account (${email}). You can now sign in with your email password or Google.`,
      actionText: "Go to dashboard",
      footer: "If you did not perform this action, contact our support team immediately.",
    },
    verify: {
      title: "Verify your email address",
      subtitle: "Click the button below to securely activate your account.",
      actionText: "Verify email",
      footer: "If you did not request this, you can safely ignore this email.",
    },
    resetPassword: {
      title: "Password reset request",
      subtitle: "Use the secure link below to reset your account password.",
      actionText: "Reset password",
      footer: "If you did not request this, your account remains secure — ignore this email.",
    },
    failedPasswordAttempts: {
      title: "Your password was entered incorrectly 3 times",
      subtitle: (name) =>
        `Hi ${name}, your Vexira Host account had 3 consecutive incorrect password attempts. We recommend resetting your password to keep your account secure.`,
      actionText: "Reset password",
      footer: "If these login attempts were not made by you, contact our support team immediately.",
    },
  },
  ru: {
    brandTagline: "Безопасная облачная и хостинг-платформа",
    welcome: {
      title: "Добро пожаловать в Vexira Host",
      subtitle: (name) =>
        `Здравствуйте, ${name}! Ваш аккаунт успешно создан. Управляйте хостингом, серверами и лицензиями в панели управления.`,
      actionText: "Перейти в панель",
      footer: "Если вы не создавали этот аккаунт, свяжитесь с нашей службой поддержки.",
    },
    googleWelcome: {
      title: "Аккаунт создан через Google",
      subtitle: (name) =>
        `Здравствуйте, ${name}! Вы успешно зарегистрировались в Vexira Host через Google. Начните пользоваться услугами прямо сейчас.`,
      actionText: "Перейти в панель",
      footer: "Если это были не вы, свяжитесь с нами для защиты аккаунта.",
    },
    googleSignIn: {
      title: "Вход через Google",
      subtitle: (name) =>
        `Здравствуйте, ${name}! Вы успешно вошли в аккаунт Vexira Host через Google.`,
      actionText: "Открыть аккаунт",
      footer: "Если это были не вы, немедленно смените пароль и сообщите в поддержку.",
    },
    googleAccountLinked: {
      title: "Аккаунт Google привязан",
      subtitle: (name, email) =>
        `Здравствуйте, ${name}! Ваш аккаунт Google успешно привязан к аккаунту Vexira Host (${email}). Теперь вы можете входить по паролю или через Google.`,
      actionText: "Перейти в панель",
      footer: "Если это были не вы, немедленно свяжитесь с нашей службой поддержки.",
    },
    verify: {
      title: "Подтвердите адрес электронной почты",
      subtitle: "Нажмите кнопку ниже, чтобы безопасно активировать аккаунт.",
      actionText: "Подтвердить email",
      footer: "Если вы не запрашивали это письмо, просто проигнорируйте его.",
    },
    resetPassword: {
      title: "Запрос на сброс пароля",
      subtitle: "Используйте безопасную ссылку ниже для сброса пароля аккаунта.",
      actionText: "Сбросить пароль",
      footer: "Если вы не запрашивали сброс, ваш аккаунт в безопасности — проигнорируйте письмо.",
    },
    failedPasswordAttempts: {
      title: "Пароль введён неверно 3 раза",
      subtitle: (name) =>
        `Здравствуйте, ${name}! В ваш аккаунт Vexira Host было введено 3 неверных пароля подряд. Рекомендуем сбросить пароль для защиты аккаунта.`,
      actionText: "Сбросить пароль",
      footer: "Если это были не вы, немедленно свяжитесь с нашей службой поддержки.",
    },
  },
  az: {
    brandTagline: "Təhlükəsiz Bulud və Hostinq Platforması",
    welcome: {
      title: "Vexira Host-a xoş gəlmisiniz",
      subtitle: (name) =>
        `Salam ${name}, hesabınız uğurla yaradıldı. Hostinq, server və lisenziya xidmətlərinizi paneldən idarə edə bilərsiniz.`,
      actionText: "Panelə keç",
      footer: "Bu hesabı siz yaratmamısınızsa, dəstək komandamızla əlaqə saxlayın.",
    },
    googleWelcome: {
      title: "Google ilə hesabınız yaradıldı",
      subtitle: (name) =>
        `Salam ${name}, Google hesabınızla Vexira Host-a uğurla qeydiyyatdan keçdiniz. Xidmətlərimizi dərhal kəşf edin.`,
      actionText: "Panelə keç",
      footer: "Bu əməliyyatı siz etməmisinizsə, hesabınızı qorumaq üçün bizimlə əlaqə saxlayın.",
    },
    googleSignIn: {
      title: "Google ilə daxil oldunuz",
      subtitle: (name) =>
        `Salam ${name}, Vexira Host hesabınıza Google ilə uğurla daxil olundu.`,
      actionText: "Hesabımı aç",
      footer: "Bu giriş siz deyilsinizsə, dərhal şifrənizi dəyişin və dəstəyə bildirin.",
    },
    googleAccountLinked: {
      title: "Google hesabınız bağlandı",
      subtitle: (name, email) =>
        `Salam ${name}, Google hesabınız ${email} ünvanlı Vexira Host hesabınıza uğurla bağlandı. İndi e-poçt şifrəniz və ya Google ilə daxil ola bilərsiniz.`,
      actionText: "Panelə keç",
      footer: "Bu əməliyyatı siz etməmisinizsə, dərhal dəstək komandamızla əlaqə saxlayın.",
    },
    verify: {
      title: "E-poçt ünvanınızı təsdiqləyin",
      subtitle: "Hesabınızı təhlükəsiz aktivləşdirmək üçün aşağıdakı düyməyə klikləyin.",
      actionText: "E-poçtu təsdiqlə",
      footer: "Bu sorğunu siz etməmisinizsə, e-poçtu nəzərə almayın.",
    },
    resetPassword: {
      title: "Şifrə sıfırlama sorğusu",
      subtitle: "Hesab şifrənizi sıfırlamaq üçün aşağıdakı təhlükəsiz keçiddən istifadə edin.",
      actionText: "Şifrəmi sıfırla",
      footer: "Bu sorğunu siz etməmisinizsə, hesabınız təhlükəsizdir — e-poçtu nəzərə almayın.",
    },
    failedPasswordAttempts: {
      title: "Şifrəniz 3 dəfə səhv daxil edilib",
      subtitle: (name) =>
        `Salam ${name}, Vexira Host hesabınıza ardıcıl 3 dəfə səhv şifrə daxil edilib. Hesabınızı qorumaq üçün şifrənizi sıfırlamağı tövsiyə edirik.`,
      actionText: "Şifrəmi sıfırla",
      footer: "Bu giriş cəhdlərini siz etməmisinizsə, dərhal dəstək komandamızla əlaqə saxlayın.",
    },
  },
};

export function getAuthEmailCopy(locale: AuthEmailLocale): AuthEmailCopy {
  return COPY[locale];
}

export function displayName(firstName?: string | null, lastName?: string | null, email?: string): string {
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (email) return email.split("@")[0] ?? "there";
  return "there";
}
