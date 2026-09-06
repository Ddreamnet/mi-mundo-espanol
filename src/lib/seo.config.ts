/**
 * Sitenin tek SEO kaynağı.
 *
 * Hem çalışma zamanında (<Seo /> bileşeni) hem de build sırasında
 * (vite.config.ts içindeki staticSeoPages eklentisi) bu dosya okunur.
 * Bir sayfanın başlığını/açıklamasını değiştirmek için sadece burayı düzenle.
 */

/**
 * ⚠️ DOMAIN BURADA TANIMLI — canlıya çıkmadan önce doğrula.
 * canonical, og:url, sitemap.xml ve robots.txt hepsi bu değerden üretilir.
 * Sonunda "/" olmamalı. www'lu sürüm canonical kabul edilir; public/.htaccess
 * www'suz ve http istekleri buraya 301 ile yönlendirir.
 */
export const SITE_URL = "https://www.mimundoespanol.com";

export const SITE_NAME = "Mi Mundo Español";

/** Sitenin varsayılan / canonical dili. */
export const DEFAULT_LANG = "tr" as const;

/** 1200x630 sosyal medya önizleme görseli (public/og-image.png). */
export const OG_IMAGE_PATH = "/og-image.png";

/** Yapısal veride ve iletişim bilgilerinde kullanılan işletme künyesi. */
export const BUSINESS = {
  /** E.164 formatı — schema.org telephone bunu bekler. */
  telephone: "+905304721875",
  email: "mertaydin245@hotmail.com",
  instagram: "https://www.instagram.com/mi.mundo_espanol/",
  whatsapp: "https://wa.me/905304721875",
  /** Derslerin verildiği diller (schema.org availableLanguage). */
  availableLanguages: ["Spanish", "Turkish", "English"],
} as const;

export type SeoLang = "tr" | "en" | "es";

export interface PageMeta {
  title: string;
  description: string;
  /** Sayfanın ana H1'i — statik HTML'deki <noscript> fallback'inde kullanılır. */
  heading?: string;
}

export interface PageSeo {
  /** sitemap.xml <priority> */
  priority: number;
  /** sitemap.xml <changefreq> */
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  /** true ise sayfa sitemap'e girmez ve noindex alır. */
  noindex?: boolean;
  tr: PageMeta;
  en: PageMeta;
  es: PageMeta;
}

/**
 * İndekslenen tüm rotalar. Anahtarlar App.tsx'teki <Route path> ile birebir aynı olmalı.
 * Yeni bir sayfa eklerken buraya da eklemezsen sitemap'e ve statik HTML'e girmez.
 */
