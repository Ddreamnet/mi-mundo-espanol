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

interface LocalTestimonialData {
  id: string;
  quote: MultiLangText;
  author_name: string;
  is_active: boolean;
}

function parseJsonValue(val: unknown): unknown {
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return parseJsonValue(parsed);
    } catch {
      return val;
    }
  }
  return val;
}

function isMultiLangText(val: unknown): val is MultiLangText {
  const parsed = parseJsonValue(val);
  if (!parsed || typeof parsed !== "object") return false;
  const obj = parsed as Record<string, unknown>;
  return "tr" in obj && "en" in obj && "es" in obj;
}

function SortableTestimonial({
  testimonial,
  localData,
  onLocalChange,
  onDelete,
  onToggleActive,
  selectedLang,
  t,
}: {
  testimonial: Testimonial;
  localData: LocalTestimonialData;
  onLocalChange: (data: LocalTestimonialData) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, checked: boolean) => void;
  selectedLang: Language;
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
            <div className="flex items-center gap-3">
              <MessageSquareQuote className="h-5 w-5 text-muted-foreground shrink-0" />
              <Textarea
                value={localData.quote[selectedLang]}
                onChange={(e) =>
                  onLocalChange({
                    ...localData,
                    quote: { ...localData.quote, [selectedLang]: e.target.value },
                  })
                }
                placeholder={t("editors.testimonials.quotePlaceholder")}
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Input
                value={localData.author_name}
                onChange={(e) => onLocalChange({ ...localData, author_name: e.target.value })}
                placeholder={t("editors.testimonials.authorPlaceholder")}
                className="max-w-xs"
              />

              <div className="flex items-center gap-2">
                <Switch
                  checked={localData.is_active}
                  onCheckedChange={(checked) => onToggleActive(testimonial.id, checked)}
                />
                <Label className="text-sm text-muted-foreground">{t("editors.zigzag.active")}</Label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
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
  const [localTestimonials, setLocalTestimonials] = useState<Record<string, LocalTestimonialData>>({});
  const [hasChanges, setHasChanges] = useState(false);

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

  // Initialize local state from fetched testimonials
  useEffect(() => {
    const newLocalTestimonials: Record<string, LocalTestimonialData> = {};
    testimonials.forEach((testimonial) => {
      if (!localTestimonials[testimonial.id]) {
        const parsedQuote = parseJsonValue(testimonial.quote);

        let quote: MultiLangText = isMultiLangText(parsedQuote)
          ? (parsedQuote as MultiLangText)
          : { tr: typeof parsedQuote === "string" ? parsedQuote : "", en: "", es: "" };

        // Fix legacy data where quote.tr accidentally contains a JSON string of the whole object
        const nestedQuote = parseJsonValue(quote.tr);
        if (isMultiLangText(nestedQuote)) quote = nestedQuote as MultiLangText;

        newLocalTestimonials[testimonial.id] = {
          id: testimonial.id,
          quote,
          author_name: testimonial.author_name || "",
          is_active: testimonial.is_active,
        };
      } else {
        newLocalTestimonials[testimonial.id] = localTestimonials[testimonial.id];
      }
    });
    setLocalTestimonials(newLocalTestimonials);
  }, [testimonials]);

  const handleLocalChange = (data: LocalTestimonialData) => {
    setLocalTestimonials((prev) => ({ ...prev, [data.id]: data }));
    setHasChanges(true);
  };

  const handleToggleActive = (id: string, checked: boolean) => {
    setLocalTestimonials((prev) => ({
      ...prev,
      [id]: { ...prev[id], is_active: checked },
    }));
    setHasChanges(true);
  };

  const copyFromTurkish = () => {
    if (selectedLang === "tr") return;
    setLocalTestimonials((prev) => {
      const updated: Record<string, LocalTestimonialData> = {};
      Object.entries(prev).forEach(([id, data]) => {
        updated[id] = {
          ...data,
          quote: { ...data.quote, [selectedLang]: data.quote.tr },
        };
      });
      return updated;
    });
    setHasChanges(true);
    toast({ title: t("common.copied"), description: t("common.copiedFromTurkish") });
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = testimonials.length > 0 ? Math.max(...testimonials.map((t) => t.order_index)) : -1;
      const { error } = await supabase.from("testimonials").insert({
        quote: JSON.stringify({
          tr: "Yeni referans metni...",
          en: "New testimonial text...",
          es: "Nuevo texto de testimonio...",
        }),
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

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      for (const [id, data] of Object.entries(localTestimonials)) {
        const { error } = await supabase
          .from("testimonials")
          .update({
            quote: JSON.stringify(data.quote),
            author_name: data.author_name || null,
            is_active: data.is_active,
          })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      setHasChanges(false);
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
    queryClient.setQueryData(
      ["admin-testimonials"],
      newArray.map((item, index) => ({ ...item, order_index: index }))
    );
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
          <p className="text-sm text-muted-foreground">{t("editors.testimonials.description")}</p>
        </div>
        <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          {t("common.add")}
        </Button>
      </div>

      {/* Language Tabs - Single selector at top */}
      <div className="flex items-center justify-between">
        <LanguageTabs selectedLang={selectedLang} onLanguageChange={setSelectedLang} />
        {selectedLang !== "tr" && (
          <Button variant="outline" size="sm" onClick={copyFromTurkish}>
            <Copy className="h-4 w-4 mr-2" />
            {t("common.copyFromTurkish")}
          </Button>
        )}
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
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={testimonials.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {testimonials.map((testimonial) => (
                <SortableTestimonial
                  key={testimonial.id}
                  testimonial={testimonial}
                  localData={
                    localTestimonials[testimonial.id] || {
                      id: testimonial.id,
                      quote: { tr: "", en: "", es: "" },
                      author_name: "",
                      is_active: true,
                    }
                  }
                  onLocalChange={handleLocalChange}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onToggleActive={handleToggleActive}
                  selectedLang={selectedLang}
                  t={t}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Single Save Button at bottom */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={() => saveAllMutation.mutate()}
              disabled={saveAllMutation.isPending}
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveAllMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}