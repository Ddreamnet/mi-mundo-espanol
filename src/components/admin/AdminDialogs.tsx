import { GlobalTopicsManager } from "@/components/GlobalTopicsManager";
import { CreateStudentDialog } from "@/components/CreateStudentDialog";
import { CreateTeacherDialog } from "@/components/CreateTeacherDialog";
import { EditStudentDialog } from "@/components/EditStudentDialog";
import { EditTeacherDialog } from "@/components/EditTeacherDialog";
import { AddTopicDialog } from "@/components/AddTopicDialog";
import { AddResourceDialog } from "@/components/AddResourceDialog";
import { EditTopicDialog } from "@/components/EditTopicDialog";
import { EditResourceDialog } from "@/components/EditResourceDialog";
import { StudentAboutDialog } from "@/components/StudentAboutDialog";
import { PagesManagerDialog } from "@/components/admin/PagesManagerDialog";
import type { AdminStudent, Teacher, Topic, Resource } from "@/types/dashboard";

interface AdminDialogsProps {
  // Global topics
  showGlobalTopics: boolean;
  setShowGlobalTopics: (v: boolean) => void;
  // Pages manager
  showPagesManager: boolean;
  setShowPagesManager: (v: boolean) => void;
  // Teacher dialogs
  showCreateTeacher: boolean;
  setShowCreateTeacher: (v: boolean) => void;
  showEditTeacher: boolean;
  setShowEditTeacher: (v: boolean) => void;
  editingTeacher: Teacher | null;
  // Student dialogs
  showCreateStudent: boolean;
  setShowCreateStudent: (v: boolean) => void;
  showEditStudent: boolean;
  setShowEditStudent: (v: boolean) => void;
  editingStudent: AdminStudent | null;
  selectedTeacher: Teacher | null;
  // Topic/Resource dialogs
  showAddTopic: boolean;
  setShowAddTopic: (v: boolean) => void;
  showAddResource: boolean;
  setShowAddResource: (v: boolean) => void;
  showEditTopic: boolean;
  setShowEditTopic: (v: boolean) => void;
  showEditResource: boolean;
  setShowEditResource: (v: boolean) => void;
  editingTopic: Topic | null;
  editingResource: Resource | null;
  // Student about
  showStudentAbout: boolean;
  setShowStudentAbout: (v: boolean) => void;
  studentAboutData: { studentId: string; studentName: string; aboutText: string | null } | null;
  setStudentAboutData: (v: any) => void;
  // Handlers
  onTeachersRefresh: () => void;
  onAddTopic: (title: string, description: string) => Promise<void>;
  onAddResource: (title: string, description: string, resourceType: string, resourceUrl: string) => Promise<void>;
  onEditTopic: (id: string, title: string, description: string) => Promise<void>;
  onEditResource: (id: string, title: string, description: string, resourceType: string, resourceUrl: string) => Promise<void>;
}

export function AdminDialogs(props: AdminDialogsProps) {
  return (
    <>
      <GlobalTopicsManager open={props.showGlobalTopics} onOpenChange={props.setShowGlobalTopics} isAdmin={true} />

      <CreateTeacherDialog
        open={props.showCreateTeacher}
        onOpenChange={props.setShowCreateTeacher}
        onSuccess={props.onTeachersRefresh}
      />

      {props.editingTeacher && (
        <EditTeacherDialog
          open={props.showEditTeacher}
          onOpenChange={props.setShowEditTeacher}
          onTeacherUpdated={props.onTeachersRefresh}
          teacherId={props.editingTeacher.user_id}
          currentName={props.editingTeacher.full_name}
        />
      )}

      {props.selectedTeacher && (
        <>
          <CreateStudentDialog
            open={props.showCreateStudent}
            onOpenChange={props.setShowCreateStudent}
            onStudentCreated={props.onTeachersRefresh}
            teacherId={props.selectedTeacher.user_id}
          />
          {props.editingStudent && (
            <EditStudentDialog
              open={props.showEditStudent}
              onOpenChange={props.setShowEditStudent}
              onStudentUpdated={props.onTeachersRefresh}
              studentId={props.editingStudent.id}
              currentName={props.editingStudent.profiles.full_name}
              currentLessons={props.editingStudent.lessons}
            />
          )}
        </>
      )}

      <AddTopicDialog open={props.showAddTopic} onOpenChange={props.setShowAddTopic} onAddTopic={props.onAddTopic} />
      <AddResourceDialog open={props.showAddResource} onOpenChange={props.setShowAddResource} onAddResource={props.onAddResource} />
      <EditTopicDialog open={props.showEditTopic} onOpenChange={props.setShowEditTopic} onEditTopic={props.onEditTopic} topic={props.editingTopic} />
      <EditResourceDialog open={props.showEditResource} onOpenChange={props.setShowEditResource} onEditResource={props.onEditResource} resource={props.editingResource} />

      {props.studentAboutData && (
        <StudentAboutDialog
          key={props.studentAboutData.studentId}
          open={props.showStudentAbout}
          onOpenChange={(open) => {
            props.setShowStudentAbout(open);
            if (!open) props.setStudentAboutData(null);
          }}
          studentId={props.studentAboutData.studentId}
          studentName={props.studentAboutData.studentName}
          aboutText={props.studentAboutData.aboutText}
          isReadOnly={false}
          onSaved={async () => {
            await props.onTeachersRefresh();
            props.setStudentAboutData(null);
          }}
        />
      )}

      <PagesManagerDialog open={props.showPagesManager} onOpenChange={props.setShowPagesManager} />
    </>
  );
}
