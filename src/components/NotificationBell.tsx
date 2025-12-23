import { useState, useEffect } from "react";
import { Bell, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Notification {
  id: string;
  teacher_id: string;
  student_id: string;
  homework_id: string;
  is_read: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface NotificationBellProps {
  userId: string;
  teacherId: string;
  studentId?: string;
  isStudent?: boolean;
  onNotificationClick?: () => void;
}

export function NotificationBell({ userId, teacherId, studentId, isStudent = false, onNotificationClick }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    
    fetchNotifications();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId) return;
    
    try {
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notificationsError) throw notificationsError;

      const userIds = isStudent 
        ? [...new Set(notificationsData?.map(n => n.teacher_id) || [])]
        : [...new Set(notificationsData?.map(n => n.student_id) || [])];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p.full_name]) || []
      );

      const enrichedNotifications = notificationsData?.map(n => ({
        ...n,
        profiles: {
          full_name: profilesMap.get(isStudent ? n.teacher_id : n.student_id) || (isStudent ? 'Öğretmen' : 'Öğrenci')
        }
      })) || [];

      setNotifications(enrichedNotifications);
      setUnreadCount(enrichedNotifications.filter(n => !n.is_read).length);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          console.log('New notification received:', payload);
          fetchNotifications();
          
          toast({
            title: "Yeni Ödev",
            description: isStudent ? "Öğretmeniniz yeni bir dosya yükledi" : "Bir öğrenciniz yeni ödev yükledi",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.is_read)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error: any) {
      console.error('Error marking notifications as read:', error);
      toast({
        title: "Hata",
        description: "Bildirimler okundu olarak işaretlenemedi",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const handleNotificationClick = () => {
    setOpen(false);
    onNotificationClick?.();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-icon-default">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-card-foreground">Bildirimler</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {unreadCount > 0 
                  ? `${unreadCount} okunmamış bildirim` 
                  : "Tüm bildirimler okundu"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
        <ScrollArea className="h-[320px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="rounded-full bg-muted p-3 mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-card-foreground">Henüz bildirim yok</p>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                Yeni ödev yüklendiğinde burada görünecek
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors hover:bg-muted/50 cursor-pointer ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                  onClick={handleNotificationClick}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-secondary p-2">
                      <FileText className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm text-card-foreground ${
                        !notification.is_read ? 'font-semibold' : 'font-medium'
                      }`}>
                        {notification.profiles?.full_name || (isStudent ? 'Öğretmen' : 'Öğrenci')}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {isStudent ? "Yeni bir dosya yükledi" : "Yeni bir ödev yükledi"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notification.created_at), "dd MMM yyyy, HH:mm", { locale: tr })}
                        </p>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
