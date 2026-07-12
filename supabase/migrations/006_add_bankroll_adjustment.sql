-- Bankroll had no way to be corrected after the first set — adjustment_amount
-- tracks manual balance corrections (deposits/withdrawals/fixes) separately
-- from betting P&L, so ROI/streak/best-day stats (which measure betting
-- performance) aren't skewed by money that moved for non-betting reasons.
alter table bankroll
  add column if not exists adjustment_amount numeric not null default 0,
  add column if not exists adjustment_note text;

comment on column bankroll.adjustment_amount is 'Manual balance correction for that day (deposit/withdrawal/correction), excluded from betting P&L stats';
comment on column bankroll.adjustment_note is 'Optional free-text reason for the adjustment';
