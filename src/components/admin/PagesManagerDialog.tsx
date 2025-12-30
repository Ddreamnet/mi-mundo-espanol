import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestimonialsManager } from "./TestimonialsManager";
import { BlogManager } from "./BlogManager";
import { HeroCTAEditor } from "./HeroCTAEditor";
import { ZigzagEditor } from "./ZigzagEditor";
import { LessonsEditor } from "./LessonsEditor";
import { ContactFooterEditor } from "./ContactFooterEditor";
import { SSSEditor } from "./SSSEditor";
import { GizlilikPolitikasiEditor } from "./GizlilikPolitikasiEditor";
import { MessageSquareQuote, FileText, Home, BookOpen, Mail, Layout, HelpCircle, Shield } from "lucide-react";

interface PagesManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PagesManagerDialog({ open, onOpenChange }: PagesManagerDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("hero");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Layout className="h-5 w-5" />
            {t("dialogs.pageSettings")}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 mb-4">
            <TabsTrigger value="hero" className="flex items-center gap-1 text-xs sm:text-sm">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Hero/CTA</span>
            </TabsTrigger>
            <TabsTrigger value="zigzag" className="flex items-center gap-1 text-xs sm:text-sm">
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">Zigzag</span>
            </TabsTrigger>
            <TabsTrigger value="testimonials" className="flex items-center gap-1 text-xs sm:text-sm">
              <MessageSquareQuote className="h-4 w-4" />
              <span className="hidden sm:inline">Referanslar</span>
            </TabsTrigger>
            <TabsTrigger value="lessons" className="flex items-center gap-1 text-xs sm:text-sm">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Dersler</span>
            </TabsTrigger>
            <TabsTrigger value="sss" className="flex items-center gap-1 text-xs sm:text-sm">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">SSS</span>
            </TabsTrigger>
            <TabsTrigger value="gizlilik" className="flex items-center gap-1 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Gizlilik</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-1 text-xs sm:text-sm">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">İletişim</span>
            </TabsTrigger>
            <TabsTrigger value="blog" className="flex items-center gap-1 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Blog</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2">
            <TabsContent value="hero" className="mt-0">
              <HeroCTAEditor />
            </TabsContent>
            <TabsContent value="zigzag" className="mt-0">
              <ZigzagEditor />
            </TabsContent>
            <TabsContent value="testimonials" className="mt-0">
              <TestimonialsManager />
            </TabsContent>
            <TabsContent value="lessons" className="mt-0">
              <LessonsEditor />
            </TabsContent>
            <TabsContent value="sss" className="mt-0">
              <SSSEditor />
            </TabsContent>
            <TabsContent value="gizlilik" className="mt-0">
              <GizlilikPolitikasiEditor />
            </TabsContent>
            <TabsContent value="contact" className="mt-0">
              <ContactFooterEditor />
            </TabsContent>
            <TabsContent value="blog" className="mt-0">
              <BlogManager />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
