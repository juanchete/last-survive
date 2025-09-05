-- Add ADP (Average Draft Position) columns to players table
-- These help with draft strategy and player rankings

-- Add ADP columns
ALTER TABLE players ADD COLUMN IF NOT EXISTS adp_standard DECIMAL(5,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS adp_ppr DECIMAL(5,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS adp_2qb DECIMAL(5,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS adp_rookie DECIMAL(5,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS adp_dynasty DECIMAL(5,2);
ALTER TABLE players ADD COLUMN IF NOT EXISTS adp_dynasty_ppr DECIMAL(5,2);

-- Add indexes for ADP lookups (useful for sorting by draft value)
CREATE INDEX IF NOT EXISTS idx_players_adp_standard ON players(adp_standard) WHERE adp_standard IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_adp_ppr ON players(adp_ppr) WHERE adp_ppr IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_position_adp ON players(position, adp_standard) WHERE adp_standard IS NOT NULL;

-- Add comments to explain the columns
COMMENT ON COLUMN players.adp_standard IS 'Average Draft Position in standard scoring leagues';
COMMENT ON COLUMN players.adp_ppr IS 'Average Draft Position in PPR (Point Per Reception) leagues';
COMMENT ON COLUMN players.adp_2qb IS 'Average Draft Position in 2-QB/Superflex leagues';
COMMENT ON COLUMN players.adp_rookie IS 'Average Draft Position in rookie-only drafts';
COMMENT ON COLUMN players.adp_dynasty IS 'Average Draft Position in dynasty leagues';
COMMENT ON COLUMN players.adp_dynasty_ppr IS 'Average Draft Position in dynasty PPR leagues';