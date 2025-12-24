import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface CreateTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTeacherDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTeacherDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast.error(t("dialogs.createTeacher.fillAllFields"));
      return;
    }

    if (password.length < 6) {
      toast.error(t("dialogs.createTeacher.passwordMinLength"));
      return;
    }

    setLoading(true);

    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error(t("dialogs.createTeacher.sessionNotFound"));
        return;
      }

      // Call edge function to create teacher
      const response = await supabase.functions.invoke('create-teacher', {
        body: {
          email,
          name: fullName,
          password,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || t("dialogs.createTeacher.createError"));
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success(t("dialogs.createTeacher.successMessage"));
      setFullName("");
      setEmail("");
      setPassword("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating teacher:", error);
      toast.error(error.message || t("dialogs.createTeacher.createError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogs.createTeacher.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t("dialogs.createTeacher.nameLabel")}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("dialogs.createTeacher.namePlaceholder")}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("dialogs.createTeacher.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("dialogs.createTeacher.emailPlaceholder")}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("dialogs.createTeacher.passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("dialogs.createTeacher.passwordPlaceholder")}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("dialogs.createTeacher.creating") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
