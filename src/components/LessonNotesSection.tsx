// ============================================================================
// DERS NOTLARI BÖLÜMÜ
// ============================================================================
// Bu bileşen öğretmenlerin ders notlarını yüklemesini ve öğrencilerin
// bu notları görüntülemesini sağlar.

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Calendar, Download, FileImage, File, Edit2, Trash2, Upload, FolderOpen, Link as LinkIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { tr, enUS, es } from "date-fns/locale";
import { UploadLessonNoteDialog } from "./UploadLessonNoteDialog";
import { EditLessonNoteDialog } from "./EditLessonNoteDialog";
import { useLanguage } from "@/contexts/LanguageContext";

// ============================================================================
// TİPLER
// ============================================================================

interface LessonNotesSectionProps {
  studentId: string;
  teacherId: string;
  isTeacher?: boolean;
}

interface LessonNote {
  id: string;
  student_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_name: string;
  created_at: string;
  batch_id: string;
}

interface GroupedNote {
  batch_id: string;
  title: string;
  description: string | null;
  created_at: string;
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

export function LessonNotesSection({ 
  studentId, 
  teacherId,
  isTeacher = false 
}: LessonNotesSectionProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [groupedNotes, setGroupedNotes] = useState<GroupedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editNote, setEditNote] = useState<LessonNote | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchNotes();
  }, [studentId, teacherId]);

  // ============================================================================
  // VERİ ÇEKME FONKSİYONLARI
  // ============================================================================

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lesson_notes')
        .select('*')
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotes(data || []);

      // Group notes by batch_id
      const grouped: { [key: string]: GroupedNote } = {};
      
      (data || []).forEach((note: LessonNote) => {
        if (!grouped[note.batch_id]) {
          grouped[note.batch_id] = {
            batch_id: note.batch_id,
            title: note.title,
            description: note.description,
            created_at: note.created_at,
            files: [],
          };
        }
        grouped[note.batch_id].files.push({
          id: note.id,
          file_url: note.file_url,
          file_type: note.file_type,
          file_name: note.file_name,
        });
      });

      // Sort by created_at descending
      const sortedGroups = Object.values(grouped).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setGroupedNotes(sortedGroups);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("lessonNotes.loadError"),
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
      if (fileUrl.includes('/lesson-notes/')) {
        const urlParts = fileUrl.split('/lesson-notes/');
        if (urlParts.length < 2) {
          throw new Error("Invalid file URL");
        }
        filePath = decodeURIComponent(urlParts[1]);
      } else if (fileUrl.startsWith('lesson-notes/')) {
        filePath = fileUrl.replace('lesson-notes/', '');
      } else {
        throw new Error("Invalid file URL format");
      }

      const { data, error } = await supabase.storage
        .from('lesson-notes')
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
      const batchNotes = notes.filter(n => n.batch_id === batchId);
      
      // Handle both old format (full URL) and new format (path only)
      const filePaths = batchNotes
        .filter(n => n.file_type !== "link")
        .map(n => {
          if (n.file_url.includes('/lesson-notes/')) {
            return n.file_url.split('/lesson-notes/')[1];
          } else if (n.file_url.startsWith('lesson-notes/')) {
            return n.file_url.replace('lesson-notes/', '');
          }
          return null;
        })
        .filter(Boolean)
        .map(path => decodeURIComponent(path as string));
      
      if (filePaths.length > 0) {
        await supabase.storage.from('lesson-notes').remove(filePaths);
      }

      const { error } = await supabase
        .from('lesson_notes')
        .delete()
        .eq('batch_id', batchId);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: t("lessonNotes.deleted"),
      });

      fetchNotes();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: t("lessonNotes.deleteError"),
        variant: "destructive",
      });
    }
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
      {/* Header with Upload Button (only for teachers) */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("lessonNotes.title")}</h3>
          <p className="text-sm text-muted-foreground">
            {groupedNotes.length} {t("lessonNotes.count")}
          </p>
        </div>
        {isTeacher && (
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t("common.upload")}
          </Button>
        )}
      </div>

      {/* Notes List */}
      {groupedNotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 opacity-50 mb-4" />
            <p className="text-muted-foreground">{t("lessonNotes.noNotes")}</p>
            {isTeacher && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                {t("lessonNotes.uploadFirst")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedNotes.map((group) => (
            <Card key={group.batch_id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
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
                  {isTeacher && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const firstFile = notes.find(n => n.batch_id === group.batch_id);
                          if (firstFile) setEditNote(firstFile);
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
                            <AlertDialogTitle>{t("lessonNotes.deleteTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("lessonNotes.deleteConfirm")}
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
                    </div>
                  )}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs (only for teachers) */}
      {isTeacher && (
        <>
          <UploadLessonNoteDialog
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            studentId={studentId}
            teacherId={teacherId}
            onSuccess={() => {
              toast({
                title: t("common.success"),
                description: t("lessonNotes.uploaded"),
              });
              fetchNotes();
            }}
          />

          {editNote && (
            <EditLessonNoteDialog
              open={!!editNote}
              onOpenChange={(open) => !open && setEditNote(null)}
              noteId={editNote.id}
              batchId={editNote.batch_id}
              currentTitle={editNote.title}
              currentDescription={editNote.description}
              onSuccess={fetchNotes}
            />
          )}
        </>
      )}
    </div>
  );
}
