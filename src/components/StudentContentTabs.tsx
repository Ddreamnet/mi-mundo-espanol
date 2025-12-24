// ============================================================================
// ÖĞRENCİ İÇERİK TABLARI
// ============================================================================
// Bu bileşen öğretmen panelinde seçili öğrenci için Konular ve Ödevler
// arasında geçiş yapan tab sistemi sağlar.

import { useState } from "react";
import { BookOpen, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StudentTopicsContent } from "./StudentTopicsContent";
import { HomeworkSection } from "./HomeworkSection";

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
  const [activeTab, setActiveTab] = useState<string>("topics");

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex gap-2 border-b border-card-foreground/10 mb-4">
          <Button
            variant={activeTab === "topics" ? "tab-active" : "tab-inactive"}
            className="rounded-b-none flex items-center gap-2"
            onClick={() => setActiveTab("topics")}
          >
            <BookOpen className="h-4 w-4" />
            Konular
          </Button>
          <Button
            variant={activeTab === "homework" ? "tab-active" : "tab-inactive"}
            className="rounded-b-none flex items-center gap-2"
            onClick={() => setActiveTab("homework")}
          >
            <ClipboardList className="h-4 w-4" />
            Ödevler
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
      </CardContent>
    </Card>
  );
}
