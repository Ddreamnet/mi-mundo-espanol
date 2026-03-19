import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Download, Trash2, CheckCircle, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddTrialLessonDialog } from "./AddTrialLessonDialog";
import { exportScheduleAsPNG } from "./ScheduleExportCanvas";
import { LessonOverrideDialog } from "./LessonOverrideDialog";
import { format } from "date-fns";
import type { StudentLesson, TrialLesson } from "@/types/lessons";
import { formatTime as formatTimeUtil } from "@/utils/lessonDateUtils";
import { addTrialLessonToBalance, subtractTrialLessonFromBalance } from "@/lib/teacherBalance";
import { useScheduleGrid } from "@/hooks/useScheduleGrid";

interface AdminWeeklyScheduleProps {
  teacherId: string;
}

const getDayLabel = (t: any) => [
  t("days.monday"),
  t("days.tuesday"),
  t("days.wednesday"),
  t("days.thursday"),
  t("days.friday"),
  t("days.saturday"),
  t("days.sunday"),
];

export function AdminWeeklySchedule({ teacherId }: AdminWeeklyScheduleProps) {
  const { t } = useTranslation();
  const [showAddTrial, setShowAddTrial] = useState(false);
  const [selectedTrialLesson, setSelectedTrialLesson] = useState<TrialLesson | null>(null);
  const [showTrialActionDialog, setShowTrialActionDialog] = useState(false);
  const [showMarkAlert, setShowMarkAlert] = useState(false);
  const [showUnmarkAlert, setShowUnmarkAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  
  // Lesson override state (now instance-based)
  const [selectedLesson, setSelectedLesson] = useState<StudentLesson | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedLessonDate, setSelectedLessonDate] = useState<Date | null>(null);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  
  const { toast } = useToast();
  
  const {
    lessons,
    trialLessons,
    studentColors,
    loading,
    refetch: refetchSchedule,
    getDateForDayIndex,
    getTrialLessonForDayAndTime,
  } = useScheduleGrid({ teacherId, autoFetch: true, channelSuffix: "admin" });

  const formatTime = (time: string) => {
    return formatTimeUtil(time);
  };

  const getAllTimeSlots = () => {
    const allTimes = new Set<string>();
    
    lessons.forEach((l) => {
      allTimes.add(l.start_time);
    });
    
    trialLessons.forEach((l) => {
      allTimes.add(l.start_time);
    });
    
    return Array.from(allTimes).sort();
  };

  const getLessonForDayAndTime = (dayIndex: number, timeSlot: string) => {
    const dbDayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1;
    return lessons.find((l) => l.day_of_week === dbDayOfWeek && l.start_time === timeSlot) || null;
  };

  const handleLessonClick = (lesson: StudentLesson, dayIndex: number) => {
    const dateForDay = getDateForDayIndex(dayIndex);
    
    // Find matching instance for this lesson on this date
    // We'll look up instance from the schedule grid's data
    setSelectedLesson(lesson);
    setSelectedLessonDate(dateForDay);
    // Instance ID will be looked up by the override dialog or we pass it if available
    setSelectedInstanceId(null); // Will be resolved in the dialog
    setShowOverrideDialog(true);
  };

  const handleOverrideSuccess = () => {
    refetchSchedule();
  };

  const handleTrialLessonClick = (trial: TrialLesson) => {
    setSelectedTrialLesson(trial);
    setShowTrialActionDialog(true);
  };

  const handleDeleteTrialLesson = async () => {
    if (!selectedTrialLesson) return;
    try {
      const { error } = await supabase.from("trial_lessons").delete().eq("id", selectedTrialLesson.id);
      if (error) throw error;
      toast({ title: t("common.success"), description: t("dialogs.trialLessonActions.lessonDeleted") });
      refetchSchedule();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setShowDeleteAlert(false);
      setShowTrialActionDialog(false);
      setSelectedTrialLesson(null);
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedTrialLesson) return;
    try {
      const { error } = await supabase.from("trial_lessons").update({ is_completed: true }).eq("id", selectedTrialLesson.id);
      if (error) throw error;
      await addTrialLessonToBalance(teacherId, selectedTrialLesson);
      toast({ title: t("common.success"), description: t("dialogs.trialLessonActions.lessonMarked") });
      refetchSchedule();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setShowMarkAlert(false);
      setSelectedTrialLesson(null);
    }
  };

  const handleMarkIncomplete = async () => {
    if (!selectedTrialLesson) return;
    try {
      const { error } = await supabase.from("trial_lessons").update({ is_completed: false }).eq("id", selectedTrialLesson.id);
      if (error) throw error;
      await subtractTrialLessonFromBalance(teacherId, selectedTrialLesson);
      toast({ title: t("common.success"), description: t("dialogs.trialLessonActions.lessonUnmarked") });
      refetchSchedule();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setShowUnmarkAlert(false);
      setSelectedTrialLesson(null);
    }
  };

  const timeSlots = getAllTimeSlots();

  const handleExportPNG = async () => {
    try {
      await exportScheduleAsPNG({
        lessons: lessons.map(l => ({ ...l, is_completed: false })),
        trialLessons,
        studentColors,
      });
      toast({ title: t("common.success"), description: t("dialogs.weeklySchedule.pngDownloaded") });
    } catch (error) {
      toast({ title: t("common.error"), description: t("dialogs.weeklySchedule.pngError"), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const DAYS = getDayLabel(t);
  
  if (lessons.length === 0 && trialLessons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t("dialogs.weeklySchedule.title")}</CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleExportPNG} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {t("dialogs.weeklySchedule.downloadPng")}
              </Button>
              <Button onClick={() => setShowAddTrial(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t("dialogs.weeklySchedule.addTrial")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          {t("dialogs.weeklySchedule.noScheduleForTeacher")}
        </CardContent>
        <AddTrialLessonDialog
          open={showAddTrial}
          onOpenChange={setShowAddTrial}
          teacherId={teacherId}
          onSuccess={refetchSchedule}
        />
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t("dialogs.weeklySchedule.title")}</CardTitle>
            <Button onClick={() => setShowAddTrial(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t("dialogs.weeklySchedule.addTrial")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-border p-2 bg-muted font-medium text-sm">{t("dialogs.weeklySchedule.hour")}</th>
                  {DAYS.map((day) => (
                    <th key={day} className="border border-border p-2 bg-muted font-medium text-sm">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot) => (
                  <tr key={timeSlot}>
                    <td className="border border-border p-2 text-center font-medium text-sm bg-muted">
                      {formatTime(timeSlot)}
                    </td>
                    {DAYS.map((_, dayIndex) => {
                      const lesson = getLessonForDayAndTime(dayIndex, timeSlot);
                      const trialLesson = getTrialLessonForDayAndTime(dayIndex, timeSlot);

                      return (
                        <td key={dayIndex} className="border border-border p-2">
                          {lesson && (
                            <Button
                              variant="outline"
                              className={`w-full justify-center py-2 cursor-pointer ${
                                studentColors[lesson.student_id] || "bg-muted text-muted-foreground"
                              }`}
                              onClick={() => handleLessonClick(lesson, dayIndex)}
                            >
                              <div className="text-center">
                                <div className="font-medium">
                                  {lesson.note ? `${lesson.student_name} - ${lesson.note}` : lesson.student_name}
                                </div>
                                <div className="text-xs mt-1">
                                  {formatTime(lesson.start_time)} - {formatTime(lesson.end_time)}
                                </div>
                              </div>
                            </Button>
                          )}
                          {trialLesson && (
                            <Button
                              variant="outline"
                              className={`w-full py-2 border-2 transition-all ${
                                trialLesson.is_completed
                                  ? "bg-destructive/10 text-destructive/40 border-destructive/20 hover:bg-destructive/15 opacity-40"
                                  : "bg-destructive/20 text-destructive border-destructive/50 hover:bg-destructive/30"
                              }`}
                              onClick={() => handleTrialLessonClick(trialLesson)}
                            >
                              <div className="text-center w-full">
                                <div className="font-medium">{t("dialogs.weeklySchedule.trialLesson")}</div>
                                <div className="text-xs mt-1">
                                  {formatTime(trialLesson.start_time)} - {formatTime(trialLesson.end_time)}
                                </div>
                              </div>
                            </Button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AddTrialLessonDialog
        open={showAddTrial}
        onOpenChange={setShowAddTrial}
        teacherId={teacherId}
        onSuccess={refetchSchedule}
      />

      {/* Trial Lesson Action Dialog */}
      <Dialog open={showTrialActionDialog} onOpenChange={setShowTrialActionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dialogs.trialLessonActions.title")}</DialogTitle>
            <DialogDescription>
              {selectedTrialLesson && `${formatTime(selectedTrialLesson.start_time)} - ${formatTime(selectedTrialLesson.end_time)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            {selectedTrialLesson?.is_completed ? (
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => {
                  setShowTrialActionDialog(false);
                  setShowUnmarkAlert(true);
                }}
              >
                <Undo2 className="h-5 w-5 text-warning" />
                {t("trialLessonActions.undoComplete")}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => {
                  setShowTrialActionDialog(false);
                  setShowMarkAlert(true);
                }}
              >
                <CheckCircle className="h-5 w-5 text-success" />
                {t("trialLessonActions.markComplete")}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={() => {
                setShowTrialActionDialog(false);
                setShowDeleteAlert(true);
              }}
            >
              <Trash2 className="h-5 w-5" />
              {t("trialLessonActions.deleteTrialLesson")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showMarkAlert} onOpenChange={setShowMarkAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trialLessonActions.markConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("trialLessonActions.markConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkComplete}>{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnmarkAlert} onOpenChange={setShowUnmarkAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trialLessonActions.unmarkConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("trialLessonActions.unmarkConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkIncomplete}>{t("common.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trialLessonActions.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("trialLessonActions.deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTrialLesson} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lesson Override Dialog — now instance-based */}
      {selectedLesson && selectedLessonDate && (
        <LessonOverrideDialog
          open={showOverrideDialog}
          onOpenChange={setShowOverrideDialog}
          studentId={selectedLesson.student_id}
          teacherId={teacherId}
          studentName={selectedLesson.student_name}
          instanceId={selectedInstanceId || undefined}
          originalDate={selectedLessonDate}
          originalDayOfWeek={selectedLesson.day_of_week}
          originalStartTime={selectedLesson.start_time}
          originalEndTime={selectedLesson.end_time}
          hasExistingOverride={false}
          onSuccess={handleOverrideSuccess}
        />
      )}
    </>
  );
}
