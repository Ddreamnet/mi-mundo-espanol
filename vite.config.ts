import { defineConfig, type Plugin, type ResolvedConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import {
  PAGE_SEO,
  SITE_NAME,
  SITE_URL,
  OG_IMAGE_PATH,
  DEFAULT_LANG,
  absoluteUrl,
  breadcrumbJsonLd,
  organizationJsonLd,
} from "./src/lib/seo.config";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Uygulama bir SPA olduğu için sunucudan gelen HTML her rotada aynıydı:
 * Google ve WhatsApp/Facebook gibi JavaScript çalıştırmayan tarayıcılar
 * bütün sayfaları tek bir başlık ve açıklamayla görüyordu.
 *
 * Bu eklenti build sonunda her rota için dist/<rota>/index.html üretir; her
 * dosya kendi <title>, description, canonical, Open Graph ve yapısal verisini
 * taşır. Apache DirectoryIndex sayesinde /dersler isteği doğrudan
 * dist/dersler/index.html'i sunar, React yüklenince yönlendirmeyi devralır.
 *
 * Ayrıca sitemap.xml ve robots.txt'yi de aynı SITE_URL'den üretir.
 */
function staticSeoPages(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "static-seo-pages",
    apply: "build",
    configResolved(resolved) {
      config = resolved;
    },
    closeBundle() {
      const outDir = path.resolve(config.root, config.build.outDir);
      const templatePath = path.join(outDir, "index.html");
      if (!fs.existsSync(templatePath)) return;

      const template = fs.readFileSync(templatePath, "utf-8");
      if (!template.includes("<!-- SEO:START -->")) {
        this.warn(
          "index.html içinde <!-- SEO:START --> işareti yok; statik SEO sayfaları üretilmedi.",
        );
        return;
      }

      const lastmod = new Date().toISOString().slice(0, 10);
      const routes = Object.entries(PAGE_SEO);

      for (const [route, seo] of routes) {
        const meta = seo[DEFAULT_LANG];
        const url = route === "/" ? `${SITE_URL}/` : absoluteUrl(route);
        const image = absoluteUrl(OG_IMAGE_PATH);
        const robots = seo.noindex
          ? "noindex, nofollow"
          : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

        const head = `
    <title>${esc(meta.title)}</title>
    <meta name="description" content="${esc(meta.description)}" />
    <meta name="robots" content="${robots}" />
    <link rel="canonical" href="${esc(url)}" />

    <meta property="og:site_name" content="${esc(SITE_NAME)}" />
    <meta property="og:title" content="${esc(meta.title)}" />
    <meta property="og:description" content="${esc(meta.description)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="tr_TR" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(SITE_NAME)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(meta.title)}" />
    <meta name="twitter:description" content="${esc(meta.description)}" />
    <meta name="twitter:image" content="${esc(image)}" />`;

        const graphs: object[] = [organizationJsonLd()];
        if (route !== "/") {
          graphs.push(breadcrumbJsonLd(route, meta.heading ?? meta.title));
        }
        const jsonLd = graphs
          .map(
            (g) =>
              `<script type="application/ld+json">${JSON.stringify(g).replace(/</g, "\\u003c")}</script>`,
          )
          .join("\n    ");

        const links = routes
          .filter(([r]) => r !== route && !PAGE_SEO[r].noindex)
          .map(([r, s]) => `          <li><a href="${r}">${esc(s[DEFAULT_LANG].heading ?? r)}</a></li>`)
          .join("\n");

        const noscript = `
      <div style="max-width: 42rem; margin: 3rem auto; padding: 0 1.5rem; font-family: system-ui, sans-serif; color: #f6f2e9">
        <h1>${esc(meta.heading ?? meta.title)}</h1>
        <p>${esc(meta.description)}</p>
        <p>Bu siteyi görüntülemek için tarayıcınızda JavaScript'i etkinleştirin.</p>
        <ul>
${links}
        </ul>
      </div>`;

        const html = template
          .replace(
            /<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/,
            `<!-- SEO:START -->${head}\n    <!-- SEO:END -->`,
          )
          .replace("<!-- SEO:JSONLD -->", jsonLd)
          .replace(
            /<!-- SEO:NOSCRIPT -->[\s\S]*?<!-- \/SEO:NOSCRIPT -->/,
            `<!-- SEO:NOSCRIPT -->${noscript}\n      <!-- /SEO:NOSCRIPT -->`,
          );

        const target =
          route === "/" ? templatePath : path.join(outDir, route.replace(/^\//, ""), "index.html");
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, html);
      }

      // Ön-üretilmiş sayfası olmayan rotalar (ör. /blog/yazi-adi) için ayrı bir
      // SPA kabuğu. Ana sayfanın index.html'i kullanılsaydı bu adresler ham
      // HTML'de ana sayfanın canonical'ını taşırdı ve Google render öncesinde
      // yazıları ana sayfayla birleştirebilirdi. Bu kabuk canonical bildirmez;
      // doğru adresi tarayıcıda src/components/Seo.tsx yazar.
      const fallbackHead = `
    <title>${esc(SITE_NAME)}</title>
    <meta name="description" content="${esc(PAGE_SEO["/"][DEFAULT_LANG].description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

    <meta property="og:site_name" content="${esc(SITE_NAME)}" />
    <meta property="og:title" content="${esc(SITE_NAME)}" />
    <meta property="og:description" content="${esc(PAGE_SEO["/"][DEFAULT_LANG].description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="tr_TR" />
    <meta property="og:image" content="${esc(absoluteUrl(OG_IMAGE_PATH))}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${esc(SITE_NAME)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(SITE_NAME)}" />
    <meta name="twitter:description" content="${esc(PAGE_SEO["/"][DEFAULT_LANG].description)}" />
    <meta name="twitter:image" content="${esc(absoluteUrl(OG_IMAGE_PATH))}" />`;

      fs.writeFileSync(
        path.join(outDir, "spa-fallback.html"),
        template
          .replace(
            /<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/,
            `<!-- SEO:START -->${fallbackHead}\n    <!-- SEO:END -->`,
          )
          .replace("<!-- SEO:JSONLD -->", "")
          .replace(
            /<!-- SEO:NOSCRIPT -->[\s\S]*?<!-- \/SEO:NOSCRIPT -->/,
            "<!-- SEO:NOSCRIPT -->",
          ),
      );

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .filter(([, seo]) => !seo.noindex)
  .map(
    ([route, seo]) => `  <url>
    <loc>${route === "/" ? `${SITE_URL}/` : absoluteUrl(route)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${seo.changefreq}</changefreq>
    <priority>${seo.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap);

      // Tarama engellenmiyor: sayfanın render edilmesi için gereken JS/CSS
      // bloklanırsa Google içeriği göremez. Oturum arkası ekranlar zaten
      // meta robots="noindex" ile işaretleniyor.
      const robots = `# ${SITE_NAME}
User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
      fs.writeFileSync(path.join(outDir, "robots.txt"), robots);

      this.info?.(
        `SEO: ${routes.length} statik sayfa + spa-fallback.html + sitemap.xml + robots.txt üretildi (${SITE_URL})`,
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), staticSeoPages()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    // Kaynak haritaları üretimde sunulmasın (paket boyutu + kod gizliliği)
    sourcemap: false,
    rollupOptions: {
      output: {
        // Ziyaretçinin ilk açılışta indirdiği paketi küçültmek için satıcı
        // kodunu ayrı ve uzun süre önbelleklenebilir parçalara böl.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
            return "react-vendor";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "editor";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("@dnd-kit")) return "dnd";
          if (id.includes("@radix-ui")) return "radix";
          return "vendor";
        },
      },
    },
  },
});
