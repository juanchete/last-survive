import { Player } from "@/types";
import { draftPlayer } from "./draft";
import { getDraftRecommendations } from "./draftRecommendations";

export interface AutoDraftOptions {
  leagueId: string;
  fantasyTeamId: string;
  availablePlayers: Player[];
  currentRoster: Array<{ slot: string; position?: string; [key: string]: unknown }>;
  currentWeek: number;
}

// Límites de slots para el auto-draft (10 jugadores mínimos)
const SLOT_LIMITS = {
  QB: 1,
  RB: 2,
  WR: 2,
  TE: 1,
  FLEX: 1,  // Solo RB/WR
  K: 1,
  DEF: 1,
  DP: 1,    // Defensive Player (DP, LB, DB, DL)
};

/**
 * Determina el slot disponible para un jugador
 */
const getAvailableSlot = (
  player: Player,
  currentRoster: Array<{ slot: string; position?: string; [key: string]: unknown }>
): string | null => {
  const slotCounts = currentRoster.reduce((acc, item) => {
    acc[item.slot] = (acc[item.slot] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
 * Ejecuta el auto-draft usando el sistema de recomendaciones inteligente
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
    // Calcular el número de ronda basado en el roster actual
    const roundNumber = Math.floor(currentRoster.length / 10) + 1; // Assuming 10 teams
    
    // Obtener recomendaciones usando el sistema inteligente
    const recommendations = getDraftRecommendations(
      availablePlayers,
      currentRoster,
      roundNumber,
      1 // Solo necesitamos la mejor recomendación
    );
    
    // Si no hay recomendaciones, verificar si el roster está completo
    if (recommendations.length === 0) {
      // Verificar si el roster tiene al menos 10 jugadores (límite mínimo)
      if (currentRoster.length >= 10) {
        return {
          success: false,
          error: "Roster completo (10 jugadores mínimo)",
        };
      }
      
      // Intentar con el método de respaldo si no hay recomendaciones
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

      // Ordenar por puntos de la temporada pasada y tomar el mejor
      allDraftablePlayers.sort((a, b) => (b.points || 0) - (a.points || 0));
      const selectedPlayer = allDraftablePlayers[0];
      const selectedSlot = getAvailableSlot(selectedPlayer, currentRoster)!;
      
      // Ejecutar el draft
      await draftPlayer({
        leagueId,
        fantasyTeamId,
        playerId: Number(selectedPlayer.id),
        week: currentWeek,
        slot: selectedSlot,
      });

      console.log(`Auto-draft (respaldo): ${selectedPlayer.name} (${selectedPlayer.position}) en slot ${selectedSlot}`);

      return {
        success: true,
        player: selectedPlayer,
      };
    }
    
    // Usar la mejor recomendación
    const topRecommendation = recommendations[0];
    const selectedPlayer = topRecommendation.player;
    
    // Determinar el slot apropiado para el jugador
    const selectedSlot = getAvailableSlot(selectedPlayer, currentRoster);
    
    if (!selectedSlot) {
      // Esto no debería pasar si la recomendación es correcta
      console.error("No se pudo determinar el slot para el jugador recomendado");
      return {
        success: false,
        error: "Error al determinar el slot para el jugador",
      };
    }

    // Ejecutar el draft
    await draftPlayer({
      leagueId,
      fantasyTeamId,
      playerId: Number(selectedPlayer.id),
      week: currentWeek,
      slot: selectedSlot,
    });

    console.log(`Auto-draft inteligente: ${selectedPlayer.name} (${selectedPlayer.position}) en slot ${selectedSlot} - ${topRecommendation.reason}`);

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