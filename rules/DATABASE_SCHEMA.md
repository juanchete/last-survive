# 📦 Esquema de Base de Datos — NFL Fantasy Survivor

> **Actualizado:** 29 Enero 2025  
> **Estado:** Incluye Sistema de Eliminación Automática, campo owner_plays, y puntajes automáticos

---

## 1. users
- `id` (PK, UUID)
- `email` (string, único)
- `full_name` (string)
- `avatar_url` (string, opcional)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `favorite_team` (string, opcional)

---

## 2. leagues
- `id` (PK, UUID)
- `name` (string)
- `description` (string, opcional)
- `entry_fee` (decimal, opcional)
- `image_url` (string, opcional)
- `is_private` (boolean)
- `private_code` (string, único, opcional)
- `owner_id` (FK → users.id)
- `max_members` (integer, opcional)
- `status` (varchar(20), default 'upcoming')
- `prize` (string, opcional)
- `start_date` (timestamp, opcional)
- `created_at` (timestamp)
- `draft_order` (UUID[], opcional) // Orden de picks para el draft
- `current_pick` (integer, opcional) // Índice del turno actual en el draft
- `draft_status` (varchar(20), default 'pending') // 'pending', 'in_progress', 'completed'
- `owner_plays` (boolean, default true)

---

## 3. league_invitations
- `id` (PK, UUID)
- `league_id` (FK → leagues.id) ON DELETE CASCADE
- `inviter_id` (FK → users.id) ON DELETE CASCADE
- `invitee_email` (string)
- `invite_code` (string, único)
- `status` (enum: 'pending', 'accepted', 'declined', 'expired', 'cancelled')
- `created_at` (timestamp, default NOW())
- `expires_at` (timestamp)
- UNIQUE(league_id, invitee_email) // Un email no puede tener múltiples invitaciones a la misma liga

---

## 4. league_members
- `id` (PK, UUID)
- `league_id` (FK → leagues.id)
- `user_id` (FK → users.id)
- `role` (enum: 'owner', 'member')
- `joined_at` (timestamp)
- `team_id` (FK → fantasy_teams.id, opcional)

---

## 5. fantasy_teams
- `id` (PK, UUID)
- `league_id` (FK → leagues.id)
- `user_id` (FK → users.id)
- `name` (string)
- `points` (decimal)
- `rank` (integer)
- `eliminated` (boolean)
- `eliminated_week` (integer, opcional)
- `created_at` (timestamp)

---

## 6. nfl_teams
- `id` (PK, UUID o int)
- `name` (string)
- `abbreviation` (string)
- `logo_url` (string, opcional)
- `eliminated` (boolean)
- `elimination_week` (integer, opcional)

---

## 7. players
- `id` (PK, UUID o int)
- `name` (string)
- `position` (enum: 'QB', 'RB', 'WR', 'TE', 'K', 'DEF')
- `nfl_team_id` (FK → nfl_teams.id)
- `photo_url` (string, opcional)

---

## 8. player_stats (opcional)
- `id` (PK, UUID)
- `player_id` (FK → players.id)
- `week` (integer)
- `season` (integer)
- `passing_yards`, `passing_td`, `rushing_yards`, etc. (campos numéricos según posición)
- `fantasy_points` (decimal)

---

## 9. weeks
- `id` (PK, UUID)
- `league_id` (FK → leagues.id)
- `number` (integer)
- `status` (enum: 'upcoming', 'active', 'completed')
- `eliminated_nfl_team_id` (FK → nfl_teams.id, opcional)
- `start_date` (date)
- `end_date` (date)

---

## 10. team_rosters
- `id` (PK, UUID)
- `fantasy_team_id` (FK → fantasy_teams.id)
- `player_id` (FK → players.id)
- `week` (integer)
- `is_active` (boolean)
- `acquired_type` (enum: 'draft', 'waivers', 'free_agent')
- `acquired_week` (integer)
- `slot` (varchar(10), opcional) // Posición en el roster: 'QB', 'RB1', 'FLEX', 'BENCH', etc.

---

## 11. waiver_priority
- `id` (PK, UUID)
- `league_id` (FK → leagues.id)
- `week` (integer)
- `fantasy_team_id` (FK → fantasy_teams.id)
- `priority` (integer) // 1 = mayor prioridad

---

## 12. waiver_requests
- `id` (PK, UUID)
- `league_id` (FK → leagues.id)
- `week` (integer)
- `fantasy_team_id` (FK → fantasy_teams.id)
- `player_id` (FK → players.id)
- `status` (enum: 'pending', 'approved', 'rejected')
- `created_at` (timestamp)

---

## 13. roster_moves
- `id` (PK, UUID)
- `fantasy_team_id` (FK → fantasy_teams.id)
- `player_id` (FK → players.id, INTEGER)
- `week` (integer)
- `action` (varchar(20)) // 'add', 'drop', 'waiver_claim', 'draft_pick', etc.
- `acquired_type` (varchar(20)) // 'draft', 'waivers', 'free_agent'
- `created_at` (timestamp)
- `previous_team_id` (FK → fantasy_teams.id, opcional)

