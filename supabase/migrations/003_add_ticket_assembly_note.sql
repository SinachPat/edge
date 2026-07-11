-- Stage 3 (ticket assembly) computes a one-sentence rationale for each ticket
-- but the initial schema had nowhere to persist it, even though the ticket
-- card UI displays it.
ALTER TABLE tickets ADD COLUMN assembly_note TEXT;
