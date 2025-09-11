import { useUserFantasyTeam } from "@/hooks/useUserFantasyTeam";

export function useTeamAccess(leagueId: string) {
  const { data: userTeam } = useUserFantasyTeam(leagueId);

  const isEliminated = userTeam?.eliminated || false;
  const canMakeChanges = !isEliminated;
  const accessLevel = isEliminated ? 'read-only' : 'full-access';

  return {
    isEliminated,
    canMakeChanges,
    accessLevel,
    userTeam,
    readOnlyMessage: isEliminated 
      ? "Tu equipo ha sido eliminado. Puedes ver tu roster pero no hacer cambios."
      : null
  };
}