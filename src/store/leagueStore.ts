
import { create } from 'zustand';
import { FantasyTeam, LeagueState, NFLTeam, Player, Week } from '@/types';
import { initialLeagueState } from '@/data/mockData';

interface League {
  id: string;
  name: string;
  description: string;
  entryFee: number;
  image: string | null;
  isPrivate: boolean;
  privateCode: string | null;
  owner: string;
  members: string[];
  createdAt: Date;
}

interface LeagueStore extends LeagueState {
  // League management
  leagues: League[];
  createLeague: (league: Omit<League, 'id' | 'owner' | 'members' | 'createdAt'>) => void;
  joinLeague: (leagueId: string, code?: string) => boolean;
  
  // Actions
  draftPlayer: (playerId: string, teamId: string) => void;
  advanceWeek: () => void;
  eliminateTeam: (teamId: string) => void;
  eliminateNFLTeam: (teamId: string) => void;
  releasePlayers: (teamId: string) => void;
  startDraft: () => void;
  endDraft: () => void;
  updateTeamPoints: () => void;
  setCurrentWeek: (weekNumber: number) => void;
}

export const useLeagueStore = create<LeagueStore>((set, get) => ({
  ...initialLeagueState,
  leagues: [],
  
  createLeague: (league) => {
    set((state) => {
      const newLeague: League = {
        id: crypto.randomUUID(),
        name: league.name,
        description: league.description,
        entryFee: league.entryFee,
        image: league.image,
        isPrivate: league.isPrivate,
        privateCode: league.privateCode,
        owner: 'current-user', // In a real app, this would be the current user's ID
        members: ['current-user'], // Owner is automatically a member
        createdAt: new Date(),
      };
      
      return {
        ...state,
        leagues: [...state.leagues, newLeague]
      };
    });
  },
  
  joinLeague: (leagueId, code) => {
    let success = false;
    
    set((state) => {
      const league = state.leagues.find(l => l.id === leagueId);
      
      if (!league) {
        return state;
      }
      
      // Check if it's a private league and the code matches
      if (league.isPrivate && league.privateCode !== code) {
        return state;
      }
      
      // Check if user is already a member
      if (league.members.includes('current-user')) {
        return state;
      }
      
      success = true;
      
      // Add user to league members
      const updatedLeagues = state.leagues.map(l => 
        l.id === leagueId 
          ? { ...l, members: [...l.members, 'current-user'] } 
          : l
      );
      
      return {
        ...state,
        leagues: updatedLeagues
      };
    });
    
    return success;
  },

  draftPlayer: (playerId: string, teamId: string) => {
    set((state) => {
      const player = state.availablePlayers.find(p => p.id === playerId);
      const team = state.teams.find(t => t.id === teamId);
      
      if (!player || !team) return state;
      
      // Update player availability
      const updatedPlayers = state.availablePlayers.map(p => 
        p.id === playerId ? { ...p, available: false } : p
      );
      
      // Add player to team
      const updatedTeams = state.teams.map(t => 
        t.id === teamId ? 
        { ...t, players: [...t.players, {...player, available: false}] } : 
        t
      );
      
      return {
        ...state,
        availablePlayers: updatedPlayers,
        teams: updatedTeams
      };
    });
  },

  advanceWeek: () => {
    set((state) => {
      const newWeek = state.currentWeek + 1;
      if (newWeek > 18) return state; // No more weeks
      
      // Update weeks status
      const updatedWeeks = state.weeks.map(week => ({
        ...week,
        status: (week.number === newWeek ? 'active' : 
                week.number < newWeek ? 'completed' : 'upcoming') as 'active' | 'completed' | 'upcoming'
      }));
      
      return {
        ...state,
        currentWeek: newWeek,
        weeks: updatedWeeks
      };
    });
  },

  eliminateTeam: (teamId: string) => {
    set((state) => {
      // Mark the team as eliminated
      const updatedTeams = state.teams.map(team => 
        team.id === teamId ? { ...team, eliminated: true } : team
      );
      
      // Update rankings
      const sortedTeams = [...updatedTeams].sort((a, b) => {
        // Eliminated teams always rank lower
        if (a.eliminated && !b.eliminated) return 1;
        if (!a.eliminated && b.eliminated) return -1;
        // Otherwise sort by points
        return b.points - a.points;
      });
      
      const rankedTeams = sortedTeams.map((team, index) => ({
        ...team,
        rank: index + 1
      }));
      
      return {
        ...state,
        teams: rankedTeams
      };
    });
    
    // Release players from eliminated team
    get().releasePlayers(teamId);
  },

  eliminateNFLTeam: (teamId: string) => {
    set((state) => {
      // Mark the NFL team as eliminated
      const updatedNFLTeams = state.nflTeams.map(team => 
        team.id === teamId ? 
        { ...team, eliminated: true, eliminationWeek: state.currentWeek } : 
        team
      );
      
      // Update the current week with eliminated team
      const eliminatedTeam = updatedNFLTeams.find(team => team.id === teamId);
      const updatedWeeks = state.weeks.map(week => 
        week.number === state.currentWeek ? 
        { ...week, eliminatedTeam: eliminatedTeam || null } : 
        week
      );
      
      // Mark players from that team as eliminated
      const updatedPlayers = state.availablePlayers.map(player => 
        player.team === updatedNFLTeams.find(t => t.id === teamId)?.abbreviation ? 
        { ...player, eliminated: true } : 
        player
      );
      
      // Also update players in fantasy teams
      const updatedTeams = state.teams.map(team => ({
        ...team,
        players: team.players.map(player => 
          player.team === updatedNFLTeams.find(t => t.id === teamId)?.abbreviation ? 
          { ...player, eliminated: true } : 
          player
        )
      }));
      
      return {
        ...state,
        nflTeams: updatedNFLTeams,
        weeks: updatedWeeks,
        availablePlayers: updatedPlayers,
        teams: updatedTeams
      };
    });
  },

  releasePlayers: (teamId: string) => {
    set((state) => {
      const team = state.teams.find(t => t.id === teamId);
      if (!team) return state;
      
      // Move players back to available pool
      const releasedPlayers = team.players.map(p => ({...p, available: true}));
      
      // Update the team to have no players
      const updatedTeams = state.teams.map(t => 
        t.id === teamId ? {...t, players: []} : t
      );
      
      // Add the released players to the available pool
      const updatedAvailablePlayers = [
        ...state.availablePlayers,
        ...releasedPlayers
      ];
      
      return {
        ...state,
        teams: updatedTeams,
        availablePlayers: updatedAvailablePlayers
      };
    });
  },

  startDraft: () => set({ draftInProgress: true }),
  
  endDraft: () => set({ draftInProgress: false }),
  
  updateTeamPoints: () => {
    set((state) => {
      // Calculate points for each team based on their players
      const updatedTeams = state.teams.map(team => {
        const teamPoints = team.players.reduce((sum, player) => sum + player.points, 0);
        return { ...team, points: teamPoints };
      });
      
      // Sort teams by points and update ranks
      const sortedTeams = [...updatedTeams].sort((a, b) => {
        // Eliminated teams always rank lower
        if (a.eliminated && !b.eliminated) return 1;
        if (!a.eliminated && b.eliminated) return -1;
        // Otherwise sort by points
        return b.points - a.points;
      });
      
      const rankedTeams = sortedTeams.map((team, index) => ({
        ...team,
        rank: index + 1
      }));
      
      return {
        ...state,
        teams: rankedTeams
      };
    });
  },
  
  setCurrentWeek: (weekNumber: number) => {
    set((state) => {
      if (weekNumber < 1 || weekNumber > 18) return state;
      
      // Update weeks status
      const updatedWeeks = state.weeks.map(week => ({
        ...week,
        status: (week.number === weekNumber ? 'active' : 
                week.number < weekNumber ? 'completed' : 'upcoming') as 'active' | 'completed' | 'upcoming'
      }));
      
      return {
        ...state,
        currentWeek: weekNumber,
        weeks: updatedWeeks
      };
    });
  }
}));
