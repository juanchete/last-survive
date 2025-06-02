import { Player } from "@/types";
import { draftPlayer } from "./draft";

export interface AutoDraftOptions {
  leagueId: string;
  fantasyTeamId: string;
  availablePlayers: Player[];
  currentRoster: Array<{ slot: string; [key: string]: unknown }>;
  currentWeek: number;
}

// Límites de slots para el auto-draft
const SLOT_LIMITS = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1,
  K: 1,
  DEF: 1,
  BENCH: 7,
};

// Prioridades de posiciones para auto-draft
const POSITION_PRIORITY = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 4,
  K: 5,
  DEF: 6,
};

/**
 * Determina el slot disponible para un jugador
 */
const getAvailableSlot = (
  player: Player,
  currentRoster: Array<{ slot: string; [key: string]: unknown }>
) => {
  // Contar slots ocupados
  const slotCounts = currentRoster.reduce((acc, item) => {
    acc[item.slot] = (acc[item.slot] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const canDraftInSlot = (slot: string) => {
    return (slotCounts[slot] || 0) < SLOT_LIMITS[slot];
  };

  if (player.position === "QB" && canDraftInSlot("QB")) return "QB";
  if (player.position === "RB" && canDraftInSlot("RB")) return "RB";
  if (player.position === "WR" && canDraftInSlot("WR")) return "WR";
  if (player.position === "TE" && canDraftInSlot("TE")) return "TE";
  if (["RB", "WR", "TE"].includes(player.position) && canDraftInSlot("FLEX"))
    return "FLEX";
  if (player.position === "K" && canDraftInSlot("K")) return "K";
  if (player.position === "DEF" && canDraftInSlot("DEF")) return "DEF";
  if (canDraftInSlot("BENCH")) return "BENCH";
  return null;
};

/**
 * Calcula la puntuación de necesidad para una posición
 * Mayor puntuación = mayor necesidad
 */
const getPositionNeed = (
  position: string,
  currentRoster: Array<{ slot: string; [key: string]: unknown }>
) => {
  const slotCounts = currentRoster.reduce((acc, item) => {
    acc[item.slot] = (acc[item.slot] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calcular slots vacíos para esta posición
  const positionSlots = {
    QB: slotCounts.QB || 0,
    RB: (slotCounts.RB || 0) + (slotCounts.FLEX || 0), // RB puede ir en FLEX
    WR: (slotCounts.WR || 0) + (slotCounts.FLEX || 0), // WR puede ir en FLEX
    TE: (slotCounts.TE || 0) + (slotCounts.FLEX || 0), // TE puede ir en FLEX
    K: slotCounts.K || 0,
    DEF: slotCounts.DEF || 0,
  };

  const maxSlots = {
    QB: SLOT_LIMITS.QB,
    RB: SLOT_LIMITS.RB + SLOT_LIMITS.FLEX,
    WR: SLOT_LIMITS.WR + SLOT_LIMITS.FLEX,
    TE: SLOT_LIMITS.TE + SLOT_LIMITS.FLEX,
    K: SLOT_LIMITS.K,
    DEF: SLOT_LIMITS.DEF,
  };

  const filled = positionSlots[position as keyof typeof positionSlots] || 0;
  const max = maxSlots[position as keyof typeof maxSlots] || 0;
  const need = max - filled;

  // Prioridad base por posición + necesidad
  return (
    need * 10 +
    (10 - (POSITION_PRIORITY[position as keyof typeof POSITION_PRIORITY] || 7))
  );
};

/**
 * Ejecuta el auto-draft seleccionando el mejor jugador disponible
 */
export const executeAutoDraft = async ({
  leagueId,
  fantasyTeamId,
  availablePlayers,
  currentRoster,
  currentWeek,
}: AutoDraftOptions): Promise<{
  success: boolean;
  player?: Player;
  error?: string;
}> => {
  try {
    // Filtrar jugadores disponibles
    const draftablePlayers = availablePlayers.filter((player) => {
      if (!player.available) return false;
      const slot = getAvailableSlot(player, currentRoster);
      return slot !== null;
    });

    if (draftablePlayers.length === 0) {
      return {
        success: false,
        error: "No hay jugadores disponibles para auto-draft",
      };
    }

    // Calcular puntuación para cada jugador
    const scoredPlayers = draftablePlayers.map((player) => {
      const positionNeed = getPositionNeed(player.position, currentRoster);
      const playerScore = player.points || 0;

      // Puntuación final: combina necesidad de posición y puntos del jugador
      const finalScore = positionNeed * 0.3 + playerScore * 0.7;

      return {
        ...player,
        autoDraftScore: finalScore,
        slot: getAvailableSlot(player, currentRoster)!,
      };
    });

    // Ordenar por puntuación descendente
    scoredPlayers.sort((a, b) => b.autoDraftScore - a.autoDraftScore);

    // Seleccionar el mejor jugador
    const selectedPlayer = scoredPlayers[0];

    // Ejecutar el draft
    await draftPlayer({
      leagueId,
      fantasyTeamId,
      playerId: Number(selectedPlayer.id),
      week: currentWeek,
      slot: selectedPlayer.slot,
    });

    return {
      success: true,
      player: selectedPlayer,
    };
  } catch (error) {
    console.error("Error en auto-draft:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido en auto-draft",
    };
  }
};
