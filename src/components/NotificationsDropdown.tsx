import { useEffect } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function NotificationsDropdown() {
  const { user } = useAuth();
  const userId = user?.id || "";
  const { data: notifications = [], refetch } = useNotifications(userId);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    refetch();
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(userId);
    refetch();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative inline-flex">
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-2 -right-2 h-5 min-w-[20px] bg-nfl-blue text-white text-xs flex items-center justify-center rounded-full px-1"
          >
            {unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-nfl-gray border border-nfl-light-gray/20 shadow-lg">
        <DropdownMenuLabel className="text-white flex justify-between items-center">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="text-xs text-nfl-blue hover:text-white"
            >
              Marcar todo como leído
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-nfl-light-gray/20" />
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <DropdownMenuItem 
              key={notification.id} 
              onClick={() => handleMarkAsRead(notification.id)}
              className={`flex flex-col items-start p-3 cursor-pointer hover:bg-nfl-blue/10 ${!notification.read ? 'bg-nfl-blue/5' : ''}`}
            >
              <div className="w-full flex justify-between items-center gap-2">
                <span className={`font-medium ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                  {notification.message}
                </span>
                {!notification.read && (
                  <div className="h-2 w-2 rounded-full bg-nfl-blue flex-shrink-0"></div>
                )}
              </div>
              <span className="text-xs text-gray-400 mt-1">
                {new Date(notification.date).toLocaleDateString()} {new Date(notification.date).toLocaleTimeString()}
              </span>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="text-center p-4 text-gray-400">No hay notificaciones</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
