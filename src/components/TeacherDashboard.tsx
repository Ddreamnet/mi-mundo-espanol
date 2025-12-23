import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, LogOut, Clock, Wallet, Calendar, FileUser, ChevronRight } from "lucide-react";
import { StudentTopics } from "./StudentTopics";
import { Header } from "./Header";
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
  const [studentAboutData, setStudentAboutData] = useState<{
    studentId: string;
    studentName: string;
    aboutText: string | null;
  } | null>(null);
  const { profile, signOut, signingOut } = useAuth();
  const { toast } = useToast();

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
    const days = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
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
    const [hours, minutes] = startTime.split(":").map(Number);
    const lessonTime = hours * 60 + minutes;

    if (
      mondayBasedLessonDay < mondayBasedCurrentDay ||
      (mondayBasedLessonDay === mondayBasedCurrentDay && lessonTime < currentTime)
    ) {
      return "past";
    }
    return "upcoming";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header
        rightActions={
          <>
            <NotificationBell
              userId={profile?.user_id || ""}
              teacherId={profile?.user_id || ""}
              onNotificationClick={() => {}}
            />
            <Button onClick={() => setShowGlobalTopics(true)} variant="ghost" size="sm">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Konular</span>
            </Button>
            <ContactDialog />
            <Button onClick={signOut} variant="ghost" size="sm" disabled={signingOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{signingOut ? "..." : "Çıkış"}</span>
            </Button>
          </>
        }
      >
        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-semibold text-header-foreground">
            Öğretmen Paneli
          </h1>
        </div>
      </Header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Quick Actions Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowWeeklySchedule(true)}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Haftalık Program
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowBalance(true)}
            className="flex items-center gap-2"
          >
            <Wallet className="h-4 w-4" />
            Bakiye
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Students List - Left Column */}
          <div className="lg:col-span-4 xl:col-span-3">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Öğrencilerim
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {students.length} öğrenci
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 pt-0">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Henüz öğrenci yok.
                  </p>
                ) : (
                  students.map((student) => {
                    const isSelected = selectedStudent?.id === student.id;
                    const nextLesson = student.lessons[0];

                    return (
                      <div
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className={`
                          group relative p-3 rounded-lg cursor-pointer transition-all
                          ${isSelected
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-sm truncate ${
                              isSelected ? "text-primary-foreground" : "text-card-foreground"
                            }`}>
                              {student.profiles.full_name}
                            </h4>
                            {nextLesson && (
                              <div className={`flex items-center gap-1 mt-1 ${
                                isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                              }`}>
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">
                                  {getDayName(nextLesson.dayOfWeek)} {formatTime(nextLesson.startTime)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className={`h-7 w-7 ${
                                isSelected 
                                  ? "text-primary-foreground hover:bg-primary-foreground/20" 
                                  : "text-muted-foreground hover:text-card-foreground"
                              }`}
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
                              <FileUser className="h-3.5 w-3.5" />
                            </Button>
                            <ChevronRight className={`h-4 w-4 ${
                              isSelected ? "text-primary-foreground/60" : "text-muted-foreground/50"
                            }`} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Student Topics - Right Column */}
          <div className="lg:col-span-8 xl:col-span-9">
            {selectedStudent ? (
              <StudentTopics student={selectedStudent} teacherId={profile?.user_id || ""} />
            ) : (
              <Card className="h-80 flex items-center justify-center">
                <div className="text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-card-foreground mb-1">Öğrenci Seçin</h3>
                  <p className="text-sm text-muted-foreground">
                    Konuları görüntülemek için listeden bir öğrenci seçin
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <GlobalTopicsManager
        open={showGlobalTopics}
        onOpenChange={setShowGlobalTopics}
        isAdmin={false}
      />
      <WeeklyScheduleDialog
        open={showWeeklySchedule}
        onOpenChange={setShowWeeklySchedule}
        teacherId={profile?.user_id || ""}
      />
      <TeacherBalanceDialog
        open={showBalance}
        onOpenChange={setShowBalance}
        teacherId={profile?.user_id || ""}
      />
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
    </div>
  );
}
