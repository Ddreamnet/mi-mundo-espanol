// ============================================================================
// ÖĞRENCİ İÇERİK TABLARI
// ============================================================================
// Bu bileşen öğretmen panelinde seçili öğrenci için Konular ve Ödevler
// arasında geçiş yapan tab sistemi sağlar.

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, ClipboardList } from "lucide-react";
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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="topics" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Konular
        </TabsTrigger>
        <TabsTrigger value="homework" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Ödevler
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="topics" className="mt-0">
        <StudentTopicsContent student={student} teacherId={teacherId} />
      </TabsContent>
      
      <TabsContent value="homework" className="mt-0">
        <HomeworkSection 
          studentId={student.student_id}
          teacherId={teacherId}
          currentUserId={teacherId}
          uploadedByUserId={teacherId}
          isTeacher={true}
        />
      </TabsContent>
    </Tabs>
  );
}
