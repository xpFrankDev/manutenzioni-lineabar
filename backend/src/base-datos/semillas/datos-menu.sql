-- Permisos iniciales de los roles. Se ejecuta después de `datos-base.sql`
-- porque en una instalación nueva los roles todavía no existen cuando corre la
-- migración 0015. Es idempotente.

INSERT IGNORE INTO ruoli_menu (fk_ruolo, fk_menu, puo_vedere, puo_modificare)
SELECT r.id, m.id, 1, 1
FROM ruoli r JOIN menu m
WHERE r.codice = 'amministratore' AND m.stato = 'attivo';

INSERT IGNORE INTO ruoli_menu (fk_ruolo, fk_menu, puo_vedere, puo_modificare)
SELECT r.id, m.id,
       CASE WHEN m.codice IN ('dashboard','boletas','mantenimientos','calendario','tareas','macchine') THEN 1 ELSE 0 END,
       CASE WHEN m.codice IN ('boletas','mantenimientos') THEN 1 ELSE 0 END
FROM ruoli r JOIN menu m
WHERE r.codice = 'tecnico'
  AND m.codice IN ('dashboard','boletas','mantenimientos','calendario','tareas','macchine');
