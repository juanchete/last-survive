import { Player } from "@/types";

// Roster requirements (matching the lineup format)
const ROSTER_REQUIREMENTS = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  K: 1,
  DEF: 1,
  DP: 1,  // Can be filled by DP, LB, DB, or DL
  FLEX: 1, // Can be filled by RB or WR only
};

// Position scarcity multipliers (positions that are harder to find good players)
const SCARCITY_MULTIPLIERS = {
  QB: 1.3,   // QBs are scarce and important
  TE: 1.2,   // Good TEs are hard to find
  K: 1.1,    // Consistent kickers are valuable
  DEF: 1.1,  // Good defenses are limited
  RB: 1.0,   // RBs are important but plentiful
  WR: 1.0,   // WRs are plentiful
  DP: 1.1,   // Defensive players are specialized
  LB: 1.1,
  DB: 1.1,
  DL: 1.1,
};

// Position priority for early rounds
const EARLY_ROUND_PRIORITY = {
  QB: 3,
  RB: 1,
  WR: 2,
  TE: 4,
  K: 7,
  DEF: 6,
  DP: 5,
  LB: 5,
  DB: 5,
  DL: 5,
};

interface RosterAnalysis {
  needs: string[];
  filled: string[];
  flexNeeds: boolean;
  benchSpace: number;
}

