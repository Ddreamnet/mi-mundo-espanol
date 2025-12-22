import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LandingPage } from "@/components/landing/LandingPage";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import { StudentDashboard } from "@/components/StudentDashboard";
import { AdminDashboard } from "@/components/AdminDashboard";
import Contact from "./pages/Contact";
import Lessons from "./pages/Lessons";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is logged in, show appropriate dashboard
  if (user && profile) {
    if (profile.roles?.includes('admin')) {
      return (
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      );
    }
    
    if (profile.role === 'teacher') {
      return (
        <Routes>
          <Route path="/" element={<TeacherDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      );
    }
    
    if (profile.role === 'student') {
      return (
        <Routes>
          <Route path="/" element={<StudentDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      );
    }

    // Profile still loading
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Profil yükleniyor...</p>
      </div>
    );
  }

  // If user is not logged in, show landing page
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dersler" element={<Lessons />} />
      <Route path="/iletisim" element={<Contact />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;