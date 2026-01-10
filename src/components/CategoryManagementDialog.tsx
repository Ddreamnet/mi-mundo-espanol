import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, GripVertical, Save, X, FolderOpen } from "lucide-react";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Category {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
}

interface CategoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriesChanged: () => void;
}

interface SortableCategoryItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

function SortableCategoryItem({ category, onEdit, onDelete }: SortableCategoryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg"
    >
      <button
        className="cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <div className="font-medium">{category.title}</div>
        {category.description && (
          <div className="text-sm text-muted-foreground">{category.description}</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(category)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(category.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function CategoryManagementDialog({
  open,
  onOpenChange,
  onCategoriesChanged,
}: CategoryManagementDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("global_topic_categories")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("dialogs.categories.fetchError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const newCategories = arrayMove(categories, oldIndex, newIndex);
    
    setCategories(newCategories);

    try {
      const categoryOrders = newCategories.map((cat, index) => ({
        id: cat.id,
        order_index: index,
      }));

      const { error } = await supabase.rpc("update_global_categories_order", {
        category_orders: categoryOrders,
      });

      if (error) throw error;
      onCategoriesChanged();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("dialogs.categories.orderError"),
        variant: "destructive",
      });
      fetchCategories();
    }
  };

  const handleAddCategory = async () => {
    if (!title.trim()) return;

    try {
      const maxOrder = Math.max(...categories.map((c) => c.order_index), -1);
      
      const { error } = await supabase.from("global_topic_categories").insert({
        title: title.trim(),
        description: description.trim() || null,
        order_index: maxOrder + 1,
      });

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("dialogs.categories.addSuccess"),
      });

      setTitle("");
      setDescription("");
      setShowAddForm(false);
      fetchCategories();
      onCategoriesChanged();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !title.trim()) return;

    try {
      const { error } = await supabase
        .from("global_topic_categories")
        .update({
          title: title.trim(),
          description: description.trim() || null,
        })
        .eq("id", editingCategory.id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("dialogs.categories.updateSuccess"),
      });

      setEditingCategory(null);
      setTitle("");
      setDescription("");
      fetchCategories();
      onCategoriesChanged();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      // First, unassign topics from this category
      const { error: updateError } = await supabase
        .from("global_topics")
        .update({ category_id: null })
        .eq("category_id", id);

      if (updateError) throw updateError;

      const { error } = await supabase
        .from("global_topic_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("dialogs.categories.deleteSuccess"),
      });

      fetchCategories();
      onCategoriesChanged();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setTitle(category.title);
    setDescription(category.description || "");
    setShowAddForm(false);
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingCategory(null);
    setTitle("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {t("dialogs.categories.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Add/Edit Form */}
          {(showAddForm || editingCategory) && (
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label>{t("dialogs.categories.titleLabel")}</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("dialogs.categories.titlePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("dialogs.categories.descriptionLabel")}</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("dialogs.categories.descriptionPlaceholder")}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={editingCategory ? handleEditCategory : handleAddCategory}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingCategory ? t("common.update") : t("common.add")}
                  </Button>
                  <Button variant="outline" onClick={cancelForm}>
                    <X className="h-4 w-4 mr-2" />
                    {t("common.cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Button */}
          {!showAddForm && !editingCategory && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("dialogs.categories.addCategory")}
            </Button>
          )}

          {/* Categories List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("dialogs.categories.noCategories")}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {categories.map((category) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      onEdit={startEdit}
                      onDelete={handleDeleteCategory}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
