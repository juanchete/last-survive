
import { useEffect, useState } from "react";
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
import { useLeagueStore } from "@/store/leagueStore";

type Notification = {
  id: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  read: boolean;
  date: string;
};

// This would typically come from a backend or state management system
// For now we'll use mock data based on league store state
export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const currentWeek = useLeagueStore((state) => state.currentWeek);
  const leagues = useLeagueStore((state) => state.leagues);
  
  // Generate mock notifications based on league store state
  useEffect(() => {
    const mockNotifications: Notification[] = [];
    
    // Week update notification
    mockNotifications.push({
      id: "week-update",
      message: `NFL Week ${currentWeek} has started!`,
      type: "info",
      read: false,
      date: new Date().toISOString(),
    });
    
    // League notifications
    leagues.forEach(league => {
      mockNotifications.push({
        id: `league-${league.id}`,
        message: `Don't forget to set your pick for ${league.name}!`,
        type: "warning",
        read: false,
        date: new Date().toISOString(),
      });
      
      // Check if league is upcoming - assuming there's a draft_status or similar property
      // For now we'll just use a random condition to mock this
      if (league.name.toLowerCase().includes("draft") || Math.random() > 0.7) {
        mockNotifications.push({
          id: `draft-${league.id}`,
          message: `It's your turn to pick in the ${league.name} draft!`,
          type: "success",
          read: false,
          date: new Date().toISOString(),
        });
      }
    });
    
    setNotifications(mockNotifications);
  }, [currentWeek, leagues]);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };
  
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
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
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-nfl-blue hover:text-white"
            >
              Mark all as read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-nfl-light-gray/20" />
        
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <DropdownMenuItem 
              key={notification.id} 
              onClick={() => markAsRead(notification.id)}
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
          <div className="text-center p-4 text-gray-400">No notifications</div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
