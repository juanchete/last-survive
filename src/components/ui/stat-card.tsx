import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  iconColor?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  iconColor = "text-white",
  className
}: StatCardProps) {
  const trendColors = {
    up: "text-nfl-green",
    down: "text-nfl-red",
    neutral: "text-gray-400"
  };

  return (
    <Card className={cn("bg-nfl-gray border-nfl-light-gray/20 overflow-hidden hover:border-nfl-blue/30 transition-all duration-300", className)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Icon className={cn("w-5 h-5", iconColor)} />
          <h3 className="text-gray-400 font-medium">{label}</h3>
        </div>
        <div className="space-y-1">
          <p className={cn(
            "text-3xl font-bold text-white",
            trend && trendColors[trend]
          )}>
            {value}
          </p>
          {subValue && (
            <p className="text-sm text-gray-500">{subValue}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}