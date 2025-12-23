import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, Clock, Wallet, Calendar, FileUser } from "lucide-react";
import { StudentTopics } from "./StudentTopics";
import { PanelLayout, PanelCard, PanelCardTitle, PanelCardDescription, type SidebarItem } from "./panel";
import { GlobalTopicsManager } from "./GlobalTopicsManager";
import { NotificationBell } from "./NotificationBell";
import { ContactDialog } from "./ContactDialog";
import { WeeklyScheduleDialog } from "./WeeklyScheduleDialog";
import { TeacherBalanceDialog } from "./TeacherBalanceDialog";
import { StudentAboutDialog } from "./StudentAboutDialog";

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
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGlobalTopics, setShowGlobalTopics] = useState(false);
  const [showWeeklySchedule, setShowWeeklySchedule] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [showStudentAbout, setShowStudentAbout] = useState(false);
  const [studentAboutData, setStudentAboutData] = useState<{ studentId: string; studentName: string; aboutText: string | null } | null>(null);
  const { profile, signOut, signingOut } = useAuth();
  const { toast } = useToast();

  // Sidebar items
  const sidebarItems: SidebarItem[] = [
    { id: "students", label: "Öğrencilerim", icon: <Users className="w-5 h-5" />, badge: students.length },
    { id: "topics", label: "Konular", icon: <BookOpen className="w-5 h-5" /> },
    { id: "schedule", label: "Ders Programı", icon: <Calendar className="w-5 h-5" /> },
    { id: "balance", label: "Bakiye", icon: <Wallet className="w-5 h-5" /> },
  ];

  useEffect(() => {
    if (profile?.user_id) {
      fetchStudents();
    }
  }, [profile]);

  const fetchStudents = async () => {
    try {
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
        .eq("teacher_id", profile?.user_id)
        .eq("is_archived", false);

      if (studentsError) throw studentsError;

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("student_lessons")
        .select("*")
        .eq("teacher_id", profile?.user_id);

      if (lessonsError) throw lessonsError;

      const studentsWithLessons = (studentsData || []).map((student) => ({
        ...student,
        about_text: student.about_text || null,
        lessons: (lessonsData || [])
          .filter((lesson) => lesson.student_id === student.student_id)
          .map((lesson) => ({
            id: lesson.id,
            dayOfWeek: lesson.day_of_week,
            startTime: lesson.start_time,
            endTime: lesson.end_time,
            isCompleted: lesson.is_completed,
          })),
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
              daysUntilLesson = 7;
            }
            const timeUntilLesson = daysUntilLesson * 24 * 60 + lessonTime;
            if (timeUntilLesson < earliestLesson) {
              earliestLesson = timeUntilLesson;
            }
          }
          return earliestLesson;
        };
        return getNextLessonTime(a.lessons) - getNextLessonTime(b.lessons);
      });

      setStudents(sortedStudents);
    } catch (error: any) {
      toast({
        title: "Hata",
        description: "Öğrenciler yüklenemedi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayOfWeek?: number) => {
    const days = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    return dayOfWeek !== undefined ? days[dayOfWeek] : "";
  };

  const formatTime = (time?: string) => {
    if (!time) return "";
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
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

    if (
      mondayBasedLessonDay < mondayBasedCurrentDay ||
      (mondayBasedLessonDay === mondayBasedCurrentDay && lessonTime < currentTime)
    ) {
      return "past";
    } else if (mondayBasedLessonDay >= mondayBasedCurrentDay) {
      return "upcoming";
    }
    return "not-this-week";
  };

  const handleSidebarClick = (id: string) => {
    switch (id) {
      case "topics":
        setShowGlobalTopics(true);
        break;
      case "schedule":
        setShowWeeklySchedule(true);
        break;
      case "balance":
        setShowBalance(true);
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <PanelLayout
        sidebarItems={sidebarItems}
        activeItem="students"
        onItemClick={handleSidebarClick}
        title="Öğretmen Paneli"
        subtitle={`${students.length} aktif öğrenci`}
        userName={profile?.full_name}
        onLogout={signOut}
        isLoggingOut={signingOut}
        headerActions={
          <>
            <NotificationBell
              userId={profile?.user_id || ""}
              teacherId={profile?.user_id || ""}
              onNotificationClick={() => {}}
            />
            <ContactDialog />
          </>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Students List */}
          <div className="lg:col-span-4 xl:col-span-3">
            <PanelCard padding="none" className="overflow-hidden">
              <div className="p-4 border-b border-card-foreground/10">
                <PanelCardTitle icon={<Users className="w-5 h-5" />}>
                  Öğrencilerim
                </PanelCardTitle>
                <PanelCardDescription>{students.length} öğrenci kayıtlı</PanelCardDescription>
              </div>
              <div className="p-2 max-h-[calc(100vh-240px)] overflow-y-auto scrollbar-thin space-y-1">
                {students.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 mx-auto text-card-foreground/30 mb-3" />
                    <p className="text-sm text-card-foreground/60">
                      Henüz öğrenci yok.
                    </p>
                  </div>
                ) : (
                  students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        selectedStudent?.id === student.id
                          ? "bg-primary/10 ring-2 ring-primary/30"
                          : "hover:bg-card-foreground/5"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-card-foreground truncate flex-1">
                              {student.profiles.full_name}
                            </h4>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-card-foreground/50 hover:text-card-foreground flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStudentAboutData({
                                  studentId: student.student_id,
                                  studentName: student.profiles.full_name,
                                  aboutText: student.about_text,
                                });
                                setShowStudentAbout(true);
                              }}
                            >
                              <FileUser className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-card-foreground/60 truncate">{student.profiles.email}</p>

                          {student.lessons.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {student.lessons.map((lesson, index) => {
                                const status = getLessonStatus(lesson.dayOfWeek, lesson.startTime);
                                return (
                                  <div key={index} className="flex items-center gap-1.5">
                                    <Clock className="h-3 w-3 text-card-foreground/50" />
                                    <span
                                      className={`text-xs ${
                                        status === "past"
                                          ? "line-through text-card-foreground/40"
                                          : status === "upcoming"
                                          ? "font-semibold text-primary"
                                          : "text-card-foreground/60"
                                      }`}
                                    >
                                      {getDayName(lesson.dayOfWeek)} {formatTime(lesson.startTime)}-
                                      {formatTime(lesson.endTime)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </PanelCard>
          </div>

          {/* Student Topics */}
          <div className="lg:col-span-8 xl:col-span-9">
            {selectedStudent ? (
              <StudentTopics student={selectedStudent} teacherId={profile?.user_id || ""} />
            ) : (
              <PanelCard className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-card-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium text-card-foreground mb-2">Bir Öğrenci Seç</h3>
                  <p className="text-card-foreground/60">
                    Konuları görüntülemek için listeden bir öğrenci seçin
                  </p>
                </div>
              </PanelCard>
            )}
          </div>
        </div>
      </PanelLayout>

      {/* Dialogs */}
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
    </>
  );
}
