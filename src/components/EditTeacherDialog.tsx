import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslation } from "react-i18next";

interface EditTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeacherUpdated: () => void;
  teacherId: string;
  currentName: string;
}

export function EditTeacherDialog({
  open,
  onOpenChange,
  onTeacherUpdated,
  teacherId,
  currentName,
}: EditTeacherDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName(currentName);
      fetchStudents();
      fetchTeachers();
      setSelectedStudent("");
      setSelectedTeacher("");
    }
  }, [open, currentName, teacherId]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          student_id,
          profiles!students_student_id_fkey (
            user_id,
            full_name,
            email
          )
        `)
        .eq("teacher_id", teacherId);

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("role", "teacher")
        .neq("user_id", teacherId);

      if (error) throw error;
      setTeachers(data || []);
    } catch (error: any) {
      console.error("Error fetching teachers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: t("common.error"),
        description: t("dialogs.editTeacher.nameRequired"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name.trim() })
        .eq("user_id", teacherId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("dialogs.editTeacher.updateSuccess"),
      });

      onTeacherUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.editTeacher.updateError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransferStudent = async () => {
    if (!selectedStudent || !selectedTeacher) {
      toast({
        title: t("common.warning"),
        description: t("dialogs.editTeacher.selectBoth"),
        variant: "destructive",
      });
      return;
    }

    setTransferLoading(true);
    try {
      // Get student info
      const student = students.find((s) => s.id === selectedStudent);
      if (!student) throw new Error(t("dialogs.editTeacher.studentNotFound"));

      const studentUserId = student.profiles.user_id;

      // Update students table
      const { error: studentsError } = await supabase
        .from("students")
        .update({ teacher_id: selectedTeacher })
        .eq("id", selectedStudent);

      if (studentsError) throw studentsError;

      // Update topics table
      await supabase
        .from("topics")
        .update({ teacher_id: selectedTeacher })
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherId);

      // Update student_lessons table
      await supabase
        .from("student_lessons")
        .update({ teacher_id: selectedTeacher })
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherId);

      // Update student_lesson_tracking table
      await supabase
        .from("student_lesson_tracking")
        .update({ teacher_id: selectedTeacher })
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherId);

      // Update homework_submissions table
      await supabase
        .from("homework_submissions")
        .update({ teacher_id: selectedTeacher })
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherId);

      // Update notifications table
      await supabase
        .from("notifications")
        .update({ teacher_id: selectedTeacher })
        .eq("student_id", studentUserId)
        .eq("teacher_id", teacherId);

      toast({
        title: t("common.success"),
        description: t("dialogs.editTeacher.transferSuccess", { name: student.profiles.full_name }),
      });

      fetchStudents();
      setSelectedStudent("");
      setSelectedTeacher("");
      onTeacherUpdated();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.editTeacher.transferError"),
        variant: "destructive",
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const handleDeleteTeacher = async () => {
    setLoading(true);
    try {
      // Check if teacher has students
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id")
        .eq("teacher_id", teacherId);

      if (studentsError) throw studentsError;

      if (students && students.length > 0) {
        toast({
          title: t("common.warning"),
          description: t("dialogs.editTeacher.hasStudentsWarning", { count: students.length }),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Delete all related data
      // 1. Delete global topics and resources created by this teacher
      const { data: globalTopics } = await supabase
        .from("global_topics")
        .select("id")
        .eq("teacher_id", teacherId);

      if (globalTopics && globalTopics.length > 0) {
        const globalTopicIds = globalTopics.map((t) => t.id);
        await supabase.from("global_topic_resources").delete().in("global_topic_id", globalTopicIds);
        await supabase.from("global_topics").delete().in("id", globalTopicIds);
      }

      // 2. Delete trial lessons
      await supabase.from("trial_lessons").delete().eq("teacher_id", teacherId);

      // 3. Delete teacher balance
      await supabase.from("teacher_balance").delete().eq("teacher_id", teacherId);

      // 4. Delete payment history
      await supabase.from("payment_history").delete().eq("teacher_id", teacherId);

      // 5. Delete user from auth and profiles via edge function
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: teacherId },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete user account');
      }

      toast({
        title: t("common.success"),
        description: t("dialogs.editTeacher.deleteSuccess"),
      });

      onTeacherUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("dialogs.editTeacher.deleteError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogs.editTeacher.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("dialogs.editTeacher.nameLabel")}</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dialogs.editTeacher.namePlaceholder")}
              required
            />
          </div>

          <Separator className="my-4" />

          {/* Öğrenci Atama Bölümü */}
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-base font-medium">{t("dialogs.editTeacher.studentTransfer")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("dialogs.editTeacher.studentTransferDescription")}
              </p>
            </div>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {t("dialogs.editTeacher.students")} ({students.length})
                  <span className="text-xs text-muted-foreground">{t("common.click")}</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <RadioGroup value={selectedStudent} onValueChange={setSelectedStudent}>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {students.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("dialogs.editTeacher.noStudents")}
                      </p>
                    ) : (
                      students.map((student) => (
                        <div key={student.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={student.id} id={student.id} />
                          <Label htmlFor={student.id} className="cursor-pointer flex-1">
                            {student.profiles.full_name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </RadioGroup>
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {t("dialogs.editTeacher.targetTeacher")} ({teachers.length})
                  <span className="text-xs text-muted-foreground">{t("common.click")}</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <RadioGroup value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {teachers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t("dialogs.editTeacher.noOtherTeachers")}
                      </p>
                    ) : (
                      teachers.map((teacher) => (
                        <div key={teacher.user_id} className="flex items-center space-x-2">
                          <RadioGroupItem value={teacher.user_id} id={teacher.user_id} />
                          <Label htmlFor={teacher.user_id} className="cursor-pointer flex-1">
                            {teacher.full_name}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </RadioGroup>
              </CollapsibleContent>
            </Collapsible>

            <Button
              type="button"
              onClick={handleTransferStudent}
              disabled={!selectedStudent || !selectedTeacher || transferLoading}
              className="w-full"
            >
              {transferLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <UserCheck className="h-4 w-4 mr-2" />
              {t("dialogs.editTeacher.assignStudent")}
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Öğretmen Silme Bölümü */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium text-destructive">{t("dialogs.editTeacher.dangerZone")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("dialogs.editTeacher.dangerZoneDescription")}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const confirmed = window.confirm(
                  t("dialogs.editTeacher.deleteConfirmation", { name: currentName })
                );
                if (confirmed) {
                  handleDeleteTeacher();
                }
              }}
              disabled={loading}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("dialogs.editTeacher.deleteTeacher")}
            </Button>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
