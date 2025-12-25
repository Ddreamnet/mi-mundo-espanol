import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, GripVertical, Save, MessageSquareQuote, Copy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LanguageTabs } from "./LanguageTabs";
import { Language } from "@/contexts/LanguageContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MultiLangText {
  tr: string;
  en: string;
  es: string;
}

interface Testimonial {
  id: string;
  quote: string | MultiLangText;
  author_name: string | null;
  order_index: number;
  is_active: boolean;
}

function isMultiLangText(val: unknown): val is MultiLangText {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return "tr" in obj && "en" in obj && "es" in obj;
}

function getQuote(testimonial: Testimonial, lang: Language): string {
  if (isMultiLangText(testimonial.quote)) {
    return testimonial.quote[lang] || testimonial.quote.tr || "";
  }
  return testimonial.quote as string;
}

function SortableTestimonial({
  testimonial,
  onUpdate,
  onDelete,
  selectedLang,
  onLangChange,
  t,
}: {
  testimonial: Testimonial;
  onUpdate: (id: string, data: Partial<Testimonial>) => void;
  onDelete: (id: string) => void;
  selectedLang: Language;
  onLangChange: (lang: Language) => void;
  t: (key: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: testimonial.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [localQuote, setLocalQuote] = useState<MultiLangText>({ tr: "", en: "", es: "" });
  const [localAuthor, setLocalAuthor] = useState(testimonial.author_name || "");

  useEffect(() => {
    if (isMultiLangText(testimonial.quote)) {
      setLocalQuote(testimonial.quote);
    } else {
      setLocalQuote({ tr: testimonial.quote as string, en: "", es: "" });
    }
    setLocalAuthor(testimonial.author_name || "");
  }, [testimonial.quote, testimonial.author_name]);

  const handleSave = () => {
    onUpdate(testimonial.id, { quote: localQuote, author_name: localAuthor || null });
  };

  const copyFromTurkish = () => {
    if (selectedLang !== "tr") {
      setLocalQuote((prev) => ({ ...prev, [selectedLang]: prev.tr }));
    }
  };

  return (
    <Card ref={setNodeRef} style={style} className="mb-3">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing flex items-center text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <LanguageTabs selectedLang={selectedLang} onLanguageChange={onLangChange} />
              {selectedLang !== "tr" && (
                <Button variant="outline" size="sm" onClick={copyFromTurkish} className="gap-1">
                  <Copy className="h-3 w-3" />
                  {t("common.copyFromTurkish")}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <MessageSquareQuote className="h-5 w-5 text-muted-foreground shrink-0" />
              <Textarea
                value={localQuote[selectedLang]}
                onChange={(e) => setLocalQuote((prev) => ({ ...prev, [selectedLang]: e.target.value }))}
                placeholder={t("editors.testimonials.quotePlaceholder")}
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Input
                value={localAuthor}
                onChange={(e) => setLocalAuthor(e.target.value)}
                placeholder={t("editors.testimonials.authorPlaceholder")}
                className="max-w-xs"
              />

              <div className="flex items-center gap-2">
                <Switch
                  checked={testimonial.is_active}
                  onCheckedChange={(checked) => onUpdate(testimonial.id, { is_active: checked })}
                />
                <Label className="text-sm text-muted-foreground">{t("common.active")}</Label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSave}
              className="h-8 w-8"
              title={t("common.save")}
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(testimonial.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
              title={t("common.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestimonialsManager() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedLang, setSelectedLang] = useState<Language>("tr");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data as Testimonial[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = testimonials.length > 0 ? Math.max(...testimonials.map((t) => t.order_index)) : -1;
      const { error } = await supabase.from("testimonials").insert({
        quote: JSON.stringify({ tr: "Yeni referans metni...", en: "New testimonial text...", es: "Nuevo texto de testimonio..." }),
        order_index: maxOrder + 1,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({ title: t("common.success"), description: t("editors.testimonials.added") });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Testimonial> }) => {
      // Convert multi-lang objects to JSON-compatible format
      const updateData: Record<string, unknown> = {};
      if (data.quote !== undefined) {
        updateData.quote = typeof data.quote === 'object' ? JSON.stringify(data.quote) : data.quote;
      }
      if (data.author_name !== undefined) updateData.author_name = data.author_name;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      
      const { error } = await supabase.from("testimonials").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({ title: t("common.success"), description: t("editors.testimonials.updated") });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({ title: t("common.success"), description: t("editors.testimonials.deleted") });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (newOrder: { id: string; order_index: number }[]) => {
      for (const item of newOrder) {
        await supabase.from("testimonials").update({ order_index: item.order_index }).eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = testimonials.findIndex((t) => t.id === active.id);
    const newIndex = testimonials.findIndex((t) => t.id === over.id);

    const newArray = arrayMove(testimonials, oldIndex, newIndex);
    const newOrder = newArray.map((item, index) => ({ id: item.id, order_index: index }));

    // Optimistic update
    queryClient.setQueryData(["admin-testimonials"], newArray.map((item, index) => ({ ...item, order_index: index })));
    reorderMutation.mutate(newOrder);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg">{t("editors.testimonials.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("editors.testimonials.description")}
          </p>
        </div>
        <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          {t("common.addNew")}
        </Button>
      </div>

      {testimonials.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <MessageSquareQuote className="h-12 w-12 mb-4" />
          <p>{t("editors.testimonials.empty")}</p>
          <Button variant="outline" className="mt-4" onClick={() => addMutation.mutate()}>
            {t("editors.testimonials.addFirst")}
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={testimonials.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {testimonials.map((testimonial) => (
              <SortableTestimonial
                key={testimonial.id}
                testimonial={testimonial}
                onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                onDelete={(id) => deleteMutation.mutate(id)}
                selectedLang={selectedLang}
                onLangChange={setSelectedLang}
                t={t}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
