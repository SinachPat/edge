-- Settlement resolves each pick's status (won/lost/void) but never persisted
-- the actual final score, so the app can't show what happened in the match —
-- only whether the pick won.
ALTER TABLE picks ADD COLUMN final_home_goals INTEGER;
ALTER TABLE picks ADD COLUMN final_away_goals INTEGER;