export const PAGE_SEO: Record<string, PageSeo> = {
  "/": {
    priority: 1.0,
    changefreq: "weekly",
    tr: {
      title: "Online İspanyolca Dersi | Birebir Özel Ders – Mi Mundo Español",
      description:
        "Anadili İspanyolca eğitmenlerle online İspanyolca dersi. Birebir özel ders, esnek ders saatleri ve DELE hazırlık. Seviyene özel programla hemen başla.",
      heading: "Online İspanyolca Dersi ve Birebir Özel Ders",
    },
    en: {
      title: "Online Spanish Lessons | One-to-One Tutoring – Mi Mundo Español",
      description:
        "Learn Spanish online with native-speaking teachers. One-to-one lessons, flexible hours and DELE exam preparation. Start with a plan built around your level.",
      heading: "Online Spanish Lessons and One-to-One Tutoring",
    },
    es: {
      title: "Clases de Español Online | Clases Particulares – Mi Mundo Español",
      description:
        "Clases de español online con profesores nativos. Clases particulares, horarios flexibles y preparación para el DELE. Empieza con un plan a tu medida.",
      heading: "Clases de Español Online y Clases Particulares",
    },
  },

  "/dersler": {
    priority: 0.9,
    changefreq: "monthly",
    tr: {
      title: "Online İspanyolca Ders Paketleri | Mi Mundo Español",
      description:
        "Birebir özel ve grup İspanyolca ders paketleri, seviye programları ve ders içerikleri. Sana uygun paketi seç, online İspanyolca öğrenmeye bugün başla.",
      heading: "İspanyolca Ders Paketleri",
    },
    en: {
      title: "Online Spanish Lesson Packages | Mi Mundo Español",
      description:
        "One-to-one and group Spanish lesson packages, level programmes and course content. Pick the package that fits you and start learning Spanish online today.",
      heading: "Spanish Lesson Packages",
    },
    es: {
      title: "Paquetes de Clases de Español Online | Mi Mundo Español",
      description:
        "Paquetes de clases de español particulares y en grupo, programas por niveles y contenidos. Elige el paquete que encaje contigo y empieza hoy mismo.",
      heading: "Paquetes de Clases de Español",
    },
  },

  "/sss": {
    priority: 0.7,
    changefreq: "monthly",
    tr: {
      title: "İspanyolca Dersi SSS | Sıkça Sorulan Sorular – Mi Mundo Español",
      description:
        "Online İspanyolca dersleri hakkında merak edilenler: ders ücretleri, ders süreleri, seviye tespiti, DELE hazırlığı ve ders erteleme. Cevaplar burada.",
      heading: "Sıkça Sorulan Sorular",
    },
    en: {
      title: "Spanish Lesson FAQ | Frequently Asked Questions – Mi Mundo Español",
      description:
        "Everything you want to know about our online Spanish lessons: pricing, lesson length, level assessment, DELE preparation and rescheduling. Answers here.",
      heading: "Frequently Asked Questions",
    },
    es: {
      title: "Preguntas Frecuentes sobre las Clases | Mi Mundo Español",
      description:
        "Todo lo que quieres saber sobre nuestras clases de español online: precios, duración, evaluación de nivel, preparación DELE y cambios de horario.",
      heading: "Preguntas Frecuentes",
    },
  },

  "/blog": {
    priority: 0.8,
    changefreq: "weekly",
    tr: {
      title: "İspanyolca Blog | Öğrenme İpuçları ve Gramer – Mi Mundo Español",
      description:
        "İspanyolca gramer, kelime, telaffuz ve sınav ipuçları. Öğrenme yolculuğunda işine yarayacak rehberler ve pratik önerilerle dolu blog yazıları.",
      heading: "İspanyolca Öğrenme Blogu",
    },
    en: {
      title: "Spanish Blog | Learning Tips and Grammar – Mi Mundo Español",
      description:
        "Spanish grammar, vocabulary, pronunciation and exam tips. Guides and practical advice to support you throughout your language-learning journey.",
      heading: "Spanish Learning Blog",
    },
    es: {
      title: "Blog de Español | Consejos y Gramática – Mi Mundo Español",
      description:
        "Gramática, vocabulario, pronunciación y consejos para exámenes de español. Guías y recomendaciones prácticas para acompañarte en tu aprendizaje.",
      heading: "Blog de Aprendizaje de Español",
    },
  },

  "/iletisim": {
    priority: 0.8,
    changefreq: "monthly",
    tr: {
      title: "İletişim ve Deneme Dersi | Mi Mundo Español",
      description:
        "Online İspanyolca dersleri için bize ulaşın. WhatsApp, telefon ve e-posta ile iletişime geçin; deneme dersi ve ders programı hakkında bilgi alın.",
      heading: "İletişim",
    },
    en: {
      title: "Contact and Trial Lesson | Mi Mundo Español",
      description:
        "Get in touch about our online Spanish lessons. Reach us on WhatsApp, by phone or by email to ask about a trial lesson and our lesson schedule.",
      heading: "Contact",
    },
    es: {
      title: "Contacto y Clase de Prueba | Mi Mundo Español",
      description:
        "Ponte en contacto para nuestras clases de español online. Escríbenos por WhatsApp, teléfono o correo para pedir una clase de prueba y ver horarios.",
      heading: "Contacto",
    },
  },

  "/gizlilik-politikasi": {
    priority: 0.3,
    changefreq: "yearly",
    tr: {
      title: "Gizlilik Politikası | Mi Mundo Español",
      description:
        "Mi Mundo Español olarak kişisel verilerinizi nasıl topladığımızı, işlediğimizi ve koruduğumuzu açıklayan gizlilik politikamız.",
      heading: "Gizlilik Politikası",
    },
    en: {
      title: "Privacy Policy | Mi Mundo Español",
      description:
        "Our privacy policy, explaining how Mi Mundo Español collects, processes and protects your personal data.",
      heading: "Privacy Policy",
    },
    es: {
      title: "Política de Privacidad | Mi Mundo Español",
      description:
        "Nuestra política de privacidad: cómo Mi Mundo Español recoge, trata y protege tus datos personales.",
      heading: "Política de Privacidad",
    },
  },
};

/** Bir rotanın SEO kaydını verir; bilinmeyen rotalar için ana sayfaya düşer. */
export function getPageSeo(pathname: string): PageSeo {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return PAGE_SEO[clean] ?? PAGE_SEO["/"];
}

/** Göreli yolu mutlak URL'e çevirir (canonical, og:url ve sitemap için). */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Her sayfada bulunan kurum + site yapısal verisi.
 * Yalnızca sitede gerçekten görünen ve doğru olan bilgileri içerir.
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl(OG_IMAGE_PATH),
          width: 1200,
          height: 630,
        },
        image: absoluteUrl(OG_IMAGE_PATH),
        description: PAGE_SEO["/"].tr.description,
        email: BUSINESS.email,
        telephone: BUSINESS.telephone,
        sameAs: [BUSINESS.instagram],
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: BUSINESS.telephone,
            email: BUSINESS.email,
            contactType: "customer service",
            availableLanguage: [...BUSINESS.availableLanguages],
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: DEFAULT_LANG,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}

/** Alt sayfalar için Ana Sayfa > Sayfa kırıntı yolu. */
export function breadcrumbJsonLd(path: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name, item: absoluteUrl(path) },
    ],
  };
}
