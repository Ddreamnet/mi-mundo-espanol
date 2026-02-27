import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Settings, Plus } from "lucide-react";
import type { Teacher } from "@/types/dashboard";

interface AdminTeachersListProps {
  teachers: Teacher[];
  selectedTeacherId: string | undefined;
  onSelectTeacher: (teacher: Teacher) => void;
  onCreateTeacher: () => void;
  onTeacherSettings: (teacher: Teacher) => void;
}

export function AdminTeachersList({
  teachers,
  selectedTeacherId,
  onSelectTeacher,
  onCreateTeacher,
  onTeacherSettings,
}: AdminTeachersListProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Users className="h-5 w-5" />
              {t("dashboard.admin.teachers")}
            </CardTitle>
            <CardDescription>{teachers.length} {t("dashboard.admin.teachersRegistered")}</CardDescription>
          </div>
          <Button onClick={onCreateTeacher} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t("dashboard.admin.createTeacher")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {teachers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard.admin.noTeachers")}</p>
        ) : (
          teachers.map((teacher) => (
            <Card
              key={teacher.user_id}
              className={`cursor-pointer transition-colors hover:bg-accent ${
                selectedTeacherId === teacher.user_id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => onSelectTeacher(teacher)}
            >
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-card-foreground">{teacher.full_name}</h4>
                    <p className="text-sm text-card-foreground/70">{teacher.email}</p>
                    <Badge variant="outline" className="mt-1 text-card-foreground border-card-foreground/30">
                      {teacher.students.filter((s) => !s.is_archived).length} {t("auth.student").toLowerCase()}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-card-foreground hover:text-card-foreground hover:bg-card-foreground/10"
                    onClick={(e) => { e.stopPropagation(); onTeacherSettings(teacher); }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
