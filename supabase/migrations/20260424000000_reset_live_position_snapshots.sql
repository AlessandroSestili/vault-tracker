-- Reset position_snapshots per posizioni live (is_manual = false).
-- Motivo: pre-fix toEur, gli ETC quotati in GBp avevano value_eur gonfiati ~100×.
-- I dati verranno ricostruiti da Yahoo Finance via backfill auto-healing su page load.

delete from position_snapshots
where position_id in (select id from positions where is_manual = false);
