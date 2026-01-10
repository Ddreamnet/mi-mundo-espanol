// ============================================================================
// ÖDEV BÖLÜMÜ
// ============================================================================
// Bu bileşen öğretmen ve öğrenci ödevlerini listeler ve yeni ödev yükleme sağlar.

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calendar, Download, FileImage, File, Edit2, Trash2, Upload, FolderOpen, Link as LinkIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { tr, enUS, es } from "date-fns/locale";
import { EditHomeworkDialog } from "./EditHomeworkDialog";
import { UploadHomeworkDialog } from "./UploadHomeworkDialog";
import { useLanguage } from "@/contexts/LanguageContext";

// ============================================================================
// TİPLER
// ============================================================================

interface HomeworkSectionProps {
  studentId: string;
  teacherId: string;
  currentUserId: string;
  uploadedByUserId: string;
  isTeacher?: boolean;
}

interface Homework {
  id: string;
  student_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_name: string;
  created_at: string;
  uploaded_by_user_id: string;
  batch_id: string;
}

interface GroupedHomework {
  batch_id: string;
  title: string;
  description: string | null;
  created_at: string;
  uploaded_by_user_id: string;
  student_id: string;
  files: {
    id: string;
    file_url: string;
    file_type: string;
    file_name: string;
  }[];
}

const localeMap = { tr, en: enUS, es };

// ============================================================================
// ANA BİLEŞEN
// ============================================================================

