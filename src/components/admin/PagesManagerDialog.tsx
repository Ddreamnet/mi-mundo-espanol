import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestimonialsManager } from "./TestimonialsManager";
import { BlogManager } from "./BlogManager";
import { MessageSquareQuote, FileText, Home, BookOpen, Mail, Layout } from "lucide-react";

interface PagesManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PagesManagerDialog({ open, onOpenChange }: PagesManagerDialogProps) {
  const [activeTab, setActiveTab] = useState("testimonials");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Layout className="h-5 w-5" />
            Sayfa Yönetimi
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 mb-4">
            <TabsTrigger value="testimonials" className="flex items-center gap-1 text-xs sm:text-sm">
              <MessageSquareQuote className="h-4 w-4" />
              <span className="hidden sm:inline">Referanslar</span>
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-1 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Blog</span>
            </TabsTrigger>
            <TabsTrigger value="hero" disabled className="flex items-center gap-1 text-xs sm:text-sm opacity-50">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Hero</span>
            </TabsTrigger>
            <TabsTrigger value="lessons" disabled className="flex items-center gap-1 text-xs sm:text-sm opacity-50">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Dersler</span>
            </TabsTrigger>
            <TabsTrigger value="contact" disabled className="flex items-center gap-1 text-xs sm:text-sm opacity-50">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">İletişim</span>
            </TabsTrigger>
            <TabsTrigger value="footer" disabled className="flex items-center gap-1 text-xs sm:text-sm opacity-50">
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">Footer</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="testimonials" className="mt-0 h-full">
              <TestimonialsManager />
            </TabsContent>

            <TabsContent value="blog" className="mt-0 h-full">
              <BlogManager />
            </TabsContent>

            <TabsContent value="hero" className="mt-0">
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Yakında eklenecek...
              </div>
            </TabsContent>

            <TabsContent value="lessons" className="mt-0">
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Yakında eklenecek...
              </div>
            </TabsContent>

            <TabsContent value="contact" className="mt-0">
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Yakında eklenecek...
              </div>
            </TabsContent>

            <TabsContent value="footer" className="mt-0">
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Yakında eklenecek...
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
