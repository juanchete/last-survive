import { useDraftState } from "@/hooks/useDraftState";

export function useIsMyDraftTurn(leagueId: string, myTeamId: string) {
  const { data: draftState } = useDraftState(leagueId);
  if (!draftState) return false;
  const { draft_order, current_pick, draft_status } = draftState;
  if (draft_status !== "in_progress") return false;
  return draft_order && draft_order[current_pick] === myTeamId;
}
