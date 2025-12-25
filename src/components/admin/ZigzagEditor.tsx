import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, GripVertical, Save, LayoutTemplate, X, Copy } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageUpload } from "./ImageUpload";
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

interface MultiLangItems {
  tr: string[];
  en: string[];
  es: string[];
}

interface ZigzagSection {
  id: string;
  title: string | MultiLangText;
  items: string[] | MultiLangItems;
  image_url: string | null;
  image_on_left: boolean;
  is_active: boolean;
  order_index: number;
}

function isMultiLangText(val: unknown): val is MultiLangText {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return "tr" in obj && "en" in obj && "es" in obj;
}

function isMultiLangItems(val: unknown): val is MultiLangItems {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return "tr" in obj && Array.isArray(obj.tr);
}

function getTitle(section: ZigzagSection, lang: Language): string {
  if (isMultiLangText(section.title)) {
    return section.title[lang] || section.title.tr || "";
  }
  return section.title as string;
}

function getItems(section: ZigzagSection, lang: Language): string[] {
  if (isMultiLangItems(section.items)) {
    return section.items[lang] || section.items.tr || [];
  }
  return Array.isArray(section.items) ? section.items : [];
}

function SortableZigzag({
  section,
  onUpdate,
  onDelete,
  t,
  selectedLang,
  onLangChange,
}: {
  section: ZigzagSection;
  onUpdate: (id: string, data: Partial<ZigzagSection>) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
  selectedLang: Language;
  onLangChange: (lang: Language) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [localTitle, setLocalTitle] = useState<MultiLangText>({ tr: "", en: "", es: "" });
  const [localItems, setLocalItems] = useState<MultiLangItems>({ tr: [], en: [], es: [] });
  const [localImageUrl, setLocalImageUrl] = useState(section.image_url || "");
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    // Load title
    if (isMultiLangText(section.title)) {
      setLocalTitle(section.title);
    } else {
      setLocalTitle({ tr: section.title as string, en: "", es: "" });
    }
    
    // Load items
    if (isMultiLangItems(section.items)) {
      setLocalItems(section.items);
    } else {
      const items = Array.isArray(section.items) ? section.items : [];
      setLocalItems({ tr: items, en: [], es: [] });
    }
    
    setLocalImageUrl(section.image_url || "");
  }, [section]);

  const handleSave = () => {
    onUpdate(section.id, {
      title: localTitle,
      items: localItems,
      image_url: localImageUrl || null,
    });
  };

  const copyFromTurkish = () => {
    if (selectedLang !== "tr") {
      setLocalTitle((prev) => ({ ...prev, [selectedLang]: prev.tr }));
      setLocalItems((prev) => ({ ...prev, [selectedLang]: [...prev.tr] }));
    }
  };

  const addItem = () => {
    if (newItem.trim()) {
      setLocalItems((prev) => ({
        ...prev,
        [selectedLang]: [...prev[selectedLang], newItem.trim()],
      }));
      setNewItem("");
    }
  };

  const removeItem = (index: number) => {
    setLocalItems((prev) => ({
      ...prev,
      [selectedLang]: prev[selectedLang].filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, value: string) => {
    setLocalItems((prev) => {
      const updated = [...prev[selectedLang]];
      updated[index] = value;
      return { ...prev, [selectedLang]: updated };
    });
  };

  return (
    <Card ref={setNodeRef} style={style} className="mb-4">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing flex items-start pt-2 text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-5 w-5" />
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <LanguageTabs selectedLang={selectedLang} onLanguageChange={onLangChange} />
              {selectedLang !== "tr" && (
                <Button variant="outline" size="sm" onClick={copyFromTurkish} className="gap-1">
                  <Copy className="h-3 w-3" />
                  {t("common.copyFromTurkish")}
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">{t("editors.zigzag.title")}</Label>
                <Input
                  value={localTitle[selectedLang]}
                  onChange={(e) => setLocalTitle((prev) => ({ ...prev, [selectedLang]: e.target.value }))}
                  placeholder={t("editors.zigzag.titlePlaceholder")}
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={section.image_on_left}
                    onCheckedChange={(checked) => onUpdate(section.id, { image_on_left: checked })}
                  />
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">{t("editors.zigzag.imageOnLeft")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={section.is_active}
                    onCheckedChange={(checked) => onUpdate(section.id, { is_active: checked })}
                  />
                  <Label className="text-xs text-muted-foreground">{t("editors.zigzag.active")}</Label>
                </div>
              </div>
            </div>

            <ImageUpload
              label={t("editors.zigzag.sectionImage")}
              value={localImageUrl}
              onChange={setLocalImageUrl}
              folder="zigzag"
            />

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t("editors.zigzag.items")}</Label>
              <div className="space-y-2">
                {localItems[selectedLang].map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateItem(index, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="h-10 w-10 text-destructive hover:text-destructive shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder={t("editors.zigzag.addItemPlaceholder")}
                    onKeyDown={(e) => e.key === "Enter" && addItem()}
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon" onClick={addItem} className="h-10 w-10 shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" size="icon" onClick={handleSave} className="h-8 w-8" title={t("common.save")}>
              <Save className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(section.id)}
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

export function ZigzagEditor() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedLang, setSelectedLang] = useState<Language>("tr");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["admin-zigzag-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zigzag_sections")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data.map((s) => ({
        ...s,
        items: s.items || [],
      })) as ZigzagSection[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order_index)) : -1;
      const { error } = await supabase.from("zigzag_sections").insert({
        title: JSON.stringify({ tr: t("editors.zigzag.newSection"), en: "New Section", es: "Nueva Sección" }),
        items: { tr: [t("editors.zigzag.item1"), t("editors.zigzag.item2")], en: [], es: [] },
        order_index: maxOrder + 1,
        is_active: true,
        image_on_left: sections.length % 2 === 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-zigzag-sections"] });
      toast({ title: t("common.success"), description: t("editors.zigzag.sectionAdded") });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ZigzagSection> }) => {
      // Convert multi-lang objects to JSON-compatible format
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.items !== undefined) updateData.items = data.items;
      if (data.image_url !== undefined) updateData.image_url = data.image_url;
      if (data.image_on_left !== undefined) updateData.image_on_left = data.image_on_left;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      
      const { error } = await supabase.from("zigzag_sections").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-zigzag-sections"] });
      toast({ title: t("common.success"), description: t("editors.zigzag.sectionUpdated") });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("zigzag_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-zigzag-sections"] });
      toast({ title: t("common.success"), description: t("editors.zigzag.sectionDeleted") });
    },
    onError: (error: any) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (newOrder: { id: string; order_index: number }[]) => {
      for (const item of newOrder) {
        await supabase.from("zigzag_sections").update({ order_index: item.order_index }).eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-zigzag-sections"] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    const newArray = arrayMove(sections, oldIndex, newIndex);
    const newOrder = newArray.map((item, index) => ({ id: item.id, order_index: index }));

    queryClient.setQueryData(
      ["admin-zigzag-sections"],
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
          <h3 className="font-semibold text-lg">{t("editors.zigzag.zigzagSections")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("editors.zigzag.manageSections")}
          </p>
        </div>
        <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          {t("editors.zigzag.newSection")}
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <LayoutTemplate className="h-12 w-12 mb-4" />
          <p>{t("editors.zigzag.noSections")}</p>
          <Button variant="outline" className="mt-4" onClick={() => addMutation.mutate()}>
            {t("editors.zigzag.addFirstSection")}
          </Button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {sections.map((section) => (
              <SortableZigzag
                key={section.id}
                section={section}
                onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                onDelete={(id) => deleteMutation.mutate(id)}
                t={t}
                selectedLang={selectedLang}
                onLangChange={setSelectedLang}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
