import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Plus, Trash2, ExternalLink, FileText, Video, Link as LinkIcon, Pencil, GripVertical, FolderOpen, ChevronDown, Settings } from "lucide-react";
import { AddTopicDialog } from "./AddTopicDialog";
import { AddResourceDialog } from "./AddResourceDialog";
import { EditTopicDialog } from "./EditTopicDialog";
import { EditResourceDialog } from "./EditResourceDialog";
import { CategoryManagementDialog } from "./CategoryManagementDialog";
import { SortableResource } from "./SortableResource";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============= TYPES =============
interface Category {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
}

interface GlobalTopic {
  id: string;
  title: string;
  description: string;
  order_index: number;
  category_id: string | null;
  resources: GlobalTopicResource[];
}

interface GlobalTopicResource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  resource_url: string;
  order_index: number;
}

interface GlobalTopicsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}

// ============= DRAGGABLE TOPIC COMPONENT =============
interface DraggableTopicProps {
  topic: GlobalTopic;
  isAdmin: boolean;
  expandAll: boolean;
  onAddResource: (topicId: string) => void;
  onEditTopic: (topic: GlobalTopic) => void;
  onDeleteTopic: (topicId: string) => void;
  onEditResource: (resource: GlobalTopicResource) => void;
  onDeleteResource: (resourceId: string) => void;
  onResourceDragEnd: (event: DragEndEvent, topicId: string) => void;
  getResourceIcon: (type: string) => JSX.Element;
}

