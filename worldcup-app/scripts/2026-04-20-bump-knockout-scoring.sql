-- Data migration: bump knockout scoring to 2026 research-aligned values
-- Old defaults: R32=1, R16=2, QF=4, SF=8, Final=16 (max bracket = 80 pts)
-- New defaults: R32=2, R16=4, QF=8, SF=16, Final=32 (max bracket = 160 pts)
--
-- Only updates rows still at the old defaults so admin-customized values are preserved.
--
-- Run against Turso:
--   export $(grep -v '^#' .env.local | xargs)
--   turso db shell <db-name> < scripts/2026-04-20-bump-knockout-scoring.sql

UPDATE tournament_config
SET points_r32 = 2,
    points_r16 = 4,
    points_qf = 8,
    points_sf = 16,
    points_final = 32
WHERE points_r32 = 1
  AND points_r16 = 2
  AND points_qf = 4
  AND points_sf = 8
  AND points_final = 16;
