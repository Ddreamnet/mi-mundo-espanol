import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Settings, Clock, Plus, Trash2, UserPlus, Archive, RotateCcw, FileUser } from "lucide-react";
import { getResourceIcon } from "@/utils/resourceIcons";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatTime as formatTimeUtil, getLocale } from "@/utils/lessonDateUtils";
import type { AdminStudent, Topic } from "@/types/dashboard";

interface AdminStudentsTabProps {
  students: AdminStudent[];
  expandedStudents: Set<string>;
  studentTopics: Map<string, Topic[]>;
  studentCompletedTopics: Map<string, Topic[]>;
  onToggleStudent: (studentId: string, student: AdminStudent) => void;
  onOpenStudentSettings: (student: AdminStudent) => void;
  onShowCreateStudent: () => void;
  onShowStudentAbout: (student: AdminStudent) => void;
  onRestoreStudent: (studentId: string) => void;
  onAddTopic: (studentId: string) => void;
  onAddResource: (topicId: string) => void;
  onEditTopic: (topic: Topic) => void;
  onEditResource: (resource: any) => void;
  onDeleteTopic: (topicId: string, studentId: string, studentUserId: string) => void;
  onDeleteResource: (resourceId: string, studentId: string, studentUserId: string) => void;
}

export function AdminStudentsTab({
  students,
  expandedStudents,
  studentTopics,
  studentCompletedTopics,
  onToggleStudent,
  onOpenStudentSettings,
  onShowCreateStudent,
  onShowStudentAbout,
  onRestoreStudent,
  onAddTopic,
  onAddResource,
  onEditTopic,
  onEditResource,
  onDeleteTopic,
  onDeleteResource,
}: AdminStudentsTabProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const daysOfWeek = [
    t("days.sunday"), t("days.monday"), t("days.tuesday"), t("days.wednesday"),
    t("days.thursday"), t("days.friday"), t("days.saturday"),
  ];

  const getDayName = (dayOfWeek?: number) => (dayOfWeek !== undefined ? daysOfWeek[dayOfWeek] : "");
  const formatTime = (time?: string) => (time ? formatTimeUtil(time, getLocale(language)) : "");

  const activeStudents = students.filter((s) => !s.is_archived);
  const archivedStudents = students.filter((s) => s.is_archived);

  return (
    <div className="space-y-3">
      <div className="flex justify-end mb-3">
        <Button onClick={onShowCreateStudent} size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          {t("dashboard.admin.createStudent")}
        </Button>
      </div>

      {activeStudents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t("dashboard.admin.noActiveStudents")}
        </p>
      ) : (
        activeStudents.map((student) => (
          <Card key={student.id} className="border">
            <Collapsible>
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <CollapsibleTrigger
                    className="flex items-center gap-2 flex-1 text-left"
                    onClick={() => onToggleStudent(student.id, student)}
                  >
                    {expandedStudents.has(student.id) ? (
                      <ChevronDown className="h-4 w-4 text-card-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-card-foreground" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-card-foreground">{student.profiles.full_name}</h4>
                      <p className="text-sm text-card-foreground/70">{student.profiles.email}</p>
                      {student.lessons.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {student.lessons.slice(0, 2).map((lesson, index) => (
                            <div key={index} className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-card-foreground/50" />
                              <span className="text-xs text-card-foreground/70">
                                {getDayName(lesson.dayOfWeek)} {formatTime(lesson.startTime)}-{formatTime(lesson.endTime)}
                              </span>
                            </div>
                          ))}
                          {student.lessons.length > 2 && (
                            <span className="text-xs text-card-foreground/70">
                              +{student.lessons.length - 2} {t("dashboard.admin.moreLessons")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleTrigger>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-card-foreground hover:text-card-foreground hover:bg-card-foreground/10"
                      onClick={(e) => { e.stopPropagation(); onShowStudentAbout(student); }}
                      title={t("dashboard.admin.aboutStudent")}
                    >
                      <FileUser className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-card-foreground hover:text-card-foreground hover:bg-card-foreground/10"
                      onClick={() => onOpenStudentSettings(student)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <CollapsibleContent className="mt-4">
                  <div className="pl-6 border-t pt-3 space-y-6">
                    {/* Processed Topics Section */}
                    <ProcessedTopicsSection
                      studentId={student.id}
                      studentCompletedTopics={studentCompletedTopics}
                      t={t}
                    />

                    {/* Student-Specific Topics CRUD */}
                    <StudentTopicsCRUD
                      student={student}
                      topics={studentTopics.get(student.id) || []}
                      onAddTopic={onAddTopic}
                      onAddResource={onAddResource}
                      onEditTopic={onEditTopic}
                      onEditResource={onEditResource}
                      onDeleteTopic={onDeleteTopic}
                      onDeleteResource={onDeleteResource}
                      t={t}
                    />
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Collapsible>
          </Card>
        ))
      )}

      {/* Archived Students */}
      {archivedStudents.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center gap-2 mb-3">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-sm text-muted-foreground">{t("dashboard.admin.archivedStudents")}</h4>
            <Badge variant="secondary" className="text-xs">{archivedStudents.length}</Badge>
          </div>
          <div className="space-y-2">
            {archivedStudents.map((student) => (
              <Card key={student.id} className="border bg-muted/30 opacity-70">
                <CardContent className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium text-sm">{student.profiles.full_name}</h4>
                        <p className="text-xs text-muted-foreground">{student.profiles.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => onRestoreStudent(student.id)}>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      {t("dashboard.admin.restore")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component: Processed Topics
function ProcessedTopicsSection({
  studentId,
  studentCompletedTopics,
  t,
}: {
  studentId: string;
  studentCompletedTopics: Map<string, Topic[]>;
  t: (key: string) => string;
}) {
  const allTopics = studentCompletedTopics.get(studentId) || [];
  const topicsWithCompletedResources = allTopics.filter((topic) => topic.resources.some((r) => r.is_completed));
  const fullyCompletedCount = topicsWithCompletedResources.filter((topic) => topic.is_completed).length;
  const totalCompletedResources = topicsWithCompletedResources.reduce(
    (sum, topic) => sum + topic.resources.filter((r) => r.is_completed).length, 0
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h5 className="font-medium text-sm">{t("dashboard.admin.processedTopics")}</h5>
        <Badge variant="secondary">
          {totalCompletedResources} {t("dashboard.admin.resourcesProcessed")} ({fullyCompletedCount} {t("dashboard.admin.topicsFull")})
        </Badge>
      </div>
      {topicsWithCompletedResources.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">{t("dashboard.admin.noProcessedResources")}</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {topicsWithCompletedResources.map((topic) => {
            const completedCount = topic.resources.filter((r) => r.is_completed).length;
            const totalCount = topic.resources.length;
            const isFullyCompleted = topic.is_completed || completedCount === totalCount;

            return (
              <Card key={topic.id} className={`border-l-4 ${isFullyCompleted ? "border-l-card-foreground/50" : "border-l-card-foreground/20"}`}>
                <Collapsible>
                  <CardContent className="p-3">
                    <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                      <Checkbox checked={isFullyCompleted} className="h-4 w-4" disabled />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{topic.title}</span>
                        {topic.isGlobal && <Badge variant="outline" className="ml-2 text-xs">Global</Badge>}
                      </div>
                      <Badge variant="secondary" className="text-xs">{completedCount}/{totalCount} {t("common.resource")}</Badge>
                      <ChevronRight className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 pl-6 space-y-1">
                      {topic.resources.filter((r) => r.is_completed).map((resource) => (
                        <div key={resource.id} className="flex items-center gap-2 py-1">
                          <Checkbox checked disabled className="h-3 w-3" />
                          {getResourceIcon(resource.resource_type)}
                          <span className="text-xs flex-1 cursor-pointer hover:text-primary" onClick={() => window.open(resource.resource_url, "_blank")}>
                            {resource.title}
                          </span>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </CardContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Sub-component: Student Topics CRUD
function StudentTopicsCRUD({
  student,
  topics,
  onAddTopic,
  onAddResource,
  onEditTopic,
  onEditResource,
  onDeleteTopic,
  onDeleteResource,
  t,
}: {
  student: AdminStudent;
  topics: Topic[];
  onAddTopic: (studentId: string) => void;
  onAddResource: (topicId: string) => void;
  onEditTopic: (topic: Topic) => void;
  onEditResource: (resource: any) => void;
  onDeleteTopic: (topicId: string, studentId: string, studentUserId: string) => void;
  onDeleteResource: (resourceId: string, studentId: string, studentUserId: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex justify-between items-center">
        <h5 className="font-medium text-sm">{t("dashboard.admin.studentSpecificTopics")}</h5>
        <Button variant="outline" size="sm" onClick={() => onAddTopic(student.id)}>
          <Plus className="h-3 w-3 mr-1" />
          {t("dashboard.admin.addTopic")}
        </Button>
      </div>
      {topics.length === 0 ? (
        <p className="text-sm opacity-70 py-2">{t("dashboard.admin.noStudentTopics")}</p>
      ) : (
        <div className="space-y-2">
          {topics.map((topic) => (
            <Card key={topic.id} className="border">
              <Collapsible>
                <CardContent className="p-2">
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger className="flex items-center gap-1">
                      <ChevronRight className="h-3 w-3" />
                    </CollapsibleTrigger>
                    <Checkbox checked={topic.is_completed} className="h-4 w-4" disabled />
                    <span className="text-sm flex-1">{topic.title}</span>
                    <Badge variant="secondary" className="text-xs">{topic.resources.length} {t("common.resource")}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => onAddResource(topic.id)}><Plus className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => onEditTopic(topic)}><Settings className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => onDeleteTopic(topic.id, student.id, student.student_id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  <CollapsibleContent className="mt-2 space-y-1">
                    {topic.resources.map((resource) => (
                      <div key={resource.id} className="flex items-center gap-2 pl-8">
                        <Checkbox checked={resource.is_completed} className="h-3 w-3" disabled />
                        {getResourceIcon(resource.resource_type)}
                        <span className="text-xs flex-1 cursor-pointer hover:text-primary" onClick={() => window.open(resource.resource_url, "_blank")}>
                          {resource.title}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => onEditResource(resource)}><Settings className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => onDeleteResource(resource.id, student.id, student.student_id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </CollapsibleContent>
                </CardContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
