import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AdminStudent, Teacher, Topic, Resource } from "@/types/dashboard";

interface UseTopicManagementProps {
  selectedTeacher: Teacher | null;
  profileUserId: string | undefined;
}

export function useTopicManagement({ selectedTeacher, profileUserId }: UseTopicManagementProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [studentTopics, setStudentTopics] = useState<Map<string, Topic[]>>(new Map());
  const [studentCompletedTopics, setStudentCompletedTopics] = useState<Map<string, Topic[]>>(new Map());

  // Dialog state
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);
  const [showEditTopic, setShowEditTopic] = useState(false);
  const [showEditResource, setShowEditResource] = useState(false);
  const [selectedStudentForTopic, setSelectedStudentForTopic] = useState<string | null>(null);
  const [selectedTopicForResource, setSelectedTopicForResource] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const fetchStudentTopics = async (studentUserId: string, studentId: string) => {
    try {
      const [studentTopicsResponse, globalTopicsResponse, completionResponse] = await Promise.all([
        supabase.from("topics").select("*, resources (*)").eq("student_id", studentUserId).order("order_index"),
        supabase.from("global_topics").select("*, global_topic_resources(*)").order("order_index"),
        supabase.from("student_resource_completion").select("*").eq("student_id", studentUserId),
      ]);

      if (studentTopicsResponse.error) throw studentTopicsResponse.error;
      if (globalTopicsResponse.error) throw globalTopicsResponse.error;
      if (completionResponse.error) throw completionResponse.error;

      const completionMap = new Map();
      (completionResponse.data || []).forEach((c: any) => completionMap.set(c.resource_id, c));

      const processedStudentTopics = (studentTopicsResponse.data || []).map((topic) => ({
        ...topic,
        resources: (topic.resources || [])
          .map((resource: any) => ({
            ...resource,
            is_completed: completionMap.get(resource.id)?.is_completed || false,
          }))
          .sort((a: any, b: any) => a.order_index - b.order_index),
        isGlobal: false,
      }));

      setStudentTopics((prev) => new Map(prev).set(studentId, processedStudentTopics));

      const studentTopicTitles = new Set(processedStudentTopics.map((t) => t.title));

      const processedGlobalTopics = (globalTopicsResponse.data || [])
        .filter((topic) => !studentTopicTitles.has(topic.title))
        .map((topic) => {
          const globalResources = (topic.global_topic_resources || [])
            .map((res: any) => ({
              id: res.id,
              title: res.title,
              description: res.description,
              resource_type: res.resource_type,
              resource_url: res.resource_url,
              order_index: res.order_index,
              is_completed: completionMap.get(res.id)?.is_completed || false,
            }))
            .sort((a: any, b: any) => a.order_index - b.order_index);

          return {
            id: topic.id,
            title: topic.title,
            description: topic.description,
            is_completed: globalResources.length > 0 && globalResources.every((r: any) => r.is_completed),
            order_index: topic.order_index,
            resources: globalResources,
            isGlobal: true,
          };
        });

      const allTopics = [...processedStudentTopics, ...processedGlobalTopics].sort((a, b) => {
        if (a.isGlobal && !b.isGlobal) return 1;
        if (!a.isGlobal && b.isGlobal) return -1;
        return a.order_index - b.order_index;
      });

      setStudentCompletedTopics((prev) => new Map(prev).set(studentId, allTopics));
    } catch (error: any) {
      toast({ title: t("common.error"), description: t("messages.topicsLoadError"), variant: "destructive" });
    }
  };

  const handleAddTopic = async (title: string, description: string) => {
    if (!selectedStudentForTopic) return;
    try {
      const student = selectedTeacher?.students.find((s) => s.id === selectedStudentForTopic);
      if (!student) return;
      const topics = studentTopics.get(selectedStudentForTopic) || [];
      const nextOrderIndex = topics.length > 0 ? Math.max(...topics.map((t) => t.order_index)) + 1 : 0;

      const { error } = await supabase.from("topics").insert({
        teacher_id: profileUserId,
        student_id: student.student_id,
        title,
        description: description || null,
        order_index: nextOrderIndex,
      });
      if (error) throw error;

      toast({ title: t("common.success"), description: t("messages.topicCreated") });
      await fetchStudentTopics(student.student_id, selectedStudentForTopic);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  const findStudentIdByTopic = (topicId: string) => {
    return Array.from(studentTopics.entries()).find(([_, topics]) =>
      topics.some((t) => t.id === topicId)
    )?.[0];
  };

  const findStudentIdByResource = (resourceId: string) => {
    return Array.from(studentTopics.entries()).find(([_, topics]) =>
      topics.some((t) => t.resources.some((r) => r.id === resourceId))
    )?.[0];
  };

  const refreshTopicsForStudent = async (studentId: string | undefined) => {
    if (!studentId) return;
    const student = selectedTeacher?.students.find((s) => s.id === studentId);
    if (student) await fetchStudentTopics(student.student_id, studentId);
  };

  const handleAddResource = async (title: string, description: string, resourceType: string, resourceUrl: string) => {
    if (!selectedTopicForResource) return;
    try {
      const topics = Array.from(studentTopics.values()).flat();
      const topic = topics.find((t) => t.id === selectedTopicForResource);
      if (!topic) return;
      const nextOrderIndex = topic.resources.length > 0 ? Math.max(...topic.resources.map((r) => r.order_index)) + 1 : 0;

      const { error } = await supabase.from("resources").insert({
        topic_id: selectedTopicForResource,
        title,
        description: description || null,
        resource_type: resourceType,
        resource_url: resourceUrl,
        order_index: nextOrderIndex,
      });
      if (error) throw error;

      toast({ title: t("common.success"), description: t("messages.resourceAdded") });
      await refreshTopicsForStudent(findStudentIdByTopic(selectedTopicForResource));
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  const handleEditTopic = async (id: string, title: string, description: string) => {
    try {
      const { error } = await supabase.from("topics").update({ title, description: description || null }).eq("id", id);
      if (error) throw error;
      toast({ title: t("common.success"), description: t("messages.topicUpdated") });
      await refreshTopicsForStudent(findStudentIdByTopic(id));
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  const handleEditResource = async (id: string, title: string, description: string, resourceType: string, resourceUrl: string) => {
    try {
      const { error } = await supabase.from("resources").update({
        title, description: description || null, resource_type: resourceType, resource_url: resourceUrl,
      }).eq("id", id);
      if (error) throw error;
      toast({ title: t("common.success"), description: t("messages.resourceUpdated") });
      await refreshTopicsForStudent(findStudentIdByResource(id));
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteTopic = async (topicId: string, studentId: string, studentUserId: string) => {
    try {
      const { error } = await supabase.from("topics").delete().eq("id", topicId);
      if (error) throw error;
      toast({ title: t("common.success"), description: t("messages.topicDeleted") });
      await fetchStudentTopics(studentUserId, studentId);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteResource = async (resourceId: string, studentId: string, studentUserId: string) => {
    try {
      const { error } = await supabase.from("resources").delete().eq("id", resourceId);
      if (error) throw error;
      toast({ title: t("common.success"), description: t("messages.resourceDeleted") });
      await fetchStudentTopics(studentUserId, studentId);
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    }
  };

  return {
    studentTopics,
    studentCompletedTopics,
    fetchStudentTopics,
    handleAddTopic,
    handleAddResource,
    handleEditTopic,
    handleEditResource,
    handleDeleteTopic,
    handleDeleteResource,
    // Dialog state
    showAddTopic, setShowAddTopic,
    showAddResource, setShowAddResource,
    showEditTopic, setShowEditTopic,
    showEditResource, setShowEditResource,
    selectedStudentForTopic, setSelectedStudentForTopic,
    selectedTopicForResource, setSelectedTopicForResource,
    editingTopic, setEditingTopic,
    editingResource, setEditingResource,
  };
}
