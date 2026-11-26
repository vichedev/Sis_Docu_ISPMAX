-- Datos ficticios de las capturas de problemas/infraestructura/monitoreo-de-red-no-avisa-cuando-se-cae-un-equipo.
-- Dos equipos que quedan en "Sin datos": uno con el monitoreo apagado y otro cuyo router de origen está inactivo.
-- Para regenerar las capturas `red/monitoreo/04-equipos-sin-datos` y `07-equipo-silenciado`, ejecute este archivo antes (docker exec -i ispmax-local-pg psql -U postgres -d ispmax_local < este archivo).
-- Las IP son del bloque de documentación 198.51.100.0/24 (no enrutable). Retirar después con:
--   DELETE FROM monitor_dispositivo WHERE ip IN ('198.51.100.21','198.51.100.22');
INSERT INTO monitor_dispositivo (nombre, ip, categoria, router_id, intervalo_min, umbral_fallos, paquetes, metodo_ping, activo, notificar, estado)
SELECT 'ANTENA-LOMA-PAUSADA', '198.51.100.21', 'antena', r.id, 1, 3, 3, 'auto', false, true, 'sin_datos'
FROM routers r WHERE r.nombre = 'ROUTER DEMO'
AND NOT EXISTS (SELECT 1 FROM monitor_dispositivo WHERE ip = '198.51.100.21');
INSERT INTO monitor_dispositivo (nombre, ip, categoria, router_id, intervalo_min, umbral_fallos, paquetes, metodo_ping, activo, notificar, estado)
SELECT 'RADIO-PUERTO-NUEVO', '198.51.100.22', 'radio', r.id, 1, 3, 3, 'auto', true, true, 'sin_datos'
FROM routers r WHERE r.id = 'b2000000-0000-4000-8000-000000000001'
AND NOT EXISTS (SELECT 1 FROM monitor_dispositivo WHERE ip = '198.51.100.22');