function DraggableTopic({
  topic,
  isAdmin,
  expandAll,
  onAddResource,
  onEditTopic,
  onDeleteTopic,
  onEditResource,
  onDeleteResource,
  onResourceDragEnd,
  getResourceIcon,
}: DraggableTopicProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    setIsOpen(expandAll);
  }, [expandAll]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: topic.id,
    disabled: !isAdmin,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const resourceSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card ref={setNodeRef} style={style} className={isDragging ? "ring-2 ring-primary" : ""}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex justify-between items-start gap-3">
              {isAdmin && (
                <button
                  className="cursor-grab active:cursor-grabbing mt-1 opacity-50 hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                  {...attributes}
                  {...listeners}
                >
                  <GripVertical className="h-5 w-5" />
                </button>
              )}
              <div className="flex-1">
                <CardTitle className="text-base">{topic.title}</CardTitle>
                {topic.description && <CardDescription className="mt-1 text-sm">{topic.description}</CardDescription>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{topic.resources.length} {t("common.resource")}</Badge>
                {topic.resources.length > 0 && (
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
                {isAdmin && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => onAddResource(topic.id)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onEditTopic(topic)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDeleteTopic(topic.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        {topic.resources.length > 0 && (
          <CollapsibleContent>
            <CardContent className="pt-0 pb-3">
              <DndContext
                sensors={resourceSensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => onResourceDragEnd(event, topic.id)}
              >
                <SortableContext
                  items={topic.resources.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {topic.resources.map((resource) => (
                      <SortableResource
                        key={resource.id}
                        resource={resource}
                        isAdmin={isAdmin}
                        onEditResource={onEditResource}
                        onDeleteResource={onDeleteResource}
                        getResourceIcon={getResourceIcon}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </CollapsibleContent>
        )}
      </Card>
    </Collapsible>
  );
}

// ============= DROPPABLE CATEGORY COMPONENT =============
interface DroppableCategoryProps {
  category: Category;
  topics: GlobalTopic[];
  isAdmin: boolean;
  expandAll: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddResource: (topicId: string) => void;
  onEditTopic: (topic: GlobalTopic) => void;
  onDeleteTopic: (topicId: string) => void;
  onEditResource: (resource: GlobalTopicResource) => void;
  onDeleteResource: (resourceId: string) => void;
  onResourceDragEnd: (event: DragEndEvent, topicId: string) => void;
  getResourceIcon: (type: string) => JSX.Element;
}

function DroppableCategory({
  category,
  topics,
  isAdmin,
  expandAll,
  isExpanded,
  onToggleExpand,
  onAddResource,
  onEditTopic,
  onDeleteTopic,
  onEditResource,
  onDeleteResource,
  onResourceDragEnd,
  getResourceIcon,
}: DroppableCategoryProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: `category-${category.id}`,
    data: { categoryId: category.id },
  });

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div
        ref={setNodeRef}
        className={`border-2 rounded-lg transition-colors ${
          isOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-lg">{category.title}</h3>
                {category.description && (
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{topics.length} {t("dialogs.globalTopics.topics")}</Badge>
              <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-2">
            {topics.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {t("dialogs.categories.dropTopicsHere")}
              </div>
            ) : (
              <SortableContext
                items={topics.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {topics.map((topic) => (
                  <DraggableTopic
                    key={topic.id}
                    topic={topic}
                    isAdmin={isAdmin}
                    expandAll={expandAll}
                    onAddResource={onAddResource}
                    onEditTopic={onEditTopic}
                    onDeleteTopic={onDeleteTopic}
                    onEditResource={onEditResource}
                    onDeleteResource={onDeleteResource}
                    onResourceDragEnd={onResourceDragEnd}
                    getResourceIcon={getResourceIcon}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ============= UNCATEGORIZED SECTION =============
interface UncategorizedSectionProps {
  topics: GlobalTopic[];
  isAdmin: boolean;
  expandAll: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddResource: (topicId: string) => void;
  onEditTopic: (topic: GlobalTopic) => void;
  onDeleteTopic: (topicId: string) => void;
  onEditResource: (resource: GlobalTopicResource) => void;
  onDeleteResource: (resourceId: string) => void;
  onResourceDragEnd: (event: DragEndEvent, topicId: string) => void;
  getResourceIcon: (type: string) => JSX.Element;
}

function UncategorizedSection({
  topics,
  isAdmin,
  expandAll,
  isExpanded,
  onToggleExpand,
  onAddResource,
  onEditTopic,
  onDeleteTopic,
  onEditResource,
  onDeleteResource,
  onResourceDragEnd,
  getResourceIcon,
}: UncategorizedSectionProps) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: "category-uncategorized",
    data: { categoryId: null },
  });

  if (topics.length === 0 && !isAdmin) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div
        ref={setNodeRef}
        className={`border-2 border-dashed rounded-lg transition-colors ${
          isOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
        }`}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg text-muted-foreground">{t("dialogs.categories.uncategorized")}</h3>
                <p className="text-sm text-muted-foreground">{t("dialogs.categories.uncategorizedDesc")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{topics.length} {t("dialogs.globalTopics.topics")}</Badge>
              <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-2">
            {topics.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                {t("dialogs.categories.noUncategorizedTopics")}
              </div>
            ) : (
              <SortableContext
                items={topics.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {topics.map((topic) => (
                  <DraggableTopic
                    key={topic.id}
                    topic={topic}
                    isAdmin={isAdmin}
                    expandAll={expandAll}
                    onAddResource={onAddResource}
                    onEditTopic={onEditTopic}
                    onDeleteTopic={onDeleteTopic}
                    onEditResource={onEditResource}
                    onDeleteResource={onDeleteResource}
                    onResourceDragEnd={onResourceDragEnd}
                    getResourceIcon={getResourceIcon}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ============= MAIN COMPONENT =============
export function GlobalTopicsManager({ open, onOpenChange, isAdmin = false }: GlobalTopicsManagerProps) {
  const { t } = useTranslation();
  // State
  const [categories, setCategories] = useState<Category[]>([]);
  const [globalTopics, setGlobalTopics] = useState<GlobalTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);
  const [showEditTopic, setShowEditTopic] = useState(false);
  const [showEditResource, setShowEditResource] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<GlobalTopic | null>(null);
  const [editingResource, setEditingResource] = useState<GlobalTopicResource | null>(null);
  const [expandAll, setExpandAll] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  // ============= EFFECTS =============
  useEffect(() => {
    if (open && profile?.user_id) {
      fetchData();
    }
  }, [open, profile]);

  // ============= DATA FETCHING =============
  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, topicsRes] = await Promise.all([
        supabase
          .from("global_topic_categories")
          .select("*")
          .order("order_index", { ascending: true }),
        supabase
          .from("global_topics")
          .select("*, global_topic_resources(*)")
          .order("order_index", { ascending: true })
          .order("order_index", { foreignTable: "global_topic_resources", ascending: true }),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (topicsRes.error) throw topicsRes.error;

      setCategories(categoriesRes.data || []);

      const topicsWithSortedResources = (topicsRes.data || []).map((topic: any) => ({
        ...topic,
        resources: (topic.global_topic_resources || []).sort(
          (a: GlobalTopicResource, b: GlobalTopicResource) => a.order_index - b.order_index,
        ),
      }));

      setGlobalTopics(topicsWithSortedResources);

      // Initialize expanded state for all categories
      const initialExpanded: Record<string, boolean> = { uncategorized: true };
      (categoriesRes.data || []).forEach((cat: Category) => {
        initialExpanded[cat.id] = true;
      });
      setExpandedCategories(initialExpanded);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("dialogs.globalTopics.fetchError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============= DRAG AND DROP HANDLERS =============
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if dropping on a category
    if (overId.startsWith("category-")) {
      const newCategoryId = overId === "category-uncategorized" ? null : overId.replace("category-", "");
      const topic = globalTopics.find((t) => t.id === activeId);
      
      if (topic && topic.category_id !== newCategoryId) {
        // Update category
        await updateTopicCategory(activeId, newCategoryId);
      }
      return;
    }

    // Handle reordering within same category
    const activeTopic = globalTopics.find((t) => t.id === activeId);
    const overTopic = globalTopics.find((t) => t.id === overId);

    if (activeTopic && overTopic && activeTopic.category_id === overTopic.category_id) {
      const categoryTopics = globalTopics.filter((t) => t.category_id === activeTopic.category_id);
      const oldIndex = categoryTopics.findIndex((t) => t.id === activeId);
      const newIndex = categoryTopics.findIndex((t) => t.id === overId);

      if (oldIndex !== newIndex) {
        const newCategoryTopics = arrayMove(categoryTopics, oldIndex, newIndex);
        const otherTopics = globalTopics.filter((t) => t.category_id !== activeTopic.category_id);
        
        const updatedTopics = [...otherTopics, ...newCategoryTopics];
        setGlobalTopics(updatedTopics);

        try {
          const topicOrders = newCategoryTopics.map((topic, index) => ({
            id: topic.id,
            order_index: index,
          }));

          const { error } = await supabase.rpc("update_global_topics_order", {
            topic_orders: topicOrders,
          });

          if (error) throw error;
        } catch (error: any) {
          toast({
            title: t("common.error"),
            description: t("globalTopicsMessages.orderUpdateError"),
            variant: "destructive",
          });
          fetchData();
        }
      }
    } else if (activeTopic && overTopic && activeTopic.category_id !== overTopic.category_id) {
      // Moving to different category
      await updateTopicCategory(activeId, overTopic.category_id);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const overId = over.id as string;
    
    // If hovering over a category droppable area
    if (overId.startsWith("category-")) {
      return;
    }

    // If hovering over another topic, check if we need to change category
    const activeTopic = globalTopics.find((t) => t.id === active.id);
    const overTopic = globalTopics.find((t) => t.id === overId);

    if (activeTopic && overTopic && activeTopic.category_id !== overTopic.category_id) {
      // Visual feedback is handled by the droppable component
    }
  };

  const updateTopicCategory = async (topicId: string, newCategoryId: string | null) => {
    // Optimistic update
    setGlobalTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, category_id: newCategoryId } : t))
    );

    try {
      const { error } = await supabase.rpc("update_topic_category", {
        topic_id: topicId,
        new_category_id: newCategoryId,
      });

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("dialogs.categories.topicMoved"),
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
      fetchData();
    }
  };

  const handleResourceDragEnd = async (event: DragEndEvent, topicId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const topic = globalTopics.find((t) => t.id === topicId);
    if (!topic) return;

    const oldIndex = topic.resources.findIndex((r) => r.id === active.id);
    const newIndex = topic.resources.findIndex((r) => r.id === over.id);

    const newResources = arrayMove(topic.resources, oldIndex, newIndex);
    
    setGlobalTopics(
      globalTopics.map((t) =>
        t.id === topicId ? { ...t, resources: newResources } : t
      )
    );

    try {
      const resourceOrders = newResources.map((resource, index) => ({
        id: resource.id,
        order_index: index,
      }));

      const { error } = await supabase.rpc("update_global_resources_order", {
        resource_orders: resourceOrders,
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("globalTopicsMessages.resourceOrderError"),
        variant: "destructive",
      });
      fetchData();
    }
  };

  // ============= TOPIC HANDLERS =============
  const handleAddTopic = async (title: string, description: string, addToEnd: boolean = false) => {
    try {
      const categoryTopics = globalTopics.filter((t) => t.category_id === selectedCategoryId);
      let orderIndex = 0;

      if (addToEnd) {
        orderIndex = categoryTopics.length > 0 
          ? Math.max(...categoryTopics.map((t) => t.order_index)) + 1 
          : 0;
      } else {
        // Increment order_index for existing topics in this category
        for (const topic of categoryTopics) {
          await supabase
            .from("global_topics")
            .update({ order_index: topic.order_index + 1 })
            .eq("id", topic.id);
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.id) {
        toast({
          title: t("common.error"),
          description: t("globalTopicsMessages.sessionError"),
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("global_topics")
        .insert({
          teacher_id: user.id,
          title,
          description,
          order_index: orderIndex,
          category_id: selectedCategoryId,
        });

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("globalTopicsMessages.topicAdded"),
      });

      fetchData();
      setShowAddTopic(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      const { error: resourcesError } = await supabase
        .from("global_topic_resources")
        .delete()
        .eq("global_topic_id", topicId);

      if (resourcesError) throw resourcesError;

      const { error } = await supabase.from("global_topics").delete().eq("id", topicId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("globalTopicsMessages.topicDeleted"),
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ============= RESOURCE HANDLERS =============
  const handleAddResource = async (title: string, description: string, resourceType: string, resourceUrl: string) => {
    try {
      const currentTopic = globalTopics.find((t) => t.id === selectedTopicId);
      const nextOrderIndex = currentTopic?.resources.length || 0;

      const { error } = await supabase.from("global_topic_resources").insert({
        global_topic_id: selectedTopicId,
        title,
        description,
        resource_type: resourceType,
        resource_url: resourceUrl,
        order_index: nextOrderIndex,
      });

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("globalTopicsMessages.resourceAdded"),
      });

      fetchData();
      setShowAddResource(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditTopic = async (id: string, title: string, description: string) => {
    try {
      const { error } = await supabase
        .from("global_topics")
        .update({ title, description })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("globalTopicsMessages.topicUpdated"),
      });

      fetchData();
      setShowEditTopic(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditResource = async (
    id: string,
    title: string,
    description: string,
    resourceType: string,
    resourceUrl: string,
  ) => {
    try {
      const { error } = await supabase
        .from("global_topic_resources")
        .update({
          title,
          description,
          resource_type: resourceType,
          resource_url: resourceUrl,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("globalTopicsMessages.resourceUpdated"),
      });

      fetchData();
      setShowEditResource(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    try {
      const { error } = await supabase.from("global_topic_resources").delete().eq("id", resourceId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("globalTopicsMessages.resourceDeleted"),
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ============= HELPER FUNCTIONS =============
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "pdf":
      case "document":
        return <FileText className="h-4 w-4" />;
      case "link":
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const getTopicsForCategory = (categoryId: string | null) => {
    return globalTopics.filter((t) => t.category_id === categoryId);
  };

  const uncategorizedTopics = getTopicsForCategory(null);

  // ============= RENDER =============
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t("dialogs.globalTopics.management")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              {/* Header Actions */}
              <div className="flex justify-between items-center flex-wrap gap-2">
                <p className="text-sm opacity-70">
                  {isAdmin 
                    ? t("dialogs.globalTopics.globalTopicsDescAdmin")
                    : t("dialogs.globalTopics.globalTopicsDesc")}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {!loading && (categories.length > 0 || globalTopics.length > 0) && (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="expand-all"
                        checked={expandAll}
                        onCheckedChange={setExpandAll}
                      />
                      <Label htmlFor="expand-all" className="cursor-pointer text-sm">
                        {t("dialogs.globalTopics.expandAll")}
                      </Label>
                    </div>
                  )}
                  {isAdmin && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setShowCategoryManagement(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        {t("dialogs.categories.manage")}
                      </Button>
                      <Button size="sm" onClick={() => {
                        setSelectedCategoryId(null);
                        setShowAddTopic(true);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("dialogs.globalTopics.addTopic")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}

              {/* Empty State */}
              {!loading && categories.length === 0 && globalTopics.length === 0 && (
                <Card className="text-center py-8">
                  <CardContent>
                    <BookOpen className="h-12 w-12 mx-auto opacity-50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">{t("dialogs.globalTopics.noTopics")}</h3>
                    <p className="opacity-70 mb-4">
                      {isAdmin 
                        ? t("dialogs.globalTopics.noTopicsDescAdmin")
                        : t("dialogs.globalTopics.noTopicsDesc")}
                    </p>
                    {isAdmin && (
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" onClick={() => setShowCategoryManagement(true)}>
                          <Settings className="h-4 w-4 mr-2" />
                          {t("dialogs.categories.manage")}
                        </Button>
                        <Button onClick={() => setShowAddTopic(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t("dialogs.globalTopics.addFirstTopic")}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Categories with Topics */}
              {!loading && (categories.length > 0 || globalTopics.length > 0) && (
                <DndContext
                  sensors={isAdmin ? sensors : []}
                  collisionDetection={closestCenter}
                  onDragStart={isAdmin ? handleDragStart : undefined}
                  onDragEnd={isAdmin ? handleDragEnd : undefined}
                  onDragOver={isAdmin ? handleDragOver : undefined}
                >
                  <div className="space-y-4">
                    {/* Render categories */}
                    {categories.map((category) => (
                      <DroppableCategory
                        key={category.id}
                        category={category}
                        topics={getTopicsForCategory(category.id)}
                        isAdmin={isAdmin}
                        expandAll={expandAll}
                        isExpanded={expandedCategories[category.id] ?? true}
                        onToggleExpand={() => toggleCategoryExpand(category.id)}
                        onAddResource={(topicId) => {
                          setSelectedTopicId(topicId);
                          setShowAddResource(true);
                        }}
                        onEditTopic={(topic) => {
                          setEditingTopic(topic);
                          setShowEditTopic(true);
                        }}
                        onDeleteTopic={handleDeleteTopic}
                        onEditResource={(resource) => {
                          setEditingResource(resource);
                          setShowEditResource(true);
                        }}
                        onDeleteResource={handleDeleteResource}
                        onResourceDragEnd={handleResourceDragEnd}
                        getResourceIcon={getResourceIcon}
                      />
                    ))}

                    {/* Uncategorized topics */}
                    <UncategorizedSection
                      topics={uncategorizedTopics}
                      isAdmin={isAdmin}
                      expandAll={expandAll}
                      isExpanded={expandedCategories["uncategorized"] ?? true}
                      onToggleExpand={() => toggleCategoryExpand("uncategorized")}
                      onAddResource={(topicId) => {
                        setSelectedTopicId(topicId);
                        setShowAddResource(true);
                      }}
                      onEditTopic={(topic) => {
                        setEditingTopic(topic);
                        setShowEditTopic(true);
                      }}
                      onDeleteTopic={handleDeleteTopic}
                      onEditResource={(resource) => {
                        setEditingResource(resource);
                        setShowEditResource(true);
                      }}
                      onDeleteResource={handleDeleteResource}
                      onResourceDragEnd={handleResourceDragEnd}
                      getResourceIcon={getResourceIcon}
                    />
                  </div>
                </DndContext>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogs */}
      <AddTopicDialog open={showAddTopic} onOpenChange={setShowAddTopic} onAddTopic={handleAddTopic} />

      <AddResourceDialog
        open={showAddResource}
        onOpenChange={setShowAddResource}
        onAddResource={handleAddResource}
        topicTitle={globalTopics.find((t) => t.id === selectedTopicId)?.title || ""}
      />
      
      <EditTopicDialog
        open={showEditTopic}
        onOpenChange={setShowEditTopic}
        onEditTopic={handleEditTopic}
        topic={editingTopic}
      />

      <EditResourceDialog
        open={showEditResource}
        onOpenChange={setShowEditResource}
        onEditResource={handleEditResource}
        resource={editingResource}
      />

      <CategoryManagementDialog
        open={showCategoryManagement}
        onOpenChange={setShowCategoryManagement}
        onCategoriesChanged={fetchData}
      />
    </>
  );
}
