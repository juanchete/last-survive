-- Insertar jugadores de prueba para testing del draft
-- Ejecutar en Supabase Dashboard > SQL Editor

-- Primero, agregar algunos equipos NFL si no existen
INSERT INTO nfl_teams (id, name, abbreviation, eliminated, elimination_week) VALUES 
(1, 'Kansas City Chiefs', 'KC', false, null),
(2, 'Buffalo Bills', 'BUF', false, null),
(3, 'Philadelphia Eagles', 'PHI', false, null),
(4, 'San Francisco 49ers', 'SF', false, null),
(5, 'Miami Dolphins', 'MIA', false, null)
ON CONFLICT (id) DO NOTHING;

-- Insertar jugadores de prueba
INSERT INTO players (id, name, position, nfl_team_id, photo_url) VALUES 
-- Quarterbacks
(1, 'Patrick Mahomes', 'QB', 1, 'https://via.placeholder.com/150'),
(2, 'Josh Allen', 'QB', 2, 'https://via.placeholder.com/150'),
(3, 'Jalen Hurts', 'QB', 3, 'https://via.placeholder.com/150'),
(4, 'Brock Purdy', 'QB', 4, 'https://via.placeholder.com/150'),
(5, 'Tua Tagovailoa', 'QB', 5, 'https://via.placeholder.com/150'),

-- Running Backs
(10, 'Christian McCaffrey', 'RB', 4, 'https://via.placeholder.com/150'),
(11, 'Austin Ekeler', 'RB', 5, 'https://via.placeholder.com/150'),
(12, 'Derrick Henry', 'RB', 2, 'https://via.placeholder.com/150'),
(13, 'Isiah Pacheco', 'RB', 1, 'https://via.placeholder.com/150'),
(14, 'Miles Sanders', 'RB', 3, 'https://via.placeholder.com/150'),

-- Wide Receivers
(20, 'Tyreek Hill', 'WR', 5, 'https://via.placeholder.com/150'),
(21, 'Stefon Diggs', 'WR', 2, 'https://via.placeholder.com/150'),
(22, 'A.J. Brown', 'WR', 3, 'https://via.placeholder.com/150'),
(23, 'Travis Kelce', 'TE', 1, 'https://via.placeholder.com/150'),
(24, 'Deebo Samuel', 'WR', 4, 'https://via.placeholder.com/150'),

-- Tight Ends
(30, 'Mark Andrews', 'TE', 2, 'https://via.placeholder.com/150'),
(31, 'Dallas Goedert', 'TE', 3, 'https://via.placeholder.com/150'),
(32, 'George Kittle', 'TE', 4, 'https://via.placeholder.com/150'),

-- Kickers
(40, 'Harrison Butker', 'K', 1, 'https://via.placeholder.com/150'),
(41, 'Tyler Bass', 'K', 2, 'https://via.placeholder.com/150'),
(42, 'Jake Elliott', 'K', 3, 'https://via.placeholder.com/150'),

-- Defenses
(50, 'Chiefs Defense', 'DEF', 1, 'https://via.placeholder.com/150'),
(51, 'Bills Defense', 'DEF', 2, 'https://via.placeholder.com/150'),
(52, 'Eagles Defense', 'DEF', 3, 'https://via.placeholder.com/150')

ON CONFLICT (id) DO NOTHING;

-- Insertar estadísticas de ejemplo para estos jugadores (omitir columna id para auto-generación)
INSERT INTO player_stats (player_id, week, season, fantasy_points) VALUES 
-- Week 1 stats
(1, 1, 2024, 25.5),  -- Mahomes
(2, 1, 2024, 22.3),  -- Allen
(3, 1, 2024, 18.7),  -- Hurts
(10, 1, 2024, 21.2), -- McCaffrey
(11, 1, 2024, 15.8), -- Ekeler
(20, 1, 2024, 19.5), -- Tyreek
(21, 1, 2024, 16.9), -- Diggs
(23, 1, 2024, 14.2), -- Kelce
(40, 1, 2024, 8.0),  -- Butker
(50, 1, 2024, 12.0); -- Chiefs D 