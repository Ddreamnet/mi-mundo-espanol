import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle2, Calendar, Receipt } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr, enUS, es } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";

interface TeacherBalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function TeacherBalanceDialog({ open, onOpenChange, teacherId }: TeacherBalanceDialogProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);

  const getDateLocale = () => {
    switch (language) {
      case 'en': return enUS;
      case 'es': return es;
      default: return tr;
    }
  };

  useEffect(() => {
    if (open) {
      fetchBalance();
      fetchPaymentHistory();
    }
  }, [open, teacherId]);

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

  const formatMinutes = (minutes: number) => {
    return `${minutes} ${t("common.minutes")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("dialogs.balance.title")}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-secondary/30 rounded-lg p-6 border border-border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">{t("dialogs.balance.totalProcessedTime")}</p>
                <p className="text-3xl font-bold text-primary">
                  {formatMinutes(balance?.total_minutes || 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/20 border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-xs opacity-70">{t("dialogs.balance.regularLessons")}</p>
                </div>
                <p className="text-2xl font-semibold">
                  {balance?.completed_regular_lessons || 0} {t("dialogs.balance.lesson")} ({formatMinutes(balance?.regular_lessons_minutes || 0)})
                </p>
              </div>

              <div className="bg-secondary/20 border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  <p className="text-xs opacity-70">{t("dialogs.balance.trialLessons")}</p>
                </div>
                <p className="text-2xl font-semibold">
                  {balance?.completed_trial_lessons || 0} {t("dialogs.balance.lesson")} ({formatMinutes(balance?.trial_lessons_minutes || 0)})
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              {t("dialogs.balance.autoAddNote")}
            </div>

            {/* Payment History */}
            {paymentHistory.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  <h3 className="font-semibold text-sm">{t("dialogs.balance.paymentHistory")}</h3>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {paymentHistory.map((payment) => (
                    <Card key={payment.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <p className="font-semibold text-sm">{formatMinutes(payment.amount_minutes)}</p>
                            </div>
                            <div className="flex gap-3 text-xs opacity-70">
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {payment.completed_regular_lessons} {t("dialogs.balance.lesson")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {payment.completed_trial_lessons} {t("dialogs.balance.lesson")}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium">
                              {format(new Date(payment.payment_date), "dd MMM yyyy", { locale: getDateLocale() })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
