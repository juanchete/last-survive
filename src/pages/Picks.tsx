import { LeagueNav } from "@/components/LeagueNav";
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
import { useEliminationHistory } from "@/hooks/useWeeklyElimination";
import { useLocation } from "react-router-dom";

export default function Picks() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const leagueId = queryParams.get("league") as string;
  const { data: eliminationHistory = [], isLoading, error } = useEliminationHistory(leagueId);

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
              {eliminationHistory.map((team, index) => (
                <TableRow key={team.id} className="hover:bg-nfl-dark-gray/50 transition-colors">
                  <TableCell className="font-medium text-white">
                    {index + 1}
                  </TableCell>
                  <TableCell className="text-gray-300">{team.name}</TableCell>
                  <TableCell className="text-gray-300">{team.users?.full_name || 'N/A'}</TableCell>
                  <TableCell className="text-center text-nfl-red font-semibold">{team.eliminated_week}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Layout>
  );
}
