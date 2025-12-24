import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle2, Calendar, Plus, Minus, RotateCcw, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr, enUS, es } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";

interface AdminBalanceManagerProps {
  teacherId: string;
}

interface BalanceData {
  total_minutes: number;
  completed_regular_lessons: number;
  completed_trial_lessons: number;
  regular_lessons_minutes: number;
  trial_lessons_minutes: number;
}

interface PaymentHistory {
  id: string;
  amount_minutes: number;
  completed_regular_lessons: number;
  completed_trial_lessons: number;
  payment_date: string;
  notes: string | null;
}

export function AdminBalanceManager({ teacherId }: AdminBalanceManagerProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [minutesToAdd, setMinutesToAdd] = useState("");
  const [minutesToSubtract, setMinutesToSubtract] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);

  const getDateLocale = () => {
    switch (language) {
      case 'en': return enUS;
      case 'es': return es;
      default: return tr;
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchPaymentHistory();
  }, [teacherId]);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("teacher_balance")
        .select("*")
        .eq("teacher_id", teacherId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBalance(data);
      } else {
        setBalance({
          total_minutes: 0,
          completed_regular_lessons: 0,
          completed_trial_lessons: 0,
          regular_lessons_minutes: 0,
          trial_lessons_minutes: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      toast.error(t("dialogs.balance.balanceLoadError"));
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("payment_date", { ascending: false });

      if (error) throw error;

      setPaymentHistory(data || []);
    } catch (error) {
      console.error("Error fetching payment history:", error);
    }
  };

  const handleAddMinutes = async () => {
    const minutes = parseInt(minutesToAdd);
    if (isNaN(minutes) || minutes <= 0) {
      toast.error(t("dialogs.balance.invalidMinutes"));
      return;
    }

    try {
      const { data: existingBalance } = await supabase
        .from("teacher_balance")
        .select("*")
        .eq("teacher_id", teacherId)
        .maybeSingle();

      if (existingBalance) {
        const { error } = await supabase
          .from("teacher_balance")
          .update({
            total_minutes: existingBalance.total_minutes + minutes,
          })
          .eq("teacher_id", teacherId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("teacher_balance").insert({
          teacher_id: teacherId,
          total_minutes: minutes,
          completed_regular_lessons: 0,
          completed_trial_lessons: 0,
          regular_lessons_minutes: 0,
          trial_lessons_minutes: 0,
        });

        if (error) throw error;
      }

      toast.success(t("dialogs.balance.minutesAdded", { minutes }));
      setMinutesToAdd("");
      fetchBalance();
    } catch (error) {
      console.error("Error adding minutes:", error);
      toast.error(t("dialogs.balance.addMinutesError"));
    }
  };

  const handleSubtractMinutes = async () => {
    const minutes = parseInt(minutesToSubtract);
    if (isNaN(minutes) || minutes <= 0) {
      toast.error(t("dialogs.balance.invalidMinutes"));
      return;
    }

    if (!balance || balance.total_minutes < minutes) {
      toast.error(t("dialogs.balance.insufficientBalance"));
      return;
    }

    try {
      const { error } = await supabase
        .from("teacher_balance")
        .update({
          total_minutes: Math.max(0, balance.total_minutes - minutes),
        })
        .eq("teacher_id", teacherId);

      if (error) throw error;

      toast.success(t("dialogs.balance.minutesSubtracted", { minutes }));
      setMinutesToSubtract("");
      fetchBalance();
    } catch (error) {
      console.error("Error subtracting minutes:", error);
      toast.error(t("dialogs.balance.subtractMinutesError"));
    }
  };

  const handleResetBalance = async () => {
    try {
      const { data: existingBalance } = await supabase
        .from("teacher_balance")
        .select("*")
        .eq("teacher_id", teacherId)
        .maybeSingle();

      // Create payment history record before resetting
      if (existingBalance && existingBalance.total_minutes > 0) {
        const { error: historyError } = await supabase.from("payment_history").insert({
          teacher_id: teacherId,
          amount_minutes: existingBalance.total_minutes,
          completed_regular_lessons: existingBalance.completed_regular_lessons,
          completed_trial_lessons: existingBalance.completed_trial_lessons,
        });

        if (historyError) throw historyError;
      }

      // Reset balance
      if (existingBalance) {
        const { error } = await supabase
          .from("teacher_balance")
          .update({
            total_minutes: 0,
            completed_regular_lessons: 0,
            completed_trial_lessons: 0,
            regular_lessons_minutes: 0,
            trial_lessons_minutes: 0,
          })
          .eq("teacher_id", teacherId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("teacher_balance").insert({
          teacher_id: teacherId,
          total_minutes: 0,
          completed_regular_lessons: 0,
          completed_trial_lessons: 0,
          regular_lessons_minutes: 0,
          trial_lessons_minutes: 0,
        });

        if (error) throw error;
      }

      toast.success(t("dialogs.balance.balanceReset"));
      setShowResetDialog(false);
      fetchBalance();
      fetchPaymentHistory();
    } catch (error) {
      console.error("Error resetting balance:", error);
      toast.error(t("dialogs.balance.resetError"));
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from("payment_history")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;

      toast.success(t("dialogs.balance.paymentDeleted"));
      fetchPaymentHistory();
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error(t("dialogs.balance.paymentDeleteError"));
    }
  };

  const formatMinutes = (minutes: number) => {
    return `${minutes} ${t("common.minutes")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">{t("dialogs.balance.totalBalance")}</p>
              </div>
              <p className="text-3xl font-bold text-primary">{formatMinutes(balance?.total_minutes || 0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">{t("dialogs.balance.regularLessons")}</p>
              </div>
              <p className="text-3xl font-bold">{balance?.completed_regular_lessons || 0} {t("dialogs.balance.lesson")} ({formatMinutes(balance?.regular_lessons_minutes || 0)})</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-accent" />
                <p className="text-sm font-medium text-muted-foreground">{t("dialogs.balance.trialLessons")}</p>
              </div>
              <p className="text-3xl font-bold">{balance?.completed_trial_lessons || 0} {t("dialogs.balance.lesson")} ({formatMinutes(balance?.trial_lessons_minutes || 0)})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dialogs.balance.balanceManagement")}</CardTitle>
          <CardDescription>{t("dialogs.balance.balanceManagementDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Minutes */}
          <div className="space-y-2">
            <Label htmlFor="add-minutes">{t("dialogs.balance.addMinutes")}</Label>
            <div className="flex gap-2">
              <Input
                id="add-minutes"
                type="number"
                placeholder={t("dialogs.balance.addMinutesPlaceholder")}
                value={minutesToAdd}
                onChange={(e) => setMinutesToAdd(e.target.value)}
                min="1"
              />
              <Button onClick={handleAddMinutes} className="whitespace-nowrap">
                <Plus className="h-4 w-4 mr-2" />
                {t("dialogs.balance.add")}
              </Button>
            </div>
          </div>

          {/* Subtract Minutes */}
          <div className="space-y-2">
            <Label htmlFor="subtract-minutes">{t("dialogs.balance.subtractMinutes")}</Label>
            <div className="flex gap-2">
              <Input
                id="subtract-minutes"
                type="number"
                placeholder={t("dialogs.balance.subtractMinutesPlaceholder")}
                value={minutesToSubtract}
                onChange={(e) => setMinutesToSubtract(e.target.value)}
                min="1"
              />
              <Button onClick={handleSubtractMinutes} variant="secondary" className="whitespace-nowrap">
                <Minus className="h-4 w-4 mr-2" />
                {t("dialogs.balance.subtract")}
              </Button>
            </div>
          </div>

          {/* Reset Balance */}
          <div className="pt-4 border-t">
            <Button onClick={() => setShowResetDialog(true)} variant="destructive" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              {t("dialogs.balance.resetBalance")}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {t("dialogs.balance.resetBalanceNote")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {t("dialogs.balance.paymentHistory")}
          </CardTitle>
          <CardDescription>{t("dialogs.balance.pastPayments")}</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("dialogs.balance.noPayments")}</p>
          ) : (
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <Card key={payment.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <p className="font-semibold text-lg">{formatMinutes(payment.amount_minutes)}</p>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                            {payment.completed_regular_lessons} {t("dialogs.balance.lesson")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-accent" />
                            {payment.completed_trial_lessons} {t("dialogs.balance.lesson")}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {format(new Date(payment.payment_date), "dd MMMM yyyy", { locale: getDateLocale() })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.payment_date), "HH:mm", { locale: getDateLocale() })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayment(payment.id)}
                          className="text-destructive hover:text-destructive h-8"
                        >
                          {t("dialogs.balance.delete")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialogs.balance.resetConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialogs.balance.resetConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetBalance} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.resetAndSave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
