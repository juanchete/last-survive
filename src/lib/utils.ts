import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "@/integrations/supabase/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function createNotification({
  userId,
  message,
  type = "info",
  leagueId,
}: {
  userId: string;
  message: string;
  type?: "info" | "warning" | "success" | "error";
  leagueId?: string;
}) {
  await supabase.from("notifications").insert({
    user_id: userId,
    message,
    type,
    league_id: leagueId || null,
    read: false,
  });
}

export async function markNotificationAsRead(notificationId: string) {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
}

export async function markAllNotificationsAsRead(userId: string) {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId);
}
