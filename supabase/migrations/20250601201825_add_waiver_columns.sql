-- Agregar columnas faltantes a waiver_requests para el sistema de waivers completo

-- Agregar columna para timestamp de procesamiento (si no existe)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'waiver_requests' AND column_name = 'processed_at') THEN
    ALTER TABLE waiver_requests ADD COLUMN processed_at TIMESTAMP DEFAULT NULL;
  END IF;
END $$;

-- Agregar columna para jugador a soltar (si no existe)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'waiver_requests' AND column_name = 'drop_player_id') THEN
    ALTER TABLE waiver_requests ADD COLUMN drop_player_id INTEGER REFERENCES players(id) DEFAULT NULL;
  END IF;
END $$;

-- Agregar columnas de configuración de deadline a leagues (si no existen)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leagues' AND column_name = 'waiver_deadline_day') THEN
    ALTER TABLE leagues ADD COLUMN waiver_deadline_day INTEGER DEFAULT 3; -- 3 = Martes
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leagues' AND column_name = 'waiver_deadline_hour') THEN
    ALTER TABLE leagues ADD COLUMN waiver_deadline_hour INTEGER DEFAULT 23; -- 23 = 11 PM
  END IF;
END $$;

-- Agregar índices para mejorar performance (si no existen)
CREATE INDEX IF NOT EXISTS idx_waiver_requests_processed_at 
ON waiver_requests(processed_at);

CREATE INDEX IF NOT EXISTS idx_waiver_requests_drop_player 
ON waiver_requests(drop_player_id);

-- Comentarios para documentar las columnas (solo si existen)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'waiver_requests' AND column_name = 'processed_at') THEN
    EXECUTE 'COMMENT ON COLUMN waiver_requests.processed_at IS ''Timestamp cuando se procesó la waiver request''';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'waiver_requests' AND column_name = 'drop_player_id') THEN
    EXECUTE 'COMMENT ON COLUMN waiver_requests.drop_player_id IS ''ID del jugador a soltar si el roster está lleno''';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'leagues' AND column_name = 'waiver_deadline_day') THEN
    EXECUTE 'COMMENT ON COLUMN leagues.waiver_deadline_day IS ''Día de la semana para deadline de waivers (1=Lunes, 7=Domingo)''';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'leagues' AND column_name = 'waiver_deadline_hour') THEN
    EXECUTE 'COMMENT ON COLUMN leagues.waiver_deadline_hour IS ''Hora del día para deadline de waivers (0-23)''';
  END IF;
END $$; 