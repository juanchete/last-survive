import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseAvailablePlayersParams {
  leagueId: string;
  week: number;
  position?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'projected_points' | 'position' | 'team' | 'adp';
  sortOrder?: 'asc' | 'desc';
}

export function useAvailablePlayersPaginated({
  leagueId,
  week,
  position = 'all',
  searchTerm = '',
  page = 1,
  pageSize = 50,
  sortBy = 'adp',
  sortOrder = 'asc'
}: UseAvailablePlayersParams) {
  return useQuery({
    queryKey: ["availablePlayersPaginated", leagueId, week, position, searchTerm, page, pageSize, sortBy, sortOrder],
    queryFn: async () => {
      // 1. Get drafted players for this league and week
      const { data: rosters, error: rostersError } = await supabase
        .from("team_rosters")
        .select("player_id, fantasy_team:fantasy_teams(league_id)")
        .eq("week", week);
      
      if (rostersError) throw rostersError;
      
      const draftedIds = new Set(
        rosters
          ?.filter((r) => r.fantasy_team?.league_id === leagueId)
          .map((r) => r.player_id) || []
      );

      // 2. Build the players query with filters
      let playersQuery = supabase
        .from("players")
        .select(`
          id,
          name,
          position,
          photo_url,
          last_season_points,
          status,
          years_exp,
          age,
          height,
          weight,
          college,
          sportsdata_id,
          is_team_defense,
          adp_standard,
          adp_ppr,
          adp_2qb,
          nfl_teams!players_nfl_team_id_fkey (
            id,
            abbreviation,
            name,
            logo_url
          )
        `, { count: 'exact' });

      // Apply position filter
      if (position && position !== 'all') {
        playersQuery = playersQuery.eq('position', position);
      }

      // Apply search filter
      if (searchTerm) {
        playersQuery = playersQuery.or(`name.ilike.%${searchTerm}%,college.ilike.%${searchTerm}%`);
      }

      // Apply sorting
      const orderColumn = sortBy === 'projected_points' ? 'last_season_points' : 
                          sortBy === 'team' ? 'nfl_team_id' : 
                          sortBy === 'adp' ? 'adp_standard' : sortBy;
      
      // For ADP, we want ascending order by default (lower ADP = better)
      const isAscending = sortBy === 'adp' ? sortOrder === 'asc' : sortOrder === 'asc';
      
      playersQuery = playersQuery.order(orderColumn, { 
        ascending: isAscending,
        nullsLast: sortBy === 'adp' // Only put nulls last for ADP sorting
      });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      playersQuery = playersQuery.range(from, to);

      const { data: players, error: playersError, count } = await playersQuery;
      if (playersError) throw playersError;

      // 3. Get current week projections for these players
      const playerIds = players?.map(p => p.id) || [];
      let projections: any[] = [];
      
      if (playerIds.length > 0) {
        const { data: proj } = await supabase
          .from("player_stats")
          .select("player_id, projected_points, projected_passing_yards, projected_rushing_yards, projected_receiving_yards, projected_receptions")
          .in("player_id", playerIds)
          .eq("week", week)
          .eq("season", new Date().getFullYear());
        
        projections = proj || [];
      }

      const projectionsMap = new Map(projections.map(p => [p.player_id, p]));

      // 4. Format the players with all data
      const formattedPlayers = players?.map((player) => {
        const projection = projectionsMap.get(player.id);
        const isDrafted = draftedIds.has(player.id);
        
        return {
          id: player.id,
          name: player.name,
          position: player.position,
          team: player.nfl_teams?.abbreviation || "FA",
          teamLogo: player.nfl_teams?.logo_url || null,
          available: !isDrafted,
          photo: player.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=1a1a1a&color=fff`,
          projectedPoints: projection?.projected_points || 0,
          projectedPassingYards: projection?.projected_passing_yards || 0,
          projectedRushingYards: projection?.projected_rushing_yards || 0,
          projectedReceivingYards: projection?.projected_receiving_yards || 0,
          projectedReceptions: projection?.projected_receptions || 0,
          lastSeasonPoints: player.last_season_points || 0,
          status: player.status || 'Healthy',
          yearsExp: player.years_exp || 0,
          age: player.age,
          height: player.height,
          weight: player.weight,
          college: player.college,
          isDefense: player.is_team_defense || false,
          adp: player.adp_standard || null
        };
      }) || [];

      return {
        players: formattedPlayers,
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    enabled: !!leagueId && !!week,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
  });
}