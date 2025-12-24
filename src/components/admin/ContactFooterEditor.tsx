import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, Mail, Plus, X, Phone, MessageCircle, Instagram, Facebook } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ContactItem {
  icon: string;
  label: string;
  value: string;
  href: string;
}

interface ContactContent {
  pageTitle: string;
  supportText: string;
  contactItems: ContactItem[];
}

interface FooterContent {
  links: { label: string; href: string }[];
  socialLinks: { icon: string; href: string; label: string }[];
  copyrightText: string;
}

const defaultContact: ContactContent = {
  pageTitle: "İletişim",
  supportText: "7/24 Destek",
  contactItems: [
    { icon: "phone", label: "Telefon", value: "+90 530 472 1875", href: "tel:+905304721875" },
    { icon: "mail", label: "Mail", value: "mimundoespanol@outlook.com", href: "mailto:mimundoespanol@outlook.com" },
    { icon: "mail", label: "Mail - 2", value: "mertaydin245@hotmail.com", href: "mailto:mertaydin245@hotmail.com" },
    { icon: "whatsapp", label: "Whatsapp", value: "WhatsApp ile İletişim", href: "https://wa.me/message/2ESUR45URXTFJ1" },
    { icon: "instagram", label: "Instagram", value: "@mi.mundo_espanol", href: "https://instagram.com/mi.mundo_espanol" },
    { icon: "facebook", label: "Facebook", value: "Mi Mundo Espanol", href: "https://facebook.com/MiMundoEspanol" },
  ],
};

const defaultFooter: FooterContent = {
  links: [
    { label: "İletişim", href: "/iletisim" },
    { label: "SSS", href: "#sss" },
    { label: "Gizlilik Politikası", href: "#gizlilik" },
  ],
  socialLinks: [
    { icon: "instagram", href: "https://www.instagram.com/mi.mundo_espanol/", label: "Instagram" },
    { icon: "facebook", href: "#", label: "Facebook" },
    { icon: "whatsapp", href: "https://wa.me/+905304721875", label: "WhatsApp" },
  ],
  copyrightText: "Mi Mundo Español. Tüm hakları saklıdır.",
};

const iconOptions = [
  { value: "phone", label: "Telefon", Icon: Phone },
  { value: "mail", label: "Mail", Icon: Mail },
  { value: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { value: "instagram", label: "Instagram", Icon: Instagram },
  { value: "facebook", label: "Facebook", Icon: Facebook },
];

export function ContactFooterEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [contact, setContact] = useState<ContactContent>(defaultContact);
  const [footer, setFooter] = useState<FooterContent>(defaultFooter);

  const { data: pageContents, isLoading } = useQuery({
    queryKey: ["page-contents", "contact", "footer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_contents")
        .select("*")
        .in("page_key", ["contact", "footer"]);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (pageContents) {
      const contactData = pageContents.find((p) => p.page_key === "contact");
      const footerData = pageContents.find((p) => p.page_key === "footer");
      
      if (contactData?.content) {
        setContact({ ...defaultContact, ...(contactData.content as unknown as ContactContent) });
      }
      if (footerData?.content) {
        setFooter({ ...defaultFooter, ...(footerData.content as unknown as FooterContent) });
      }
    }
  }, [pageContents]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("page_contents").delete().eq("page_key", "contact");
      const { error: contactError } = await supabase
        .from("page_contents")
        .insert({
          page_key: "contact",
          content: contact,
        } as any);
      if (contactError) throw contactError;

      await supabase.from("page_contents").delete().eq("page_key", "footer");
      const { error: footerError } = await supabase
        .from("page_contents")
        .insert({
          page_key: "footer",
          content: footer,
        } as any);
      if (footerError) throw footerError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-contents"] });
      toast({ title: "Başarılı", description: "İletişim ve Footer güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const addContactItem = () => {
    setContact({
      ...contact,
      contactItems: [...contact.contactItems, { icon: "phone", label: "Yeni", value: "", href: "" }],
    });
  };

  const removeContactItem = (index: number) => {
    setContact({
      ...contact,
      contactItems: contact.contactItems.filter((_, i) => i !== index),
    });
  };

  const updateContactItem = (index: number, field: keyof ContactItem, value: string) => {
    const updated = [...contact.contactItems];
    updated[index] = { ...updated[index], [field]: value };
    setContact({ ...contact, contactItems: updated });
  };

  const addFooterLink = () => {
    setFooter({
      ...footer,
      links: [...footer.links, { label: "Yeni Link", href: "#" }],
    });
  };

  const removeFooterLink = (index: number) => {
    setFooter({
      ...footer,
      links: footer.links.filter((_, i) => i !== index),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contact Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            İletişim Sayfası
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Sayfa Başlığı</Label>
              <Input
                value={contact.pageTitle}
                onChange={(e) => setContact({ ...contact, pageTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Destek Metni</Label>
              <Input
                value={contact.supportText}
                onChange={(e) => setContact({ ...contact, supportText: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>İletişim Kanalları</Label>
              <Button variant="outline" size="sm" onClick={addContactItem}>
                <Plus className="h-4 w-4 mr-1" /> Ekle
              </Button>
            </div>
            {contact.contactItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                <Select
                  value={item.icon}
                  onValueChange={(value) => updateContactItem(index, "icon", value)}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.Icon className="h-4 w-4" />
                          <span className="text-xs">{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={item.label}
                  onChange={(e) => updateContactItem(index, "label", e.target.value)}
                  placeholder="Label"
                  className="w-28"
                />
                <Input
                  value={item.value}
                  onChange={(e) => updateContactItem(index, "value", e.target.value)}
                  placeholder="Görünen değer"
                  className="flex-1"
                />
                <Input
                  value={item.href}
                  onChange={(e) => updateContactItem(index, "href", e.target.value)}
                  placeholder="Link"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeContactItem(index)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer Section */}
      <Card>
        <CardHeader>
          <CardTitle>Footer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Copyright Metni</Label>
            <Input
              value={footer.copyrightText}
              onChange={(e) => setFooter({ ...footer, copyrightText: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Footer Linkleri</Label>
              <Button variant="outline" size="sm" onClick={addFooterLink}>
                <Plus className="h-4 w-4 mr-1" /> Ekle
              </Button>
            </div>
            {footer.links.map((link, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={link.label}
                  onChange={(e) => {
                    const updated = [...footer.links];
                    updated[index] = { ...updated[index], label: e.target.value };
                    setFooter({ ...footer, links: updated });
                  }}
                  placeholder="Label"
                  className="w-40"
                />
                <Input
                  value={link.href}
                  onChange={(e) => {
                    const updated = [...footer.links];
                    updated[index] = { ...updated[index], href: e.target.value };
                    setFooter({ ...footer, links: updated });
                  }}
                  placeholder="Link"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFooterLink(index)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Kaydediliyor..." : "Tümünü Kaydet"}
        </Button>
      </div>
    </div>
  );
}
