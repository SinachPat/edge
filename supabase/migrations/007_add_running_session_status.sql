-- Manual "run session now" trigger needs an in-progress status distinct from
-- 'held'/'generated' so the dashboard can show real-time feedback (a run can
-- take a couple of minutes end-to-end) instead of looking identical to "no
-- session yet" the whole time it's running.
alter table sessions drop constraint sessions_status_check;
alter table sessions add constraint sessions_status_check check (status in ('generated', 'held', 'running'));
