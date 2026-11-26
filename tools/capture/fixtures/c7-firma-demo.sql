BEGIN;
INSERT INTO plantilla (id, nombre, files, tipo, "tieneAnclaFirma") VALUES
 ('f1f1f1f1-0000-4000-8000-000000000001','CONTRATO DE SERVICIO DEMO','{}','contrato',true),
 ('f1f1f1f1-0000-4000-8000-000000000002','ANEXO SIN FIRMA DEMO','{}','contrato',false);
INSERT INTO contratos (id, titulo, "fechaInicio", "fechaFin", duracion, estado, "plantillaId", "servicioId") VALUES
 ('f1f1f1f1-0000-4000-8000-000000000011','Contrato de servicio de Internet','2026/10/26','2027/10/26',12,'Esperando aprobación de cliente','f1f1f1f1-0000-4000-8000-000000000001','3da76304-12a3-4035-8efb-46916d007270'),
 ('f1f1f1f1-0000-4000-8000-000000000012','Anexo de equipos en comodato','2026/10/26','2027/10/26',12,'Esperando aprobación de cliente','f1f1f1f1-0000-4000-8000-000000000001','3da76304-12a3-4035-8efb-46916d007270'),
 ('f1f1f1f1-0000-4000-8000-000000000013','Autorización de débito automático','2026/10/26','2027/10/26',12,'Esperando aprobación de cliente',NULL,'3da76304-12a3-4035-8efb-46916d007270'),
 ('f1f1f1f1-0000-4000-8000-000000000014','Anexo de tarifas','2026/10/26','2027/10/26',12,'Esperando aprobación de cliente','f1f1f1f1-0000-4000-8000-000000000002','3da76304-12a3-4035-8efb-46916d007270'),
 ('f1f1f1f1-0000-4000-8000-000000000015','Contrato de reconexión','2026/10/26','2027/10/26',12,'Esperando aprobación de cliente','f1f1f1f1-0000-4000-8000-000000000001','3da76304-12a3-4035-8efb-46916d007270');
INSERT INTO solicitudes_firma (id, tipo, "referenceId", "providerId", nivel, estado, "urlFirma", "expiraEn", "firmanteDocumento", "firmanteTipoDocumento", "firmanteEmail", "firmanteNombre", "servicioId") VALUES
 ('f1f1f1f1-0000-4000-8000-000000000021','contrato','ISPMAX-f1f1f1f1-0000-4000-8000-000000000021','datil','simple','pending','https://firma.demo.invalid/s/DEMO0015','2026-11-02 12:00:00-05','0912345674','national_id','carlos3@demo.manual.local','CARLOS ALBERTO MENA','3da76304-12a3-4035-8efb-46916d007270');
INSERT INTO solicitudes_firma_documentos (id, "solicitudId", "contratoId", orden, "nombreArchivo") VALUES
 ('f1f1f1f1-0000-4000-8000-000000000031','f1f1f1f1-0000-4000-8000-000000000021','f1f1f1f1-0000-4000-8000-000000000015',0,'Contrato de reconexión.pdf');
COMMIT;
