# Brief de inventario (leer completo antes de empezar)

Estás ayudando a construir el **inventario maestro de ISPMAX**, software de gestión para proveedores
de Internet (ISP) de InigualitySoft. El inventario alimenta un manual de usuario que será la fuente de
verdad operativa (clientes, soporte N1/N2/N3, desarrollo, IA). **Si algo no está en tu inventario, no
existirá en el manual.** La precisión importa más que la prosa.

## Material (solo lectura)

- Frontend (Quasar 2 + Vue 3): `C:\WORKSPACE\_ispmax-src\frontend\frontend-isp-main\src`
  - rutas: `router/routes.ts`; permisos: `composables/useRolPermisos.js` y `router/auth-guard.ts`;
    menú: `layouts/SideBarMenu.vue`; vistas: `pages/dashboard/**`; llamadas API en `composables/*.js` y en los `.vue`.
- Backend (NestJS + TypeORM, prefijo global `/api`): `C:\WORKSPACE\_ispmax-src\backend\backend-isp-main\src`
  - módulos `*/…controller.ts`, `*.service.ts`, `entities/*.entity.ts`, `dto/*.dto.ts`; `@Auth()` decorador de guardas.
- Contexto ya conocido: `C:\WORKSPACE\REPOSITORIOS\ispmax-manual\notes\producto.md` y `notes\entorno.md`.
- Manual actual (a contrastar, NO es fuente de verdad): `C:\WORKSPACE\REPOSITORIOS\ispmax-manual\docs\guia\*.mdx`.

## Reglas

1. **Solo lectura sobre el código.** No ejecutes el backend, `npm install`, `quasar`, ni nada que arranque
   procesos. No uses Docker. No leas ni busques archivos `.env`, claves ni credenciales.
2. **Escribe únicamente tu archivo de salida** (ruta indicada en tu encargo, dentro de
   `C:\WORKSPACE\REPOSITORIOS\ispmax-manual\notes\inventory\`). No edites `docs/`, `CLAUDE.md` ni otras notas.
3. **No inventes.** Todo dato debe provenir de código que leíste. Cita `ruta/relativa/al/src:línea`
   (frontend: `FE:pages/dashboard/...:123`; backend: `BE:customers/customers.service.ts:456`).
   Lo que solo inferiste o no pudiste confirmar va en "Pendiente de validar en UI" con ❓.
4. **Usa los textos exactos de la interfaz** (etiquetas de `label=`, `q-btn`, `placeholder`, títulos,
   `tooltip`, opciones de `q-select`, textos de `notify`, diálogos de confirmación). Si el texto viene del
   backend, indícalo. Conserva tildes y mayúsculas tal cual.
5. Para cada pantalla distingue **qué ve el usuario** de **qué hace el backend**. Sigue cada acción hasta el
   endpoint y su servicio: reglas de negocio, validaciones (DTO), estados, efectos secundarios.
6. Efectos secundarios externos siempre explícitos: MikroTik (colas, address-list, PPPoE, cortes),
   SmartOLT/AdminOLT, WhatsApp, correo, SRI, Factus, pasarelas de pago, Redis/colas Bull, cron.
7. Permisos: lista **todas** las claves de permiso (`validarPermisos('…')`, `tieneAlguno([...])`, y las
   que el backend exija) que afecten tu alcance, y qué muestran/ocultan.
8. No copies código largo; resume la regla en lenguaje llano y cita la línea.
9. Marca cada afirmación importante: ✅ (leído en código). Nunca marques 🖥️ (verificado en UI): aún no hay instancia.

## Plantilla de salida (una sección por pantalla o funcionalidad)

Empieza el archivo con:

```
# Inventario <ID> — <nombre del dominio>
> Alcance: <directorios front y back>. Generado desde el ZIP del 2026-10-06.
## Resumen de funcionalidades
| ID | Funcionalidad | Pantalla/ruta UI | Permiso(s) | Estado de lectura |
```
(Usa IDs `<PREFIJO>-001`, `<PREFIJO>-002`, … una por funcionalidad o acción principal. Estado: completo / parcial.)

Luego, por cada pantalla o funcionalidad:

```
## <PREFIJO>-0xx · <Nombre de la pantalla/funcionalidad>
- **Ruta UI / name:** `/ruta` · `nombre.ruta` · cómo se llega (menú → …)
- **Archivos:** FE: … · BE: …
- **Para qué sirve:** (1–2 frases)
- **Acceso:** permisos que lo muestran/permiten; roles fijos (p. ej. SUPER-ADMINISTRADOR)
- **Secciones / pestañas:** …
- **Botones y acciones:**
  | Etiqueta | Qué hace | Permiso | Endpoint | Restricciones/efectos |
- **Campos de formulario:**
  | Etiqueta | Tipo | Obligatorio | Validación / valores | Notas |
- **Filtros y columnas de tabla:** …
- **Estados posibles:** (valores de enum y su significado)
- **Reglas de negocio (backend):** lista con cita
- **Efectos secundarios externos:** …
- **Mensajes de error/éxito (texto exacto):** …
- **Relaciones con otros módulos:** …
- **Casos límite y advertencias:** …
- **Preguntas probables de usuarios:** 6–10, en lenguaje cotidiano y formal (cliente ISP, soporte, cobranzas, técnico, admin)
- **Pendiente de validar en UI:** ❓ …
```

Cierra con `## Hallazgos del dominio`: discrepancias frontend↔backend, validaciones que solo existen en un lado,
código muerto/no enrutado, TODO/FIXME con impacto visible, rarezas (typos de ruta, permisos inconsistentes),
cosas que el manual actual dice y el código contradice (cita la página `docs/guia/<x>.mdx`).

## Entrega

Tu respuesta final (≤ 350 palabras): ruta del archivo, número de funcionalidades y pantallas cubiertas,
qué quedó **parcial** y por qué, los 8 hallazgos más importantes, y dudas que solo se resuelven en la UI real.
