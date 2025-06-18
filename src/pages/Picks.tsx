import { Layout } from "@/components/Layout";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLeaguePicks } from "@/hooks/useLeaguePicks";
import { useLocation } from "react-router-dom";

export default function Picks() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const leagueId = searchParams.get("league") || "default";
  const { data: picks, isLoading } = useLeaguePicks(leagueId);

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold text-white mb-6">Draft Picks</h1>
        {isLoading ? (
          <p className="text-gray-400">Loading picks...</p>
        ) : (
          <Table>
            <TableCaption>
              All the draft picks for this league, in order.
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Pick #</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {picks.map((pick, index) => (
                <TableRow key={index} className="hover:bg-nfl-dark-gray/50 transition-colors">
                  <TableCell className="font-medium text-white">
                    #{pick.pick_number}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {pick.fantasy_team?.name || 'Unknown Team'}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {pick.stats?.player_name || 'No Player Selected'}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {pick.stats?.position || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Layout>
  );
}
