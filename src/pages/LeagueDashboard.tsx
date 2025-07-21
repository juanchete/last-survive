import { Layout } from "@/components/Layout";
import { useLocation } from "react-router-dom";
import { useLeagueDashboardData } from "@/hooks/useLeagueDashboardData";
import { LeagueHeader } from "@/components/LeagueHeader";
import { LeagueTabs } from "@/components/LeagueTabs";
import { LeagueOverviewCards } from "@/components/LeagueOverviewCards";
import { LeagueStandingsTable } from "@/components/LeagueStandingsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LeagueDashboard() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "";

  const { stats, teams, isLoading, selectedWeek } = useLeagueDashboardData(leagueId);

  return (
    <Layout>
      <div className="min-h-screen bg-nfl-dark-gray">
        {/* League Header */}
        <LeagueHeader leagueId={leagueId} />

        {/* League Navigation Tabs */}
        <LeagueTabs leagueId={leagueId} activeTab="overview" />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6">
          {/* League Overview Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">League Overview</h2>
            <LeagueOverviewCards leagueId={leagueId} teams={teams} isLoading={isLoading} />
          </section>

          {/* Recent Eliminations */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Recent Eliminations</h2>
            <Card className="bg-nfl-gray border-nfl-light-gray/20">
              <CardContent className="p-6">
                <p className="text-gray-400 text-center">No recent eliminations</p>
              </CardContent>
            </Card>
            <Button 
              variant="link" 
              className="text-nfl-blue hover:text-nfl-lightblue mt-2"
            >
              View All Eliminations
            </Button>
          </section>

          {/* League Standings */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">League Standings</h2>
            <LeagueStandingsTable teams={teams} isLoading={isLoading} />
            <div className="mt-4 text-right">
              <Button 
                variant="link" 
                className="text-nfl-blue hover:text-nfl-lightblue"
              >
                View Full Standings
              </Button>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}