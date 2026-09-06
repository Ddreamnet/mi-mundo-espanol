import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Archive, AlertTriangle, ChevronLeft, ChevronRight, AlignLeft } from "lucide-react";
import { formatTime } from "@/lib/lessonTypes";
import { useTranslation } from "react-i18next";
import type { StudentLessonBase } from "@/lib/types";
import { useEditStudentDialog } from "@/hooks/useEditStudentDialog";

interface EditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentUpdated: () => void;
  studentId: string;
  currentName: string;
  currentLessons: StudentLessonBase[];
}

export function EditStudentDialog(props: EditStudentDialogProps) {
  const { t } = useTranslation();
  const {
    name, setName,
    lessonsPerWeek, lessons,
    lessonDates, originalLessonDates,
    loading, shifting, showConfirm, setShowConfirm,
    showResetConfirm, setShowResetConfirm,
    updateRemainingDays, setUpdateRemainingDays,
    conflicts, completedCount, totalLessons,
    sortedLessonsForDisplay, canShiftBackward, hasRealignableInstances,
    handleLessonsPerWeekChange, updateLesson, updateLessonDate,
    handleDateSubmit, handleMarkLastLesson, handleUndoLastLesson,
    handleResetAllLessons, confirmDateUpdate, handleSubmit,
    handleDeleteStudent, handleArchiveStudent,
    handleRealignChain, handleShiftForward, handleShiftBackward,
  } = useEditStudentDialog(props);

  const daysOfWeek = [
    { value: 1, label: t("days.monday") },
    { value: 2, label: t("days.tuesday") },
    { value: 3, label: t("days.wednesday") },
    { value: 4, label: t("days.thursday") },
    { value: 5, label: t("days.friday") },
    { value: 6, label: t("days.saturday") },
    { value: 0, label: t("days.sunday") },
  ];

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("dialogs.editStudent.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("dialogs.editStudent.nameLabel")}</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dialogs.editStudent.namePlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lessonsPerWeek">{t("dialogs.editStudent.lessonsPerWeekLabel")}</Label>
            <Select
              value={lessonsPerWeek.toString()}
              onValueChange={(value) => handleLessonsPerWeekChange(Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Six is the ceiling the validate_max_lessons_per_week trigger
                    enforces; offering seven only ever produced a failed save. */}
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {t("dialogs.editStudent.lessonsUnit")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">{t("dialogs.editStudent.scheduleLabel")}</Label>
            {lessons.map((lesson, index) => (
              <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3 p-3 border rounded-lg">
                <div className="space-y-2">
                  <Label>{t("dialogs.editStudent.dayLabel")}</Label>
                  <Select
                    value={lesson.dayOfWeek.toString()}
                    onValueChange={(value) => updateLesson(index, "dayOfWeek", Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("dialogs.editStudent.startTimeLabel")}</Label>
                  <Input
                    type="time"
                    value={lesson.startTime}
                    onChange={(e) => updateLesson(index, "startTime", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("dialogs.editStudent.endTimeLabel")}</Label>
                  <Input
                    type="time"
                    value={lesson.endTime}
                    onChange={(e) => updateLesson(index, "endTime", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("dialogs.editStudent.noteLabel")}</Label>
                  <Input
                    type="text"
                    value={lesson.note || ""}
                    onChange={(e) => updateLesson(index, "note", e.target.value)}
                    placeholder={t("dialogs.editStudent.notePlaceholder")}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Conflict warnings */}
          {conflicts.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {t("dialogs.editStudent.conflictFound")}
              </div>
              {conflicts.map((c, i) => (
                <div key={i} className="text-xs text-destructive/80">
                  {c.studentName} — {c.date} {c.timeRange} ({c.type === "trial" ? t("dialogs.weeklySchedule.trialLesson") : t("dialogs.editStudent.lesson")})
                </div>
              ))}
            </div>
          )}

          <Separator className="my-4" />

          {/* İşlenen Dersler */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">{t("dialogs.editStudent.completedLessonsTitle")}</Label>
                {hasRealignableInstances && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleShiftBackward}
                      disabled={loading || shifting || !canShiftBackward}
                      title={t("dialogs.editStudent.shiftBackward", { defaultValue: "Zinciri 1 slot geri kaydır" })}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleShiftForward}
                      disabled={loading || shifting}
                      title={t("dialogs.editStudent.shiftForward", { defaultValue: "Zinciri 1 slot ileri kaydır" })}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={handleRealignChain}
                      disabled={loading || shifting}
                      title={t("dialogs.editStudent.realign", { defaultValue: "Zinciri yeniden hizala" })}
                    >
                      <AlignLeft className="h-3.5 w-3.5" />
                      {t("dialogs.editStudent.realignLabel", { defaultValue: "Hizala" })}
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {completedCount < lessonsPerWeek * 4 && (
                  <Button type="button" variant="default" size="sm" onClick={handleMarkLastLesson} disabled={loading || shifting}>
                    {t("dialogs.editStudent.markLastLesson")}
                  </Button>
                )}
                {completedCount > 0 && (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={handleUndoLastLesson} disabled={loading || shifting}>
                      {t("dialogs.editStudent.undoLastLesson")}
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={() => setShowResetConfirm(true)} disabled={loading || shifting}>
                      {t("dialogs.editStudent.reset")}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {sortedLessonsForDisplay.map((lesson) => (
                <div
                  key={`${lesson.lessonNumber}-${lesson.instanceId || lesson.displayIndex}`}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 border rounded-lg ${lesson.isOverridden ? "border-amber-500" : ""}`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`h-4 w-4 rounded-full shrink-0 ${lesson.isCompleted ? "bg-primary" : "bg-muted"}`} />
                    <span className={`font-medium text-sm ${lesson.isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                      {t("dialogs.editStudent.lesson")} {lesson.displayIndex}
                    </span>
                    {lesson.startTime && lesson.endTime && (
                      <span className="text-xs text-muted-foreground ml-1 shrink-0">
                        {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Label className={`text-sm ${lesson.isOverridden ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                      {lesson.isOverridden ? t("dialogs.editStudent.newDate", { defaultValue: "Yeni:" }) : t("dialogs.editStudent.dateLabel")}
                    </Label>
                    <Input
                      type="date"
                      value={lesson.exists ? lessonDates[lesson.lessonNumber.toString()] ?? lesson.effectiveDate : ""}
                      onChange={(e) => updateLessonDate(lesson.lessonNumber, e.target.value)}
                      disabled={!lesson.exists}
                      className={`w-full sm:w-40 ${lesson.isOverridden ? "border-amber-500" : ""}`}
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="default"
                onClick={handleDateSubmit}
                disabled={loading || Object.keys(lessonDates).every((key) => lessonDates[key] === originalLessonDates[key])}
                className="w-full"
              >
                {t("dialogs.editStudent.confirmDates")}
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Danger Zone */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium text-destructive">{t("dialogs.editStudent.dangerZone")}</Label>
                <p className="text-sm text-muted-foreground">{t("dialogs.editStudent.dangerZoneDescription")}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const confirmed = window.confirm(t("dialogs.editStudent.archiveConfirmation", { name: props.currentName }));
                  if (confirmed) handleArchiveStudent();
                }}
                className="flex items-center gap-2"
              >
                <Archive className="h-4 w-4" />
                {t("dialogs.editStudent.archive")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  const confirmed = window.confirm(t("dialogs.editStudent.deleteConfirmation", { name: props.currentName }));
                  if (confirmed) handleDeleteStudent();
                }}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex gap-3">
            <Button type="submit" disabled={loading || conflicts.length > 0} className="flex-1">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
            <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)} disabled={loading}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>

        {/* Date confirmation dialog */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("dialogs.editStudent.updateDatesTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("dialogs.editStudent.updateDatesDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex items-center space-x-2 py-4">
              <Checkbox
                id="updateRemaining"
                checked={updateRemainingDays}
                onCheckedChange={(checked) => setUpdateRemainingDays(!!checked)}
              />
              <label htmlFor="updateRemaining" className="text-sm font-medium leading-none">
                {t("dialogs.editStudent.updateRemainingDays")}
              </label>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDateUpdate}>{t("common.confirm")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reset confirmation dialog */}
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("dialogs.editStudent.resetAllTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("dialogs.editStudent.resetAllDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetAllLessons}>{t("dialogs.editStudent.reset")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
