import { useDraftState } from "@/hooks/useDraftState";

export function useIsMyDraftTurn(leagueId: string, myTeamId: string) {
  const { data: draftState } = useDraftState(leagueId);
  if (!draftState) return false;
  const { draft_order, current_pick, draft_status } = draftState;
  if (draft_status !== "in_progress") return false;
  if (!draft_order || draft_order.length === 0) return false;
  
  // Calculate which team's turn it is based on snake draft logic
  const totalTeams = draft_order.length;
  const currentPickNumber = current_pick; // This is now the overall pick number
  const currentRound = Math.floor(currentPickNumber / totalTeams);
  const positionInRound = currentPickNumber % totalTeams;
  
  // In snake draft: odd rounds (0, 2, 4...) go forward, even rounds (1, 3, 5...) go backward
  const isReverseRound = currentRound % 2 === 1;
  const currentTeamIndex = isReverseRound 
    ? totalTeams - 1 - positionInRound 
    : positionInRound;
  
  return draft_order[currentTeamIndex] === myTeamId;
}
