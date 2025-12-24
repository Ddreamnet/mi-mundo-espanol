import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, GripVertical, Save, MessageSquareQuote } from "lucide-react";
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

interface Testimonial {
  id: string;
  quote: string;
  author_name: string | null;
  order_index: number;
  is_active: boolean;
}

function SortableTestimonial({
  testimonial,
  onUpdate,
  onDelete,
}: {
  testimonial: Testimonial;
  onUpdate: (id: string, data: Partial<Testimonial>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: testimonial.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [localQuote, setLocalQuote] = useState(testimonial.quote);
  const [localAuthor, setLocalAuthor] = useState(testimonial.author_name || "");

  useEffect(() => {
    setLocalQuote(testimonial.quote);
    setLocalAuthor(testimonial.author_name || "");
  }, [testimonial.quote, testimonial.author_name]);

  const handleSave = () => {
    onUpdate(testimonial.id, { quote: localQuote, author_name: localAuthor || null });
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
                value={localQuote}
                onChange={(e) => setLocalQuote(e.target.value)}
                placeholder="Referans metni..."
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Input
                value={localAuthor}
                onChange={(e) => setLocalAuthor(e.target.value)}
                placeholder="Yazar adı (opsiyonel)"
                className="max-w-xs"
              />

              <div className="flex items-center gap-2">
                <Switch
                  checked={testimonial.is_active}
                  onCheckedChange={(checked) => onUpdate(testimonial.id, { is_active: checked })}
                />
                <Label className="text-sm text-muted-foreground">Aktif</Label>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleSave}
              className="h-8 w-8"
              title="Kaydet"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(testimonial.id)}
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

export function TestimonialsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        quote: "Yeni referans metni...",
        order_index: maxOrder + 1,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({ title: "Başarılı", description: "Yeni referans eklendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Testimonial> }) => {
      const { error } = await supabase.from("testimonials").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({ title: "Başarılı", description: "Referans güncellendi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      toast({ title: "Başarılı", description: "Referans silindi" });
    },
    onError: (error: any) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
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
      toast({ title: "Hata", description: error.message, variant: "destructive" });
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
          <h3 className="font-semibold text-lg">Referanslar</h3>
          <p className="text-sm text-muted-foreground">
            Ana sayfadaki müşteri referanslarını yönetin
          </p>
        </div>
        <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Ekle
        </Button>
      </div>

      {testimonials.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <MessageSquareQuote className="h-12 w-12 mb-4" />
          <p>Henüz referans eklenmemiş</p>
          <Button variant="outline" className="mt-4" onClick={() => addMutation.mutate()}>
            İlk referansı ekle
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
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
