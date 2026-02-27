import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AdminStudent, Teacher } from "@/types/dashboard";

export function useAdminData() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Dialog state for teacher/student editing
  const [showCreateStudent, setShowCreateStudent] = useState(false);
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [showEditTeacher, setShowEditTeacher] = useState(false);
  const [editingStudent, setEditingStudent] = useState<AdminStudent | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showStudentAbout, setShowStudentAbout] = useState(false);
  const [studentAboutData, setStudentAboutData] = useState<{ studentId: string; studentName: string; aboutText: string | null } | null>(null);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data: teachersData, error: teachersError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("role", "teacher")
        .order("full_name");

      if (teachersError) throw teachersError;

      const teachersWithStudents = await Promise.all(
        (teachersData || []).map(async (teacher) => {
          const { data: studentsData, error: studentsError } = await supabase
            .from("students")
            .select(`
              id,
              student_id,
              is_archived,
              about_text,
              profiles!students_student_id_fkey (
                full_name,
                email
              )
            `)
            .eq("teacher_id", teacher.user_id);

          if (studentsError) throw studentsError;

          const { data: lessonsData, error: lessonsError } = await supabase
            .from("student_lessons")
            .select("*")
            .eq("teacher_id", teacher.user_id);

          if (lessonsError) throw lessonsError;

          const studentsWithLessons = (studentsData || []).map((student) => ({
            ...student,
            is_archived: student.is_archived || false,
            about_text: student.about_text || null,
            lessons: (lessonsData || [])
              .filter((lesson) => lesson.student_id === student.student_id)
              .map((lesson) => ({
                id: lesson.id,
                dayOfWeek: lesson.day_of_week,
                startTime: lesson.start_time,
                endTime: lesson.end_time,
                note: lesson.note,
              })),
          }));

          return {
            ...teacher,
            students: studentsWithLessons,
          };
        })
      );

      setTeachers(teachersWithStudents);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("messages.teachersLoadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedStudents(newExpanded);
  };

  const openStudentSettings = (student: AdminStudent) => {
    setEditingStudent(student);
    setShowEditStudent(true);
  };

  const openTeacherSettings = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setShowEditTeacher(true);
  };

  const handleRestoreStudent = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from("students")
        .update({ is_archived: false, archived_at: null })
        .eq("id", studentId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("dashboard.admin.studentRestored"),
      });

      fetchTeachers();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    teachers,
    selectedTeacher,
    setSelectedTeacher,
    expandedStudents,
    loading,
    fetchTeachers,
    toggleStudent,
    openStudentSettings,
    openTeacherSettings,
    handleRestoreStudent,
    // Dialog state
    showCreateStudent, setShowCreateStudent,
    showCreateTeacher, setShowCreateTeacher,
    showEditStudent, setShowEditStudent,
    showEditTeacher, setShowEditTeacher,
    editingStudent, setEditingStudent,
    editingTeacher, setEditingTeacher,
    showStudentAbout, setShowStudentAbout,
    studentAboutData, setStudentAboutData,
  };
}
