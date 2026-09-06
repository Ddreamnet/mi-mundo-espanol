import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Seo } from "@/components/Seo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      {/* Bulunamayan adresler indekslenmesin */}
      <Seo title="Sayfa Bulunamadı (404) | Mi Mundo Español" noindex />

      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-primary mb-4">404</p>
        <h1 className="text-2xl font-bold mb-3 text-foreground">Aradığınız sayfa bulunamadı</h1>
        <p className="text-muted-foreground mb-8">
          Bağlantı taşınmış veya silinmiş olabilir. Aşağıdaki sayfalardan devam edebilirsiniz.
        </p>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link to="/" className="text-primary hover:text-primary/80 underline">
            Ana sayfa
          </Link>
          <Link to="/dersler" className="text-primary hover:text-primary/80 underline">
            İspanyolca ders paketleri
          </Link>
          <Link to="/blog" className="text-primary hover:text-primary/80 underline">
            Blog
          </Link>
          <Link to="/iletisim" className="text-primary hover:text-primary/80 underline">
            İletişim
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default NotFound;
