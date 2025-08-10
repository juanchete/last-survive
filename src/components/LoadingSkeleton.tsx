import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function LeagueCardSkeleton() {
  return (
    <Card className="bg-nfl-gray border-nfl-light-gray/20">
      <CardHeader>
        <Skeleton className="h-6 w-3/4 bg-nfl-light-gray/20" />
        <Skeleton className="h-4 w-1/2 bg-nfl-light-gray/20" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full bg-nfl-light-gray/20" />
          <Skeleton className="h-4 w-5/6 bg-nfl-light-gray/20" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PlayerCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border border-nfl-light-gray/20 rounded-lg">
      <Skeleton className="h-12 w-12 rounded-full bg-nfl-light-gray/20" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32 bg-nfl-light-gray/20" />
        <Skeleton className="h-4 w-24 bg-nfl-light-gray/20" />
      </div>
      <Skeleton className="h-8 w-20 bg-nfl-light-gray/20" />
    </div>
  );
}

export function StandingsTableSkeleton() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-nfl-light-gray/20">
        <Skeleton className="h-4 w-16 bg-nfl-light-gray/20" />
        <Skeleton className="h-4 w-24 bg-nfl-light-gray/20" />
        <Skeleton className="h-4 w-16 bg-nfl-light-gray/20" />
        <Skeleton className="h-4 w-20 bg-nfl-light-gray/20" />
      </div>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b border-nfl-light-gray/20">
          <Skeleton className="h-4 w-8 bg-nfl-light-gray/20" />
          <Skeleton className="h-4 w-32 bg-nfl-light-gray/20" />
          <Skeleton className="h-4 w-12 bg-nfl-light-gray/20" />
          <Skeleton className="h-4 w-16 bg-nfl-light-gray/20" />
        </div>
      ))}
    </div>
  );
}

export function DraftBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="bg-nfl-gray border-nfl-light-gray/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20 bg-nfl-light-gray/20" />
              <Skeleton className="h-5 w-16 bg-nfl-light-gray/20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded bg-nfl-light-gray/20" />
                <Skeleton className="h-4 w-full bg-nfl-light-gray/20" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-nfl-dark">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 bg-nfl-light-gray/20" />
          <Skeleton className="h-6 w-96 bg-nfl-light-gray/20" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-nfl-gray border-nfl-light-gray/20">
              <CardContent className="p-6">
                <Skeleton className="h-8 w-16 mb-2 bg-nfl-light-gray/20" />
                <Skeleton className="h-4 w-24 bg-nfl-light-gray/20" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card className="bg-nfl-gray border-nfl-light-gray/20">
          <CardHeader>
            <Skeleton className="h-6 w-48 bg-nfl-light-gray/20" />
          </CardHeader>
          <CardContent>
            <StandingsTableSkeleton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}