import { useState, useEffect } from "react";
import { Bell, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface AdminNotification {
  id: string;
  notification_type: string;
  teacher_id: string;
  student_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface AdminNotificationBellProps {
  adminId: string;
}

export function AdminNotificationBell({ adminId }: AdminNotificationBellProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [adminId]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (error: any) {
      console.error('Error fetching admin notifications:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`admin-notifications-${adminId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          console.log('New admin notification received:', payload);
          fetchNotifications();
          
          toast({
            title: "Yeni Bildirim",
            description: (payload.new as AdminNotification).message,
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
        .from('admin_notifications')
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
              <h4 className="font-semibold text-card-foreground">Admin Bildirimleri</h4>
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
                Öğrencilerin son dersleri yaklaştığında burada görünecek
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-secondary p-2">
                      <Users className="h-4 w-4 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm text-card-foreground ${
                        !notification.is_read ? 'font-semibold' : 'font-medium'
                      }`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
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
