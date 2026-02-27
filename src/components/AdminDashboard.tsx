import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Users, LogOut, FolderOpen, LayoutDashboard } from "lucide-react";
import { Header } from "./Header";
import { AdminNotificationBell } from "./AdminNotificationBell";
import { AdminWeeklySchedule } from "./AdminWeeklySchedule";
import { AdminBalanceManager } from "./AdminBalanceManager";
import { AdminTeachersList } from "./admin/AdminTeachersList";
import { AdminStudentsTab } from "./admin/AdminStudentsTab";
import { AdminDialogs } from "./admin/AdminDialogs";
import { useAdminData } from "@/hooks/useAdminData";
import { useTopicManagement } from "@/hooks/useTopicManagement";
import { LoadingSpinner } from "./shared/LoadingSpinner";

export function AdminDashboard() {
  const { t } = useTranslation();
  const { profile, signOut, signingOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"students" | "schedule" | "payments">("students");
  const [showGlobalTopics, setShowGlobalTopics] = useState(false);
  const [showPagesManager, setShowPagesManager] = useState(false);

  const adminData = useAdminData();
  const topicMgmt = useTopicManagement({
    selectedTeacher: adminData.selectedTeacher,
    profileUserId: profile?.user_id,
  });

  // When toggling a student, also fetch topics if needed
  const handleToggleStudent = async (studentId: string, student: any) => {
    adminData.toggleStudent(studentId);
    if (!adminData.expandedStudents.has(studentId)) {
      if (!topicMgmt.studentTopics.has(studentId)) {
        await topicMgmt.fetchStudentTopics(student.student_id, studentId);
      }
    }
  };

  if (adminData.loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="min-h-screen bg-background" data-area="dashboard" data-dashboard="admin">
      <Header
        rightActions={
          <>
            <AdminNotificationBell adminId={profile?.user_id || ""} />
            <Button onClick={() => setShowPagesManager(true)} variant="outline" size="sm">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{t("dashboard.admin.pages")}</span>
            </Button>
            <Button onClick={() => setShowGlobalTopics(true)} variant="outline" size="sm">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{t("dashboard.admin.topics")}</span>
            </Button>
            <Button onClick={signOut} variant="outline" size="sm" disabled={signingOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{signingOut ? t("auth.signingOut") : t("auth.signOut")}</span>
            </Button>
          </>
        }
      >
        <div className="text-center text-card-foreground">
          <h1 className="text-xl sm:text-2xl font-bold text-card-foreground">{t("dashboard.admin.title")}</h1>
          <p className="text-sm sm:text-lg text-card-foreground/70 hidden sm:block">{t("dashboard.admin.welcome")}, {profile?.full_name}</p>
        </div>
      </Header>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teachers List */}
          <div className="lg:col-span-1">
            <AdminTeachersList
              teachers={adminData.teachers}
              selectedTeacherId={adminData.selectedTeacher?.user_id}
              onSelectTeacher={adminData.setSelectedTeacher}
              onCreateTeacher={() => adminData.setShowCreateTeacher(true)}
              onTeacherSettings={adminData.openTeacherSettings}
            />
          </div>

          {/* Teacher Details */}
          <div className="lg:col-span-2">
            {adminData.selectedTeacher ? (
              <Card>
                <CardHeader>
                  <CardTitle>{adminData.selectedTeacher.full_name}</CardTitle>
                  <CardDescription>{adminData.selectedTeacher.email}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 border-b mb-4">
                    <Button variant={activeTab === "students" ? "tab-active" : "tab-inactive"} className="rounded-b-none" onClick={() => setActiveTab("students")}>
                      {t("dashboard.admin.students")}
                    </Button>
                    <Button variant={activeTab === "schedule" ? "tab-active" : "tab-inactive"} className="rounded-b-none" onClick={() => setActiveTab("schedule")}>
                      {t("dashboard.admin.schedule")}
                    </Button>
                    <Button variant={activeTab === "payments" ? "tab-active" : "tab-inactive"} className="rounded-b-none" onClick={() => setActiveTab("payments")}>
                      {t("dashboard.admin.payments")}
                    </Button>
                  </div>

                  {activeTab === "students" && (
                    <AdminStudentsTab
                      students={adminData.selectedTeacher.students}
                      expandedStudents={adminData.expandedStudents}
                      studentTopics={topicMgmt.studentTopics}
                      studentCompletedTopics={topicMgmt.studentCompletedTopics}
                      onToggleStudent={handleToggleStudent}
                      onOpenStudentSettings={adminData.openStudentSettings}
                      onShowCreateStudent={() => adminData.setShowCreateStudent(true)}
                      onShowStudentAbout={(student) => {
                        adminData.setStudentAboutData({
                          studentId: student.student_id,
                          studentName: student.profiles.full_name,
                          aboutText: student.about_text,
                        });
                        adminData.setShowStudentAbout(true);
                      }}
                      onRestoreStudent={adminData.handleRestoreStudent}
                      onAddTopic={(studentId) => {
                        topicMgmt.setSelectedStudentForTopic(studentId);
                        topicMgmt.setShowAddTopic(true);
                      }}
                      onAddResource={(topicId) => {
                        topicMgmt.setSelectedTopicForResource(topicId);
                        topicMgmt.setShowAddResource(true);
                      }}
                      onEditTopic={(topic) => {
                        topicMgmt.setEditingTopic(topic);
                        topicMgmt.setShowEditTopic(true);
                      }}
                      onEditResource={(resource) => {
                        topicMgmt.setEditingResource(resource);
                        topicMgmt.setShowEditResource(true);
                      }}
                      onDeleteTopic={topicMgmt.handleDeleteTopic}
                      onDeleteResource={topicMgmt.handleDeleteResource}
                    />
                  )}

                  {activeTab === "schedule" && <AdminWeeklySchedule teacherId={adminData.selectedTeacher.user_id} />}
                  {activeTab === "payments" && <AdminBalanceManager teacherId={adminData.selectedTeacher.user_id} />}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t("dashboard.admin.selectTeacher")}</h3>
                  <p className="text-muted-foreground">{t("dashboard.admin.selectTeacherDesc")}</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AdminDialogs
        showGlobalTopics={showGlobalTopics}
        setShowGlobalTopics={setShowGlobalTopics}
        showPagesManager={showPagesManager}
        setShowPagesManager={setShowPagesManager}
        showCreateTeacher={adminData.showCreateTeacher}
        setShowCreateTeacher={adminData.setShowCreateTeacher}
        showEditTeacher={adminData.showEditTeacher}
        setShowEditTeacher={adminData.setShowEditTeacher}
        editingTeacher={adminData.editingTeacher}
        showCreateStudent={adminData.showCreateStudent}
        setShowCreateStudent={adminData.setShowCreateStudent}
        showEditStudent={adminData.showEditStudent}
        setShowEditStudent={adminData.setShowEditStudent}
        editingStudent={adminData.editingStudent}
        selectedTeacher={adminData.selectedTeacher}
        showAddTopic={topicMgmt.showAddTopic}
        setShowAddTopic={topicMgmt.setShowAddTopic}
        showAddResource={topicMgmt.showAddResource}
        setShowAddResource={topicMgmt.setShowAddResource}
        showEditTopic={topicMgmt.showEditTopic}
        setShowEditTopic={topicMgmt.setShowEditTopic}
        showEditResource={topicMgmt.showEditResource}
        setShowEditResource={topicMgmt.setShowEditResource}
        editingTopic={topicMgmt.editingTopic}
        editingResource={topicMgmt.editingResource}
        showStudentAbout={adminData.showStudentAbout}
        setShowStudentAbout={adminData.setShowStudentAbout}
        studentAboutData={adminData.studentAboutData}
        setStudentAboutData={adminData.setStudentAboutData}
        onTeachersRefresh={adminData.fetchTeachers}
        onAddTopic={topicMgmt.handleAddTopic}
        onAddResource={topicMgmt.handleAddResource}
        onEditTopic={topicMgmt.handleEditTopic}
        onEditResource={topicMgmt.handleEditResource}
      />
    </div>
  );
}
