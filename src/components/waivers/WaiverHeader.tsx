
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, UserPlus } from "lucide-react";

interface WaiverHeaderProps {
  currentWeek: number;
}

export function WaiverHeader({ currentWeek }: WaiverHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-nfl-blue via-nfl-blue/90 to-blue-700 border border-nfl-blue/20">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"2\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
      <div className="relative p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Waivers</h1>
              <p className="text-blue-100 text-lg">Week {currentWeek} • Add players to strengthen your roster</p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="bg-white/10 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-sm">
              <Clock className="w-4 h-4 mr-2" />
              Tuesday 11:00 PM Deadline
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