---

## 14. notifications
- `id` (PK, UUID)
- `user_id` (FK → users.id)
- `league_id` (FK → leagues.id, opcional)
- `message` (string)
- `type` (enum: 'info', 'warning', 'success', 'error')
- `read` (boolean, default: false)
- `date` (timestamp, default: now())

---

## Notas
- Cuando encuentres una API de jugadores de la NFL, deberás poblar la tabla `players` y `nfl_teams`
- El sistema de invitaciones (`league_invitations`) permite tanto invitaciones por email como enlaces directos
- Los códigos de invitación expiran automáticamente después de 7 días por defecto
- La tabla `weeks` se usa para el sistema de eliminación semanal automático

---

## ⚙️ **Funciones Automáticas Implementadas**

### 🎯 **Sistema de Eliminación Automática**
```sql
-- Calcula puntaje semanal de un equipo
calculate_team_weekly_score(team_id UUID, week INTEGER, season INTEGER) RETURNS DECIMAL

-- Detecta equipo con menor puntaje en una liga
get_lowest_scoring_team(league_id UUID, week INTEGER, season INTEGER) RETURNS UUID

-- Procesa eliminación automática semanal
process_weekly_elimination(league_id UUID, week INTEGER, season INTEGER) RETURNS JSON

-- Libera jugadores eliminados al waiver pool
releasePlayersToWaivers(team_id UUID, week INTEGER) RETURNS VOID

-- Crear notificación de eliminación
createEliminationNotification(user_id UUID, league_id UUID, week INTEGER) RETURNS VOID
```

### 🔄 **Sistema de Puntajes Automáticos**
```sql
-- Trigger automático para actualizar puntajes en tiempo real
update_fantasy_team_points() RETURNS TRIGGER

-- Triggers aplicados a:
-- - player_stats (cuando se actualizan estadísticas)
-- - team_rosters (cuando cambian alineaciones)

-- Función para refrescar puntajes de una liga completa
refresh_league_points(league_id UUID, week INTEGER) RETURNS JSON
```

### 🏗️ **Sistema owner_plays**
```sql
-- Determina si un usuario debería tener fantasy_team
should_user_have_team(user_id UUID, league_id UUID) RETURNS BOOLEAN

-- Crea equipos faltantes automáticamente
create_missing_fantasy_teams() RETURNS JSON

-- Limpia equipos duplicados (bug fix)
cleanup_duplicate_fantasy_teams() RETURNS JSON

-- Trigger para crear equipos automáticamente
auto_create_fantasy_team() RETURNS TRIGGER
```

### 🧪 **Funciones de Testing**
```sql
-- Configura rosters realistas para testing
setup_realistic_test_rosters(league_id UUID) RETURNS JSON

-- Verifica puntajes calculados
verify_team_scores(league_id UUID, week INTEGER) RETURNS JSON

-- Simula eliminación para testing
simulate_elimination_for_testing(league_id UUID, week INTEGER) RETURNS JSON

-- Reset datos de eliminación
reset_league_eliminations(league_id UUID) RETURNS JSON
```

---

## 🔗 Relationships Overview

```
users
  ├── leagues (owner_id)
  ├── league_members (user_id)
  ├── fantasy_teams (user_id)
  ├── league_invitations (inviter_id)
  └── notifications (user_id)

leagues
  ├── league_members (league_id)
  ├── fantasy_teams (league_id)
  ├── waiver_priority (league_id)
  ├── waiver_requests (league_id)
  ├── league_invitations (league_id)
  └── notifications (league_id)

fantasy_teams
  ├── team_rosters (fantasy_team_id) -- ✅ CON TRIGGER
  ├── waiver_priority (fantasy_team_id)
  ├── waiver_requests (fantasy_team_id)
  ├── roster_moves (fantasy_team_id)
  └── league_members (team_id) -- ✅ VIA TRIGGER

players
  ├── player_stats (player_id) -- ✅ CON TRIGGER
  ├── team_rosters (player_id) -- ✅ CON TRIGGER
  ├── waiver_requests (player_id)
  └── roster_moves (player_id)
```

---

## 📝 **Cambios Recientes - 29 Enero 2025**

### ✅ **owner_plays Field**
- Campo `owner_plays` agregado a `leagues`
- Permite owners que solo administran vs. que juegan
- Trigger automático `auto_create_fantasy_team()` mejorado
- Función `cleanup_duplicate_fantasy_teams()` para bug fixes

### ✅ **Sistema de Puntajes Automático**
- Triggers en `player_stats` y `team_rosters`
- Función `update_fantasy_team_points()` para actualización en tiempo real
- Eliminación manual de actualización de puntajes

### ✅ **Sistema de Eliminación Completo**
- Funciones SQL completas para eliminación automática
- Liberación automática de jugadores via `is_active = false`
- Sistema de notificaciones integrado
- Funciones de testing y verificación

### ✅ **Optimizaciones**
- Índices agregados para queries frecuentes
- Funciones de utilidad para debugging
- Validaciones mejoradas en triggers
- Cleanup de datos duplicados automático