interface PlayerRecommendation {
  player: Player;
  score: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Analyze current roster to determine what positions are needed
 */
export function analyzeRosterNeeds(currentRoster: Array<{ slot: string; position?: string }>): RosterAnalysis {
  const slotCounts: Record<string, number> = {};
  const needs: string[] = [];
  const filled: string[] = [];
  
  // Count current slots
  currentRoster.forEach(item => {
    slotCounts[item.slot] = (slotCounts[item.slot] || 0) + 1;
  });
  
  // Check each position requirement
  Object.entries(ROSTER_REQUIREMENTS).forEach(([position, required]) => {
    const current = slotCounts[position] || 0;
    
    if (position === 'FLEX') {
      // FLEX is filled if we have it, or if we have extra RB/WR
      const flexFilled = current > 0 || 
                        (slotCounts.RB || 0) > ROSTER_REQUIREMENTS.RB ||
                        (slotCounts.WR || 0) > ROSTER_REQUIREMENTS.WR;
      if (!flexFilled) {
        needs.push('FLEX');
      } else {
        filled.push('FLEX');
      }
    } else if (position === 'DP') {
      // DP can be filled by DP, LB, DB, or DL
      const dpFilled = current > 0 || 
                      (slotCounts.LB || 0) > 0 ||
                      (slotCounts.DB || 0) > 0 ||
                      (slotCounts.DL || 0) > 0;
      if (!dpFilled) {
        needs.push('DP');
      } else {
        filled.push('DP');
      }
    } else {
      if (current < required) {
        needs.push(position);
      } else {
        filled.push(position);
      }
    }
  });
  
  // Check if FLEX is needed (after filling RB/WR requirements)
  const flexNeeds = !filled.includes('FLEX') && 
                   filled.includes('RB') && 
                   filled.includes('WR');
  
  // Calculate bench space (assuming max roster of 14)
  const totalRoster = currentRoster.length;
  const benchSpace = Math.max(0, 14 - totalRoster);
  
  return {
    needs,
    filled,
    flexNeeds,
    benchSpace
  };
}

/**
 * Calculate recommendation score for a player based on roster needs
 */
function calculateRecommendationScore(
  player: Player,
  rosterAnalysis: RosterAnalysis,
  roundNumber: number
): number {
  let score = player.points || 0;
  
  // Base score is the player's last season points
  if (score === 0) return 0;
  
  // Apply position need multiplier
  let needMultiplier = 1.0;
  
  if (rosterAnalysis.needs.includes(player.position)) {
    needMultiplier = 2.0; // Double value if position is needed
  } else if (player.position === 'RB' || player.position === 'WR') {
    // Check if can fill FLEX
    if (rosterAnalysis.flexNeeds) {
      needMultiplier = 1.5;
    } else if (rosterAnalysis.benchSpace > 0) {
      needMultiplier = 0.7; // Lower priority for bench
    } else {
      needMultiplier = 0.3; // Very low if position is full and no bench space
    }
  } else if (['DP', 'LB', 'DB', 'DL'].includes(player.position)) {
    // Check if can fill DP slot
    if (rosterAnalysis.needs.includes('DP')) {
      needMultiplier = 1.8;
    } else if (rosterAnalysis.benchSpace > 0) {
      needMultiplier = 0.5;
    } else {
      needMultiplier = 0.2;
    }
  } else if (rosterAnalysis.filled.includes(player.position)) {
    // Position is already filled
    if (rosterAnalysis.benchSpace > 0) {
      needMultiplier = 0.5; // Can draft for bench
    } else {
      needMultiplier = 0.1; // Very low priority
    }
  }
  
  score *= needMultiplier;
  
  // Apply scarcity multiplier
  const scarcityMultiplier = SCARCITY_MULTIPLIERS[player.position as keyof typeof SCARCITY_MULTIPLIERS] || 1.0;
  score *= scarcityMultiplier;
  
  // Apply round-based adjustments
  if (roundNumber <= 5) {
    // Early rounds - prioritize core positions
    const earlyPriority = EARLY_ROUND_PRIORITY[player.position as keyof typeof EARLY_ROUND_PRIORITY] || 10;
    score *= (11 - earlyPriority) / 10; // Convert priority to multiplier
  }
  
  return Math.round(score * 100) / 100;
}

/**
 * Get draft recommendations based on available players and roster needs
 */
export function getDraftRecommendations(
  availablePlayers: Player[],
  currentRoster: Array<{ slot: string; position?: string }>,
  roundNumber: number = 1,
  topN: number = 10
): PlayerRecommendation[] {
  const rosterAnalysis = analyzeRosterNeeds(currentRoster);
  
  // Calculate scores for all available players
  const recommendations = availablePlayers
    .filter(player => player.available)
    .map(player => {
      const score = calculateRecommendationScore(player, rosterAnalysis, roundNumber);
      
      // Determine reason for recommendation
      let reason = '';
      let priority: 'high' | 'medium' | 'low' = 'medium';
      
      if (rosterAnalysis.needs.includes(player.position)) {
        reason = `You need a ${player.position}`;
        priority = 'high';
      } else if ((player.position === 'RB' || player.position === 'WR') && rosterAnalysis.flexNeeds) {
        reason = `Can fill FLEX slot`;
        priority = 'high';
      } else if (['DP', 'LB', 'DB', 'DL'].includes(player.position) && rosterAnalysis.needs.includes('DP')) {
        reason = `Can fill DP slot`;
        priority = 'high';
      } else if (rosterAnalysis.benchSpace > 0) {
        reason = `Good value for bench`;
        priority = 'low';
      } else {
        reason = `Best available player`;
        priority = 'medium';
      }
      
      // Add points to reason
      if (player.points > 0) {
        reason += ` (${player.points} pts last season)`;
      }
      
      return {
        player,
        score,
        reason,
        priority
      };
    })
    .filter(rec => rec.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
  
  return recommendations;
}

/**
 * Check if a player can be drafted based on roster limits
 */
export function canDraftPlayer(
  player: Player,
  currentRoster: Array<{ slot: string; position?: string }>
): { canDraft: boolean; reason?: string } {
  const slotCounts: Record<string, number> = {};
  
  currentRoster.forEach(item => {
    slotCounts[item.slot] = (slotCounts[item.slot] || 0) + 1;
  });
  
  // Check specific position limits
  if (player.position === 'QB' && (slotCounts.QB || 0) >= ROSTER_REQUIREMENTS.QB) {
    if ((slotCounts.BENCH || 0) >= 4) {
      return { canDraft: false, reason: 'Roster is full' };
    }
  }
  
  if (player.position === 'K' && (slotCounts.K || 0) >= ROSTER_REQUIREMENTS.K) {
    return { canDraft: false, reason: 'Already have maximum kickers' };
  }
  
  if (player.position === 'DEF' && (slotCounts.DEF || 0) >= ROSTER_REQUIREMENTS.DEF) {
    return { canDraft: false, reason: 'Already have maximum defenses' };
  }
  
  if (player.position === 'TE' && (slotCounts.TE || 0) >= ROSTER_REQUIREMENTS.TE) {
    if ((slotCounts.BENCH || 0) >= 4) {
      return { canDraft: false, reason: 'Roster is full' };
    }
  }
  
  // Check if roster is completely full (14 players max)
  const totalPlayers = Object.values(slotCounts).reduce((sum, count) => sum + count, 0);
  if (totalPlayers >= 14) {
    return { canDraft: false, reason: 'Roster is full (14 players max)' };
  }
  
  return { canDraft: true };
}