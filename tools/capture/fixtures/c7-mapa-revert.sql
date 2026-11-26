-- Deshace c7-mapa-seed.sql
BEGIN;
UPDATE "servicios-clientes" SET caja_id = NULL, puerto_id = NULL, coordenadas = NULL WHERE contrato BETWEEN 1000 AND 1009 AND (caja_id::text LIKE 'c700000%' OR contrato = 1009);
DELETE FROM puertos WHERE "cajaNap_id"::text LIKE 'c700000%';
DELETE FROM "cajas-nap" WHERE id::text LIKE 'c700000%';
DELETE FROM postes WHERE id::text LIKE 'c700000%';
DELETE FROM tramos_fibra WHERE id::text LIKE 'c700000%';
COMMIT;
