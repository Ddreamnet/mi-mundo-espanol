import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Seo } from "@/components/Seo";
import { LandingPage } from "@/components/landing/LandingPage";

// Panel ve alt sayfalar ilk açılışta indirilmesin: ziyaretçinin ana sayfayı
// görmesi için gereken JavaScript miktarını düşürür (LCP / Core Web Vitals).
const TeacherDashboard = lazy(() =>
  import("@/components/TeacherDashboard").then((m) => ({ default: m.TeacherDashboard })),
);
const StudentDashboard = lazy(() =>
  import("@/components/StudentDashboard").then((m) => ({ default: m.StudentDashboard })),
);
const AdminDashboard = lazy(() =>
  import("@/components/AdminDashboard").then((m) => ({ default: m.AdminDashboard })),
);
const Contact = lazy(() => import("./pages/Contact"));
const Lessons = lazy(() => import("./pages/Lessons"));
const SSS = lazy(() => import("./pages/SSS"));
const GizlilikPolitikasi = lazy(() => import("./pages/GizlilikPolitikasi"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div
        role="status"
        aria-label="Yükleniyor"
        className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
      />
    </div>
  );
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <FullPageSpinner />;
  }

  // If user is logged in, show appropriate dashboard
  if (user && profile) {
    if (profile.roles?.includes('admin')) {
      return (
        <>
          <Seo title="Yönetim Paneli | Mi Mundo Español" noindex />
          <Suspense fallback={<FullPageSpinner />}>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </>
      );
    }

    if (profile.role === 'teacher') {
      return (
        <>
          <Seo title="Eğitmen Paneli | Mi Mundo Español" noindex />
          <Suspense fallback={<FullPageSpinner />}>
            <Routes>
              <Route path="/" element={<TeacherDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </>
      );
    }

    if (profile.role === 'student') {
      return (
        <>
          <Seo title="Öğrenci Paneli | Mi Mundo Español" noindex />
          <Suspense fallback={<FullPageSpinner />}>
            <Routes>
              <Route path="/" element={<StudentDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </>
      );
    }

    // Profile still loading
    return <FullPageSpinner />;
  }

  // If user is not logged in, show landing page.
  // <Seo /> burada global olarak çalışır: rota değiştikçe seo.config.ts'ten
  // başlık/açıklama/canonical yazar. Blog yazısı gibi sayfalar kendi <Seo>
  // bileşenini render edip bu değerleri ezer.
  return (
    <>
      <Seo />
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dersler" element={<Lessons />} />
          <Route path="/sss" element={<SSS />} />
          <Route path="/gizlilik-politikasi" element={<GizlilikPolitikasi />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/iletisim" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
