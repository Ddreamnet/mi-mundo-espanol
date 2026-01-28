// ============================================================================
// ÖĞRENCİ İÇERİK TABLARI
// ============================================================================
// Bu bileşen öğretmen panelinde seçili öğrenci için Konular, Ödevler ve
// Ders Notları arasında geçiş yapan tab sistemi sağlar.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, ClipboardList, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StudentTopicsContent } from "./StudentTopicsContent";
import { HomeworkSection } from "./HomeworkSection";
import { LessonNotesSection } from "./LessonNotesSection";

// ============================================================================
// TİPLER
// ============================================================================

interface Student {
  id: string;
  student_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface StudentContentTabsProps {
  student: Student;
  teacherId: string;
}

// ============================================================================
// ANA BİLEŞEN
// ============================================================================

export function StudentContentTabs({ student, teacherId }: StudentContentTabsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("topics");

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex gap-2 border-b border-card-foreground/10 mb-4 overflow-x-auto pb-px">
          <Button
            variant={activeTab === "topics" ? "tab-active" : "tab-inactive"}
            className="rounded-b-none flex items-center gap-2 shrink-0"
            onClick={() => setActiveTab("topics")}
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboard.student.topics")}</span>
            <span className="sm:hidden">Konular</span>
          </Button>
          <Button
            variant={activeTab === "homework" ? "tab-active" : "tab-inactive"}
            className="rounded-b-none flex items-center gap-2 shrink-0"
            onClick={() => setActiveTab("homework")}
          >
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboard.student.homework")}</span>
            <span className="sm:hidden">Ödevler</span>
          </Button>
          <Button
            variant={activeTab === "notes" ? "tab-active" : "tab-inactive"}
            className="rounded-b-none flex items-center gap-2 shrink-0"
            onClick={() => setActiveTab("notes")}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t("lessonNotes.tabTitle")}</span>
            <span className="sm:hidden">Notlar</span>
          </Button>
        </div>
        
        {activeTab === "topics" && (
          <StudentTopicsContent student={student} teacherId={teacherId} />
        )}
        
        {activeTab === "homework" && (
          <HomeworkSection 
            studentId={student.student_id}
            teacherId={teacherId}
            currentUserId={teacherId}
            uploadedByUserId={teacherId}
            isTeacher={true}
          />
        )}

        {activeTab === "notes" && (
          <LessonNotesSection 
            studentId={student.student_id}
            teacherId={teacherId}
            isTeacher={true}
          />
        )}
      </CardContent>
    </Card>
  );
}
