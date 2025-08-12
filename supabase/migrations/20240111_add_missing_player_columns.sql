-- Add missing columns to players table for Sleeper API integration
ALTER TABLE players
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS height VARCHAR(10),
ADD COLUMN IF NOT EXISTS weight INTEGER,
ADD COLUMN IF NOT EXISTS college VARCHAR(100),
ADD COLUMN IF NOT EXISTS years_exp INTEGER DEFAULT 0;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_age ON players(age);
CREATE INDEX IF NOT EXISTS idx_players_years_exp ON players(years_exp);
CREATE INDEX IF NOT EXISTS idx_players_college ON players(college);

-- Update RLS policies to include new columns
-- (Existing policies should already cover these as they use SELECT *)