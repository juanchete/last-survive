# 📑 Índices y Vistas Sugeridas — NFL Fantasy Survivor

---

## Índices Sugeridos

1. **users**
   - `CREATE UNIQUE INDEX idx_users_email ON users(email);`

2. **leagues**
   - `CREATE INDEX idx_leagues_owner_id ON leagues(owner_id);`
   - `CREATE INDEX idx_leagues_private_code ON leagues(private_code);`

3. **league_members**
   - `CREATE INDEX idx_league_members_league_id ON league_members(league_id);`
   - `CREATE INDEX idx_league_members_user_id ON league_members(user_id);`
   - `CREATE INDEX idx_league_members_team_id ON league_members(team_id);`

4. **fantasy_teams**
   - `CREATE INDEX idx_fantasy_teams_league_id ON fantasy_teams(league_id);`
   - `CREATE INDEX idx_fantasy_teams_user_id ON fantasy_teams(user_id);`
   - `CREATE INDEX idx_fantasy_teams_rank ON fantasy_teams(rank);`

5. **nfl_teams**
   - `CREATE INDEX idx_nfl_teams_abbreviation ON nfl_teams(abbreviation);`

6. **players**
   - `CREATE INDEX idx_players_nfl_team_id ON players(nfl_team_id);`
   - `CREATE INDEX idx_players_position ON players(position);`

7. **player_stats**
   - `CREATE INDEX idx_player_stats_player_id_week ON player_stats(player_id, week);`

8. **weeks**
   - `CREATE INDEX idx_weeks_league_id ON weeks(league_id);`
   - `CREATE INDEX idx_weeks_number ON weeks(number);`

9. **team_rosters**
   - `CREATE INDEX idx_team_rosters_fantasy_team_id_week ON team_rosters(fantasy_team_id, week);`
   - `CREATE INDEX idx_team_rosters_player_id_week ON team_rosters(player_id, week);`

10. **waiver_priority**
    - `CREATE INDEX idx_waiver_priority_league_id_week ON waiver_priority(league_id, week);`

11. **waiver_requests**
    - `CREATE INDEX idx_waiver_requests_league_id_week ON waiver_requests(league_id, week);`
    - `CREATE INDEX idx_waiver_requests_fantasy_team_id ON waiver_requests(fantasy_team_id);`
    - `CREATE INDEX idx_waiver_requests_player_id ON waiver_requests(player_id);`

---

## Vistas Sugeridas

### 1. Vista: Ranking de Equipos Fantasy por Liga
```sql
CREATE VIEW league_fantasy_team_ranking AS
SELECT 
  ft.id AS fantasy_team_id,
  ft.league_id,
  ft.name AS team_name,
  ft.points,
  ft.rank,
  ft.eliminated,
  u.full_name AS owner_name
FROM fantasy_teams ft
JOIN users u ON ft.user_id = u.id;
```

### 2. Vista: Roster Actual de un Equipo Fantasy
```sql
CREATE VIEW current_team_roster AS
SELECT 
  tr.fantasy_team_id,
  tr.player_id,
  p.name AS player_name,
  p.position,
  tr.week,
  tr.is_active,
  tr.acquired_type
FROM team_rosters tr
JOIN players p ON tr.player_id = p.id
WHERE tr.is_active = TRUE;
```

### 3. Vista: Waiver Priority Actual por Liga y Semana
```sql
CREATE VIEW current_waiver_priority AS
SELECT 
  wp.league_id,
  wp.week,
  wp.fantasy_team_id,
  ft.name AS team_name,
  wp.priority
FROM waiver_priority wp
JOIN fantasy_teams ft ON wp.fantasy_team_id = ft.id;
```

### 4. Vista: Estadísticas de Jugadores por Semana
```sql
CREATE VIEW player_weekly_stats AS
SELECT 
  ps.player_id,
  p.name AS player_name,
  p.position,
  ps.week,
  ps.season,
  ps.fantasy_points
FROM player_stats ps
JOIN players p ON ps.player_id = p.id;
```

---

¿Agregar más vistas específicas? Puedes pedírmelo según tus necesidades de reporting o queries frecuentes. 