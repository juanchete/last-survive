-- Improve duplicate cleanup function with better error logging
-- This will help us understand why deletions are failing

CREATE OR REPLACE FUNCTION clean_duplicate_players()
RETURNS JSON AS $$
DECLARE
  duplicate_count INTEGER := 0;
  migrated_count INTEGER := 0;
  deleted_count INTEGER := 0;
  error_count INTEGER := 0;
  duplicate_record RECORD;
  original_player_id INTEGER;
  migration_result JSON;
  result JSON;
  error_details TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Process each duplicate player
  FOR duplicate_record IN 
    SELECT p1.id, p1.name, p1.position
    FROM players p1
    WHERE p1.sleeper_id IS NULL
    AND EXISTS (
      SELECT 1 
      FROM players p2 
      WHERE p2.sleeper_id IS NOT NULL 
      AND LOWER(TRIM(p2.name)) = LOWER(TRIM(p1.name))
      AND p2.position = p1.position
      AND p2.id != p1.id
    )
  LOOP
    duplicate_count := duplicate_count + 1;
    
    BEGIN
      -- Find the original player with sleeper_id
      SELECT id INTO original_player_id
      FROM players
      WHERE sleeper_id IS NOT NULL
      AND LOWER(TRIM(name)) = LOWER(TRIM(duplicate_record.name))
      AND position = duplicate_record.position
      AND id != duplicate_record.id
      LIMIT 1;

      IF original_player_id IS NOT NULL THEN
        -- Migrate references
        SELECT migrate_player_references(duplicate_record.id, original_player_id) INTO migration_result;
        migrated_count := migrated_count + 1;
        
        -- Delete the duplicate
        DELETE FROM players WHERE id = duplicate_record.id;
        deleted_count := deleted_count + 1;
        
        RAISE NOTICE 'Successfully migrated and deleted duplicate: % (ID: %)', duplicate_record.name, duplicate_record.id;
      ELSE
        error_count := error_count + 1;
        error_details := array_append(error_details, format('No original player found for %s (ID: %s)', duplicate_record.name, duplicate_record.id));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      error_details := array_append(error_details, format('Error processing %s (ID: %s): %s', duplicate_record.name, duplicate_record.id, SQLERRM));
      RAISE WARNING 'Error processing player % (ID: %): %', duplicate_record.name, duplicate_record.id, SQLERRM;
    END;
  END LOOP;

  result := json_build_object(
    'duplicate_count', duplicate_count,
    'migrated_count', migrated_count,
    'deleted_count', deleted_count,
    'error_count', error_count,
    'errors', error_details
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Also create a debug function to check what's preventing deletion
CREATE OR REPLACE FUNCTION debug_duplicate_player_constraints(player_id INTEGER)
RETURNS JSON AS $$
DECLARE
  result JSON;
  constraint_info TEXT[] := ARRAY[]::TEXT[];
  rec RECORD;
BEGIN
  -- Check all tables that might reference this player
  FOR rec IN 
    SELECT 
      tc.table_name,
      tc.constraint_name,
      ccu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.column_name = 'player_id'
    AND tc.table_schema = 'public'
  LOOP
    -- Check if this table has references to our player
    EXECUTE format('SELECT count(*) FROM %I WHERE player_id = $1', rec.table_name) 
    INTO result USING player_id;
    
    IF result::INTEGER > 0 THEN
      constraint_info := array_append(constraint_info, format('%s.%s: %s references', rec.table_name, rec.column_name, result::TEXT));
    END IF;
  END LOOP;

  RETURN json_build_object(
    'player_id', player_id,
    'constraints', constraint_info
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION debug_duplicate_player_constraints(INTEGER) TO authenticated;

-- Add comments
COMMENT ON FUNCTION clean_duplicate_players() IS 'Clean duplicate players with detailed error logging';
COMMENT ON FUNCTION debug_duplicate_player_constraints(INTEGER) IS 'Debug function to check what prevents player deletion';