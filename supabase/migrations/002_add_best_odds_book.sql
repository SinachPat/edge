-- Stage 2 (pick reasoning) computes bestOddsBook but the initial schema had
-- nowhere to persist it, even though the pick card UI displays it.
ALTER TABLE picks ADD COLUMN best_odds_book TEXT;
