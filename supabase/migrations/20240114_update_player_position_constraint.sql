-- Update the position check constraint to include IDP (Individual Defensive Player) positions
-- This allows for more flexible fantasy formats including defensive players

-- First, drop the existing constraint
ALTER TABLE players 
DROP CONSTRAINT IF EXISTS players_position_check;

-- Add the updated constraint with all fantasy-relevant positions
ALTER TABLE players 
ADD CONSTRAINT players_position_check 
CHECK (position IN ('QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DP', 'LB', 'DB', 'DL', 'FLEX'));

-- Add comment explaining the positions
COMMENT ON CONSTRAINT players_position_check ON players IS 
'Valid fantasy football positions including standard offensive positions (QB, RB, WR, TE, K), team defense (DEF), and IDP positions (DP, LB, DB, DL) for leagues with individual defensive players';