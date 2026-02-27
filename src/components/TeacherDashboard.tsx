import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, LogOut, Clock, Wallet, Calendar, FileUser } from "lucide-react";
import { StudentContentTabs } from "./StudentContentTabs";
import { Header } from "./Header";
import { GlobalTopicsManager } from "./GlobalTopicsManager";
import { NotificationBell } from "./NotificationBell";
import { LessonLinkDialog } from "./LessonLinkDialog";
import { WeeklyScheduleDialog } from "./WeeklyScheduleDialog";
import { TeacherBalanceDialog } from "./TeacherBalanceDialog";
import { StudentAboutDialog } from "./StudentAboutDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatTime as formatTimeUtil, getLocale } from "@/utils/lessonDateUtils";

interface StudentLesson {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isCompleted?: boolean;
}

interface Student {
  id: string;
  student_id: string;
  lessons: StudentLesson[];
  about_text: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
}

export function TeacherDashboard() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGlobalTopics, setShowGlobalTopics] = useState(false);
  const [showWeeklySchedule, setShowWeeklySchedule] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [showStudentAbout, setShowStudentAbout] = useState(false);
  const [studentAboutData, setStudentAboutData] = useState<{ studentId: string; studentName: string; aboutText: string | null } | null>(null);
  const {
    profile,
    signOut,
    signingOut
  } = useAuth();
  const {
    toast
  } = useToast();

  const daysOfWeek = [
    t("days.sunday"),
    t("days.monday"),
    t("days.tuesday"),
    t("days.wednesday"),
    t("days.thursday"),
    t("days.friday"),
    t("days.saturday")
  ];

  useEffect(() => {
    if (profile?.user_id) {
      fetchStudents();
    }
  }, [profile]);

  const fetchStudents = async () => {
    try {
      // Fetch students with their lessons (exclude archived students)
      const {
        data: studentsData,
        error: studentsError
      } = await supabase.from("students").select(`
          id,
          student_id,
          is_archived,
          about_text,
          profiles!students_student_id_fkey (
            full_name,
            email
          )
        `).eq("teacher_id", profile?.user_id).eq("is_archived", false);
      if (studentsError) throw studentsError;

      // Fetch lessons for all students
      const {
        data: lessonsData,
        error: lessonsError
      } = await supabase.from("student_lessons").select("*").eq("teacher_id", profile?.user_id);
      if (lessonsError) throw lessonsError;

      // Combine students with their lessons
      const studentsWithLessons = (studentsData || []).map(student => ({
        ...student,
        about_text: student.about_text || null,
        lessons: (lessonsData || []).filter(lesson => lesson.student_id === student.student_id).map(lesson => ({
          id: lesson.id,
          dayOfWeek: lesson.day_of_week,
          startTime: lesson.start_time,
          endTime: lesson.end_time,
          isCompleted: lesson.is_completed
        }))
      }));

      // Sort students by closest upcoming lesson time
      const sortedStudents = studentsWithLessons.sort((a, b) => {
        const getNextLessonTime = (lessons: StudentLesson[]) => {
          if (lessons.length === 0) return Number.MAX_SAFE_INTEGER;
          const now = new Date();
          const currentDay = now.getDay();
          const currentTime = now.getHours() * 60 + now.getMinutes();
          let earliestLesson = Number.MAX_SAFE_INTEGER;
          for (const lesson of lessons) {
            const [hours, minutes] = lesson.startTime.split(":").map(Number);
            const lessonTime = hours * 60 + minutes;
            let daysUntilLesson = (lesson.dayOfWeek - currentDay + 7) % 7;
            if (daysUntilLesson === 0 && lessonTime < currentTime) {
              daysUntilLesson = 7; // Next week
            }
            const timeUntilLesson = daysUntilLesson * 24 * 60 + lessonTime;
            if (timeUntilLesson < earliestLesson) {
              earliestLesson = timeUntilLesson;
            }
          }
          return earliestLesson;
        };
        const aNextLesson = getNextLessonTime(a.lessons);
        const bNextLesson = getNextLessonTime(b.lessons);
        return aNextLesson - bNextLesson;
      });
      setStudents(sortedStudents);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("messages.studentsLoadError"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayOfWeek?: number) => {
    return dayOfWeek !== undefined ? daysOfWeek[dayOfWeek] : "";
  };

  const formatTime = (time?: string) => {
    if (!time) return "";
    return formatTimeUtil(time, getLocale(language));
  };

  const getLessonStatus = (dayOfWeek: number, startTime: string) => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const mondayBasedCurrentDay = currentDay === 0 ? 6 : currentDay - 1;
    const mondayBasedLessonDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const startOfWeek = new Date(now);
    const daysToMonday = mondayBasedCurrentDay;
    startOfWeek.setDate(now.getDate() - daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const lessonDate = new Date(startOfWeek);
    lessonDate.setDate(startOfWeek.getDate() + mondayBasedLessonDay);
    if (lessonDate < startOfWeek || lessonDate > endOfWeek) {
      return "not-this-week";
    }

    const [hours, minutes] = startTime.split(":").map(Number);
    const lessonTime = hours * 60 + minutes;

    if (mondayBasedLessonDay < mondayBasedCurrentDay || mondayBasedLessonDay === mondayBasedCurrentDay && lessonTime < currentTime) {
      return "past";
    } else if (mondayBasedLessonDay >= mondayBasedCurrentDay) {
      return "upcoming";
    }
    return "not-this-week";
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }

  return <div className="min-h-screen bg-background" data-area="dashboard" data-dashboard="teacher">
      <Header rightActions={<>
            <NotificationBell 
              userId={profile?.user_id || ""}
              teacherId={profile?.user_id || ""} 
              onNotificationClick={() => {
                if (selectedStudent) {
                }
              }}
            />
            <Button onClick={() => setShowGlobalTopics(true)} variant="outline" size="sm">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{t("dashboard.admin.topics")}</span>
            </Button>
            <LessonLinkDialog teacherId={profile?.user_id || ""} />
            <Button onClick={signOut} variant="outline" size="sm" disabled={signingOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{signingOut ? t("auth.signingOut") : t("auth.signOut")}</span>
            </Button>
          </>}>
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-card-foreground">{t("dashboard.teacher.title")}</h1>
          <p className="text-sm sm:text-lg text-card-foreground/70 hidden sm:block">{t("dashboard.teacher.welcome")}, {profile?.full_name}</p>
        </div>
      </Header>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Students List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {t("dashboard.teacher.myStudents")}
                    </CardTitle>
                    <CardDescription>{students.length} {t("dashboard.teacher.studentsRegistered")}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
                    <Button onClick={() => setShowBalance(true)} variant="outline" size="sm">
                      <Wallet className="h-4 w-4" />
                      <span className="ml-2 hidden sm:inline">{t("dashboard.teacher.balance")}</span>
                    </Button>
                    <Button onClick={() => setShowWeeklySchedule(true)} variant="outline" size="sm">
                      <Calendar className="h-4 w-4" />
                      <span className="ml-2 hidden sm:inline">{t("dashboard.teacher.myLessons")}</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {students.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">
                    {t("dashboard.teacher.noStudents")}
                  </p> : students.map(student => <Card key={student.id} className={`cursor-pointer transition-colors hover:bg-accent ${selectedStudent?.id === student.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedStudent(student)}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{student.profiles.full_name}</h4>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStudentAboutData({
                                    studentId: student.student_id,
                                    studentName: student.profiles.full_name,
                                    aboutText: student.about_text
                                  });
                                  setShowStudentAbout(true);
                                }}
                                title={t("dashboard.admin.aboutStudent")}
                              >
                                <FileUser className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">{student.profiles.email}</p>

                            {student.lessons.length > 0 && <div className="mt-1 space-y-1">
                                {student.lessons.map((lesson, index) => {
                          const status = getLessonStatus(lesson.dayOfWeek, lesson.startTime);
                          return <div key={index} className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span className={`
                    ${status === "past" ? "text-[10px] line-through opacity-60" : status === "upcoming" ? "text-sm font-semibold" : "text-xs opacity-70"}
                  `}>
                                        {getDayName(lesson.dayOfWeek)} {formatTime(lesson.startTime)}-
                                        {formatTime(lesson.endTime)}
                                      </span>
                                    </div>;
                        })}
                              </div>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>)}
              </CardContent>
            </Card>
          </div>

          {/* Student Content - Topics & Homework Tabs */}
          <div className="lg:col-span-2">
            {selectedStudent ? (
              <StudentContentTabs student={selectedStudent} teacherId={profile?.user_id || ""} />
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <BookOpen className="h-12 w-12 mx-auto opacity-50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t("dashboard.teacher.selectStudent")}</h3>
                  <p className="opacity-70">
                    {t("dashboard.teacher.selectStudentDesc")}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Global Topics Manager - Read-only for teachers */}
      <GlobalTopicsManager open={showGlobalTopics} onOpenChange={setShowGlobalTopics} isAdmin={false} />

      <WeeklyScheduleDialog open={showWeeklySchedule} onOpenChange={setShowWeeklySchedule} teacherId={profile?.user_id || ""} />

      <TeacherBalanceDialog open={showBalance} onOpenChange={setShowBalance} teacherId={profile?.user_id || ""} />

      {studentAboutData && (
        <StudentAboutDialog
          key={studentAboutData.studentId}
          open={showStudentAbout}
          onOpenChange={setShowStudentAbout}
          studentId={studentAboutData.studentId}
          studentName={studentAboutData.studentName}
          aboutText={studentAboutData.aboutText}
          isReadOnly={true}
        />
      )}
    </div>;
}
