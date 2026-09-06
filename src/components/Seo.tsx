import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  SITE_NAME,
  OG_IMAGE_PATH,
  absoluteUrl,
  breadcrumbJsonLd,
  getPageSeo,
  organizationJsonLd,
  PAGE_SEO,
  type SeoLang,
} from "@/lib/seo.config";

const OG_LOCALE: Record<SeoLang, string> = {
  tr: "tr_TR",
  en: "en_US",
  es: "es_ES",
};

/** Var olan meta etiketini günceller, yoksa oluşturur. */
function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Belirli bir slot'taki JSON-LD bloğunu yazar; data null ise bloğu kaldırır. */
function upsertJsonLd(slot: string, data: unknown | null) {
  const selector = `script[type="application/ld+json"][data-seo-jsonld="${slot}"]`;
  const existing = document.head.querySelector(selector);
  if (data == null) {
    existing?.remove();
    return;
  }
  const el = existing ?? document.createElement("script");
  if (!existing) {
    el.setAttribute("type", "application/ld+json");
    el.setAttribute("data-seo-jsonld", slot);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export interface SeoProps {
  /** seo.config.ts'teki başlığı ezer (ör. blog yazısı başlığı). */
  title?: string;
  /** seo.config.ts'teki açıklamayı ezer. */
  description?: string;
  /** canonical yolu ezer; varsayılan olarak aktif rota kullanılır. */
  path?: string;
  /** Sosyal medya önizleme görseli (göreli yol ya da tam URL). */
  image?: string;
  /** og:type — blog yazılarında "article". */
  type?: "website" | "article";
  /** Arama motorlarından gizle (404, oturum arkası sayfalar). */
  noindex?: boolean;
  /** Sayfaya özel ek yapısal veri (Article, FAQPage vb.). */
  jsonLd?: object | null;
  /** Yazı meta verisi — og:type="article" ile birlikte kullanılır. */
  publishedTime?: string | null;
  modifiedTime?: string | null;
}

/**
 * Aktif rotanın <head> etiketlerini yönetir.
 *
 * AppRoutes içinde global olarak bir kez render edilir ve rota değiştikçe
 * seo.config.ts'ten okuyup tüm etiketleri günceller. Blog yazısı gibi verisi
 * çalışma zamanında gelen sayfalar kendi <Seo> bileşenini render ederek
 * başlığı/açıklamayı ezer — sayfa efekti global efektten sonra çalıştığı için
 * son sözü sayfa söyler.
 */
export function Seo({
  title,
  description,
  path,
  image,
  type = "website",
  noindex = false,
  jsonLd = null,
  publishedTime = null,
  modifiedTime = null,
}: SeoProps = {}) {
  const location = useLocation();
  const { language } = useLanguage();

  const pathname = path ?? location.pathname;

  useEffect(() => {
    const page = getPageSeo(pathname);
    const meta = page[language] ?? page.tr;

    const finalTitle = title ?? meta.title;
    const finalDescription = description ?? meta.description;
    const canonical = absoluteUrl(pathname.replace(/\/+$/, "") || "/");
    const finalImage = absoluteUrl(image || OG_IMAGE_PATH);
    const shouldNoindex = noindex || page.noindex === true;

    document.title = finalTitle;
    document.documentElement.lang = language;

    upsertMeta("name", "description", finalDescription);
    upsertMeta(
      "name",
      "robots",
      shouldNoindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    );
    upsertLink("canonical", canonical);

    // Open Graph
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", finalTitle);
    upsertMeta("property", "og:description", finalDescription);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:image", finalImage);
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");
    upsertMeta("property", "og:image:alt", SITE_NAME);
    upsertMeta("property", "og:locale", OG_LOCALE[language]);

    // Twitter / X
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", finalTitle);
    upsertMeta("name", "twitter:description", finalDescription);
    upsertMeta("name", "twitter:image", finalImage);

    // Yazı meta verisi — yalnızca article tipinde anlamlı
    const articleTags = document.head.querySelectorAll('meta[property^="article:"]');
    articleTags.forEach((tag) => tag.remove());
    if (type === "article") {
      if (publishedTime) upsertMeta("property", "article:published_time", publishedTime);
      if (modifiedTime) upsertMeta("property", "article:modified_time", modifiedTime);
    }

    // Yapısal veri: her sayfada kurum + site grafiği
    upsertJsonLd("base", organizationJsonLd());

    // Alt sayfalarda kırıntı yolu
    const cleanPath = pathname.replace(/\/+$/, "") || "/";
    const known = PAGE_SEO[cleanPath];
    upsertJsonLd(
      "breadcrumb",
      cleanPath === "/" || !known
        ? null
        : breadcrumbJsonLd(cleanPath, known[language]?.heading ?? known.tr.heading ?? SITE_NAME),
    );

    // Sayfaya özel ek yapısal veri
    upsertJsonLd("page", jsonLd);
  }, [
    pathname,
    language,
    title,
    description,
    image,
    type,
    noindex,
    jsonLd,
    publishedTime,
    modifiedTime,
  ]);

  // Sayfa özel yapısal verisini, o sayfadan ayrılırken temizle
  useEffect(() => () => upsertJsonLd("page", null), []);

  return null;
}
