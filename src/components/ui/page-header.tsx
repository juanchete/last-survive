import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  stats?: Array<{
    label: string;
    value: string | number;
    highlight?: boolean;
  }>;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  subtitle, 
  badge,
  stats,
  className,
  children 
}: PageHeaderProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-gradient-to-br from-nfl-blue via-nfl-blue/90 to-blue-700 border border-nfl-blue/20 p-8",
      className
    )}>
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(to_bottom,transparent,black)]" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{title}</h1>
              {badge && (
                <Badge className={cn(
                  "uppercase",
                  badge.variant === "secondary" && "bg-yellow-600 text-black hover:bg-yellow-700"
                )}>
                  {badge.text}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-gray-300 text-lg">{subtitle}</p>
            )}
          </div>
          
          {stats && (
            <div className="flex gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-right">
                  <p className="text-gray-300 text-sm">{stat.label}</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    stat.highlight ? "text-yellow-400" : "text-white"
                  )}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {children && (
          <div className="mt-6">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}