export function HomeworkSection({ 
  studentId, 
  teacherId,
  currentUserId,
  uploadedByUserId,
  isTeacher = false 
}: HomeworkSectionProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [groupedHomeworks, setGroupedHomeworks] = useState<GroupedHomework[]>([]);
  const [loading, setLoading] = useState(true);
  const [editHomework, setEditHomework] = useState<Homework | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchHomeworks();
  }, [studentId, teacherId]);

  // ============================================================================
  // VERİ ÇEKME FONKSİYONLARI
  // ============================================================================

  const fetchHomeworks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setHomeworks(data || []);

      // Group homeworks by batch_id
      const grouped: { [key: string]: GroupedHomework } = {};
      
      (data || []).forEach((hw: Homework) => {
        if (!grouped[hw.batch_id]) {
          grouped[hw.batch_id] = {
            batch_id: hw.batch_id,
            title: hw.title,
            description: hw.description,
            created_at: hw.created_at,
            uploaded_by_user_id: hw.uploaded_by_user_id,
            student_id: hw.student_id,
            files: [],
          };
        }
        grouped[hw.batch_id].files.push({
          id: hw.id,
          file_url: hw.file_url,
          file_type: hw.file_type,
          file_name: hw.file_name,
        });
      });

      // Sort by created_at descending
      const sortedGroups = Object.values(grouped).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setGroupedHomeworks(sortedGroups);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("common.homeworkLoadError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // YARDIMCI FONKSİYONLAR
  // ============================================================================

  const isLink = (fileType: string) => fileType === "link";

  const getFileIcon = (fileType: string) => {
    if (isLink(fileType)) {
      return <LinkIcon className="h-5 w-5" />;
    } else if (fileType.startsWith('image/')) {
      return <FileImage className="h-5 w-5" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5" />;
    } else {
      return <File className="h-5 w-5" />;
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      // Extract file path - handle both old format (full URL) and new format (path only)
      let filePath: string;
      if (fileUrl.includes('/homework-files/')) {
        const urlParts = fileUrl.split('/homework-files/');
        if (urlParts.length < 2) {
          throw new Error("Invalid file URL");
        }
        filePath = decodeURIComponent(urlParts[1]);
      } else if (fileUrl.startsWith('homework-files/')) {
        filePath = fileUrl.replace('homework-files/', '');
      } else {
        throw new Error("Invalid file URL format");
      }

      const { data, error } = await supabase.storage
        .from('homework-files')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        title: t("common.error"),
        description: t("common.fileDownloadError"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (batchId: string) => {
    try {
      const batchHomeworks = homeworks.filter(h => h.batch_id === batchId);
      
      // Handle both old format (full URL) and new format (path only)
      const filePaths = batchHomeworks
        .map(h => {
          if (h.file_url.includes('/homework-files/')) {
            return h.file_url.split('/homework-files/')[1];
          } else if (h.file_url.startsWith('homework-files/')) {
            return h.file_url.replace('homework-files/', '');
          }
          return null;
        })
        .filter(Boolean)
        .map(path => decodeURIComponent(path as string));
      
      if (filePaths.length > 0) {
        await supabase.storage.from('homework-files').remove(filePaths);
      }

      const { error } = await supabase
        .from('homework_submissions')
        .delete()
        .eq('batch_id', batchId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("common.homeworkDeleted"),
      });

      fetchHomeworks();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("common.homeworkDeleteError"),
        variant: "destructive",
      });
    }
  };

  const canEdit = (group: GroupedHomework) => {
    return group.uploaded_by_user_id === currentUserId;
  };

  const isUploadedByStudent = (group: GroupedHomework) => {
    return group.uploaded_by_user_id === group.student_id;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Upload Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("dashboard.student.homework")}</h3>
          <p className="text-sm text-muted-foreground">
            {groupedHomeworks.length} {t("common.homeworkCount")}
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          {t("common.upload")}
        </Button>
      </div>

      {/* Homework List */}
      {groupedHomeworks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 opacity-50 mb-4" />
            <p className="text-muted-foreground">{t("common.noHomeworkYet")}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t("common.uploadFirstHomework")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedHomeworks.map((group) => {
            const uploadedByStudent = isUploadedByStudent(group);
            const borderClass = uploadedByStudent 
              ? "border-l-4 border-l-primary" 
              : "border-l-4 border-l-muted-foreground/30";
            
            return (
              <Card key={group.batch_id} className={borderClass}>
                <CardContent className="p-4 relative pb-10">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1">{group.title}</h4>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {group.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(group.created_at), "dd MMM yyyy HH:mm", { locale: localeMap[language] || tr })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit(group) && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              const firstFile = homeworks.find(h => h.batch_id === group.batch_id);
                              if (firstFile) setEditHomework(firstFile);
                            }}
                            title={t("common.edit")}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                title={t("common.delete")}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("common.deleteHomework")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("common.deleteHomeworkConfirm")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(group.batch_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t("common.delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Files list */}
                  <div className="space-y-2">
                    {group.files.map((file) => {
                      const fileIsLink = isLink(file.file_type);
                      const displayName = fileIsLink 
                        ? (file.file_name.length > 50 ? file.file_name.substring(0, 50) + "..." : file.file_name)
                        : (file.file_name.length > 40 ? file.file_name.substring(0, 40) + "..." : file.file_name);
                      
                      return (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 bg-secondary/30 p-2 rounded border min-w-0"
                        >
                          <div className="shrink-0">{getFileIcon(file.file_type)}</div>
                          <span className="text-sm flex-1 truncate min-w-0" title={file.file_name}>
                            {displayName}
                          </span>
                          {fileIsLink ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(file.file_url, '_blank', 'noopener,noreferrer')}
                              title={t("common.openLink")}
                              className="shrink-0"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(file.file_url, file.file_name)}
                              title={t("common.download")}
                              className="shrink-0"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Badge 
                    variant="outline" 
                    className={`absolute bottom-2 right-2 text-xs ${uploadedByStudent ? "bg-primary/10 border-primary" : ""}`}
                  >
                    {uploadedByStudent ? t("common.byStudent") : t("common.byTeacher")}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <UploadHomeworkDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        studentId={studentId}
        teacherId={teacherId}
        uploadedByUserId={uploadedByUserId}
        onSuccess={() => {
          toast({
            title: t("common.success"),
            description: t("common.homeworkUploaded"),
          });
          fetchHomeworks();
        }}
      />

      {editHomework && (
        <EditHomeworkDialog
          open={!!editHomework}
          onOpenChange={(open) => !open && setEditHomework(null)}
          homeworkId={editHomework.id}
          batchId={editHomework.batch_id}
          currentTitle={editHomework.title}
          currentDescription={editHomework.description}
          onSuccess={fetchHomeworks}
        />
      )}
    </div>
  );
}
