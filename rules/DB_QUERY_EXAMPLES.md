# 📝 Ejemplos de Consultas SQL — NFL Fantasy Survivor

---

## 1. Obtener todos los equipos fantasy activos de una liga ordenados por ranking
```sql
SELECT *
FROM fantasy_teams
WHERE league_id = '<league_id>' AND eliminated = FALSE
ORDER BY rank ASC;
```

---

## 2. Obtener el roster actual de un equipo fantasy para una semana específica
```sql
SELECT p.*
FROM team_rosters tr
JOIN players p ON tr.player_id = p.id
WHERE tr.fantasy_team_id = '<fantasy_team_id>'
  AND tr.week = <week_number>
  AND tr.is_active = TRUE;
```

---

## 3. Consultar la prioridad de waivers de una liga para una semana
```sql
SELECT wp.*, ft.name AS team_name
FROM waiver_priority wp
JOIN fantasy_teams ft ON wp.fantasy_team_id = ft.id
WHERE wp.league_id = '<league_id>' AND wp.week = <week_number>
ORDER BY wp.priority ASC;
```

---

## 4. Ver solicitudes de waivers pendientes para una liga y semana
```sql
SELECT wr.*, p.name AS player_name, ft.name AS team_name
FROM waiver_requests wr
JOIN players p ON wr.player_id = p.id
JOIN fantasy_teams ft ON wr.fantasy_team_id = ft.id
WHERE wr.league_id = '<league_id>' AND wr.week = <week_number> AND wr.status = 'pending';
```

---

## 5. Consultar estadísticas de un jugador por semana
```sql
SELECT *
FROM player_stats
WHERE player_id = <player_id>
ORDER BY week ASC;
```

---

## 6. Buscar jugadores disponibles para draftear en una liga (no en ningún roster activo esa semana)
```sql
SELECT p.*
FROM players p
WHERE p.id NOT IN (
  SELECT tr.player_id
  FROM team_rosters tr
  WHERE tr.week = <week_number> AND tr.is_active = TRUE
)
ORDER BY p.position, p.name;
```

---

## 7. Ver el equipo fantasy eliminado en una semana específica
```sql
SELECT *
FROM fantasy_teams
WHERE league_id = '<league_id>' AND eliminated_week = <week_number>;
```

---

## 8. Ranking histórico de equipos fantasy en una liga
```sql
SELECT ft.name, ft.points, ft.rank, ft.eliminated, ft.eliminated_week
FROM fantasy_teams ft
WHERE ft.league_id = '<league_id>'
ORDER BY ft.rank ASC;
```

---

¿Necesitas ejemplos de consultas más avanzadas o específicas? Pídemelo según tu caso de uso. 