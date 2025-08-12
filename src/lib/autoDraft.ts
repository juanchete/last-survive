import { Player } from "@/types";
import { draftPlayer } from "./draft";

export interface AutoDraftOptions {
  leagueId: string;
  fantasyTeamId: string;
  availablePlayers: Player[];
  currentRoster: Array<{ slot: string; position?: string; [key: string]: unknown }>;
  currentWeek: number;
}

// Límites de slots para el auto-draft (sin banca - 9 jugadores totales)
const SLOT_LIMITS = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1,  // Solo RB/WR
  K: 1,
  DEF: 1,
  DP: 1,    // Defensive Player
};

// Prioridades de posiciones para auto-draft (orden de importancia)
const POSITION_PRIORITY = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 4,
  K: 5,
  DEF: 6,
  DP: 7,
};

/**
 * Cuenta los slots ocupados por posición
 */
const getSlotCounts = (roster: Array<{ slot: string; [key: string]: unknown }>) => {
  return roster.reduce((acc, item) => {
    acc[item.slot] = (acc[item.slot] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

/**
 * Verifica si una posición específica necesita ser llenada
 */
const needsPosition = (
  position: string,
  slotCounts: Record<string, number>
): boolean => {
  switch (position) {
    case "QB":
      return (slotCounts.QB || 0) < SLOT_LIMITS.QB;
    case "RB":
      // RB puede ir en su slot o en FLEX
      const rbCount = (slotCounts.RB || 0);
      const flexUsedByRB = roster => 
        roster.filter(r => r.slot === "FLEX" && r.position === "RB").length;
      return rbCount < SLOT_LIMITS.RB;
    case "WR":
      // WR puede ir en su slot o en FLEX
      const wrCount = (slotCounts.WR || 0);
      return wrCount < SLOT_LIMITS.WR;
    case "TE":
      return (slotCounts.TE || 0) < SLOT_LIMITS.TE;
    case "K":
      return (slotCounts.K || 0) < SLOT_LIMITS.K;
    case "DEF":
      return (slotCounts.DEF || 0) < SLOT_LIMITS.DEF;
    case "DP":
      return (slotCounts.DP || 0) < SLOT_LIMITS.DP;
    default:
      return false;
  }
};

/**
 * Determina el slot disponible para un jugador
 */
const getAvailableSlot = (
  player: Player,
  currentRoster: Array<{ slot: string; position?: string; [key: string]: unknown }>
): string | null => {
  const slotCounts = getSlotCounts(currentRoster);

  const canDraftInSlot = (slot: string) => {
    return (slotCounts[slot] || 0) < SLOT_LIMITS[slot];
  };

  // Verificar slots específicos primero
  if (player.position === "QB" && canDraftInSlot("QB")) return "QB";
  if (player.position === "RB" && canDraftInSlot("RB")) return "RB";
  if (player.position === "WR" && canDraftInSlot("WR")) return "WR";
  if (player.position === "TE" && canDraftInSlot("TE")) return "TE";
  if (player.position === "K" && canDraftInSlot("K")) return "K";
  if (player.position === "DEF" && canDraftInSlot("DEF")) return "DEF";
  // DP slot can be filled by DP, LB, DB, or DL positions
  if (["DP", "LB", "DB", "DL"].includes(player.position) && canDraftInSlot("DP")) return "DP";
  
  // FLEX solo para RB/WR (no TE)
  if (["RB", "WR"].includes(player.position) && canDraftInSlot("FLEX")) {
    return "FLEX";
  }
  
  return null;
};

/**
 * Obtiene las posiciones que necesitan ser llenadas, ordenadas por prioridad
 */
const getNeededPositions = (
  currentRoster: Array<{ slot: string; position?: string; [key: string]: unknown }>
): string[] => {
  const slotCounts = getSlotCounts(currentRoster);
  const needed: string[] = [];

  // Verificar cada posición en orden de prioridad
  const positions = Object.keys(POSITION_PRIORITY).sort(
    (a, b) => POSITION_PRIORITY[a as keyof typeof POSITION_PRIORITY] - 
              POSITION_PRIORITY[b as keyof typeof POSITION_PRIORITY]
  );

  for (const position of positions) {
    if (needsPosition(position, slotCounts)) {
      needed.push(position);
    }
  }

  // Verificar si necesitamos llenar FLEX (después de RB/WR principales)
  if ((slotCounts.FLEX || 0) < SLOT_LIMITS.FLEX) {
    // Solo agregar si ya tenemos los RB y WR principales
    if ((slotCounts.RB || 0) >= SLOT_LIMITS.RB && 
        (slotCounts.WR || 0) >= SLOT_LIMITS.WR) {
      // FLEX puede ser llenado por RB o WR
      if (!needed.includes("RB") && !needed.includes("WR")) {
        needed.push("FLEX");
      }
    }
  }

  return needed;
};

/**
 * Ejecuta el auto-draft priorizando posiciones faltantes
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
    // Obtener posiciones necesarias en orden de prioridad
    const neededPositions = getNeededPositions(currentRoster);
    
    // Si no necesitamos ninguna posición específica, el roster está completo
    if (neededPositions.length === 0) {
      return {
        success: false,
        error: "Roster completo (9 jugadores)",
      };
    }

    let selectedPlayer: Player | null = null;
    let selectedSlot: string | null = null;

    // Intentar llenar posiciones en orden de prioridad
    for (const neededPosition of neededPositions) {
      let candidatePlayers: Player[] = [];

      if (neededPosition === "FLEX") {
        // Para FLEX, buscar RB o WR disponibles
        candidatePlayers = availablePlayers.filter(player => {
          if (!player.available) return false;
          if (!["RB", "WR"].includes(player.position)) return false;
          const slot = getAvailableSlot(player, currentRoster);
          return slot === "FLEX";
        });
      } else if (neededPosition === "DP") {
        // Para DP, buscar cualquier defensive player (DP, LB, DB, DL)
        candidatePlayers = availablePlayers.filter(player => {
          if (!player.available) return false;
          if (!["DP", "LB", "DB", "DL"].includes(player.position)) return false;
          const slot = getAvailableSlot(player, currentRoster);
          return slot === "DP";
        });
      } else {
        // Para otras posiciones, buscar jugadores de esa posición específica
        candidatePlayers = availablePlayers.filter(player => {
          if (!player.available) return false;
          if (player.position !== neededPosition) return false;
          const slot = getAvailableSlot(player, currentRoster);
          return slot !== null;
        });
      }

      // Si encontramos candidatos, seleccionar el mejor por ranking (PPJ)
      if (candidatePlayers.length > 0) {
        // Ordenar por puntos (PPJ) descendente
        candidatePlayers.sort((a, b) => (b.points || 0) - (a.points || 0));
        selectedPlayer = candidatePlayers[0];
        selectedSlot = getAvailableSlot(selectedPlayer, currentRoster);
        break;
      }
    }

    // Si no encontramos jugador para posiciones prioritarias,
    // buscar el mejor jugador disponible que pueda ser drafteado
    if (!selectedPlayer || !selectedSlot) {
      const allDraftablePlayers = availablePlayers.filter(player => {
        if (!player.available) return false;
        const slot = getAvailableSlot(player, currentRoster);
        return slot !== null;
      });

      if (allDraftablePlayers.length === 0) {
        return {
          success: false,
          error: "No hay jugadores disponibles para auto-draft",
        };
      }

      // Ordenar por puntos (PPJ) y tomar el mejor
      allDraftablePlayers.sort((a, b) => (b.points || 0) - (a.points || 0));
      selectedPlayer = allDraftablePlayers[0];
      selectedSlot = getAvailableSlot(selectedPlayer, currentRoster)!;
    }

    // Ejecutar el draft
    await draftPlayer({
      leagueId,
      fantasyTeamId,
      playerId: Number(selectedPlayer.id),
      week: currentWeek,
      slot: selectedSlot,
    });

    console.log(`Auto-draft: ${selectedPlayer.name} (${selectedPlayer.position}) en slot ${selectedSlot}`);

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