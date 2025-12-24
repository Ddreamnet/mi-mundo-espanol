import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, GripVertical, Save, LayoutTemplate, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

interface ZigzagSection {
  id: string;
  title: string;
  items: string[];
  image_url: string | null;
  image_on_left: boolean;
  is_active: boolean;
  order_index: number;
}

function SortableZigzag({
  section,
  onUpdate,
  onDelete,
}: {
  section: ZigzagSection;
  onUpdate: (id: string, data: Partial<ZigzagSection>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [localTitle, setLocalTitle] = useState(section.title);
  const [localItems, setLocalItems] = useState<string[]>(section.items);
  const [localImageUrl, setLocalImageUrl] = useState(section.image_url || "");
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    setLocalTitle(section.title);
    setLocalItems(section.items);
    setLocalImageUrl(section.image_url || "");
  }, [section]);

  const handleSave = () => {
    onUpdate(section.id, {
      title: localTitle,
      items: localItems,
      image_url: localImageUrl || null,
    });
  };

  const addItem = () => {
    if (newItem.trim()) {
      setLocalItems([...localItems, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeItem = (index: number) => {
    setLocalItems(localItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...localItems];
    updated[index] = value;
    setLocalItems(updated);
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
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Başlık</Label>
                <Input
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  placeholder="Bölüm başlığı..."
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={section.image_on_left}
                    onCheckedChange={(checked) => onUpdate(section.id, { image_on_left: checked })}
                  />
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Görsel solda</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={section.is_active}
                    onCheckedChange={(checked) => onUpdate(section.id, { is_active: checked })}
                  />
                  <Label className="text-xs text-muted-foreground">Aktif</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Görsel URL</Label>
              <div className="flex gap-2">
                <Input
                  value={localImageUrl}
                  onChange={(e) => setLocalImageUrl(e.target.value)}
                  placeholder="/assets/..."
                />
                {localImageUrl && (
                  <img src={localImageUrl} alt="Preview" className="w-16 h-12 object-contain rounded" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Maddeler</Label>
              <div className="space-y-2">
                {localItems.map((item, index) => (
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
                    placeholder="Yeni madde ekle..."
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
            <Button variant="outline" size="icon" onClick={handleSave} className="h-8 w-8" title="Kaydet">
              <Save className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(section.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
              title="Sil"
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
  const queryClient = useQueryClient();

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
        items: Array.isArray(s.items) ? s.items : [],
      })) as ZigzagSection[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order_index)) : -1;
      const { error } = await supabase.from("zigzag_sections").insert({
        title: "Yeni Bölüm",
        items: ["Madde 1", "Madde 2"],
        order_index: maxOrder + 1,
        is_active: true,
        image_on_left: sections.length % 2 === 1, // Alternatif
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-zigzag-sections"] });
      toast({ title: "Başarılı", description: "Yeni bölüm eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ZigzagSection> }) => {
      const { error } = await supabase.from("zigzag_sections").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-zigzag-sections"] });
      toast({ title: "Başarılı", description: "Bölüm güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("zigzag_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-zigzag-sections"] });
      toast({ title: "Başarılı", description: "Bölüm silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
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
          <h3 className="font-semibold text-lg">Zigzag Bölümleri</h3>
          <p className="text-sm text-muted-foreground">
            Ana sayfadaki içerik bölümlerini yönetin
          </p>
        </div>
        <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Bölüm
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <LayoutTemplate className="h-12 w-12 mb-4" />
          <p>Henüz bölüm eklenmemiş</p>
          <Button variant="outline" className="mt-4" onClick={() => addMutation.mutate()}>
            İlk bölümü ekle
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
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
