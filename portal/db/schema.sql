-- Esquema del portal del manual ISPMAX. Idempotente (se puede ejecutar varias veces).
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','editor','viewer')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Sesiones: solo la huella SHA-256 del token (el token va únicamente en la cookie). Ver la migración al final.
CREATE TABLE IF NOT EXISTS sessions (
  id bigserial PRIMARY KEY,
  token_hash text NOT NULL,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,            -- caducidad absoluta (PORTAL_SESSION_MAX_DAYS)
  ip text,
  user_agent text
);
-- Una fila por página .mdx. `route` es la ruta pública (/tareas/acceso/crear-un-rol) y la clave natural.
CREATE TABLE IF NOT EXISTS pages (
  id serial PRIMARY KEY,
  route text UNIQUE NOT NULL,
  file_path text NOT NULL,              -- ruta relativa a docs/ al exportar (ej. tareas/acceso/crear-un-rol.mdx)
  seccion text NOT NULL,                -- tareas|guia|problemas|preguntas|referencia|conceptos|raiz
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  grupo text NOT NULL DEFAULT '',
  orden int NOT NULL DEFAULT 0,
  frontmatter jsonb NOT NULL DEFAULT '{}',  -- TODOS los campos del frontmatter (incluye title, description, grupo, orden)
  fm_raw text,                           -- frontmatter original tal cual; se usa al exportar si no se editó (fidelidad byte a byte)
  body text NOT NULL DEFAULT '',         -- MDX sin frontmatter
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
  version int NOT NULL DEFAULT 1,        -- control de concurrencia optimista
  deleted_at timestamptz,
  updated_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pages_seccion_idx ON pages (seccion, grupo, orden);
CREATE INDEX IF NOT EXISTS pages_search_idx ON pages USING gin (to_tsvector('spanish', title || ' ' || description || ' ' || body));
CREATE TABLE IF NOT EXISTS page_revisions (
  id serial PRIMARY KEY,
  page_id int NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL,               -- {route,title,frontmatter,fm_raw,body,grupo,orden,status}
  user_id int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Redirecciones al mover/renombrar páginas (se vuelcan a src/legacy-routes.json al publicar).
CREATE TABLE IF NOT EXISTS redirects (
  from_route text PRIMARY KEY,
  to_route text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Imágenes y otros archivos de assets/ (path relativo a assets/, ej. imgs/acceso/contrasena/01-menu.webp).
CREATE TABLE IF NOT EXISTS assets (
  id serial PRIMARY KEY,
  path text UNIQUE NOT NULL,
  mime text NOT NULL,
  bytes bytea NOT NULL,
  width int, height int,
  size int NOT NULL,
  updated_by int REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Archivos JSON/YAML de apoyo que hoy viven en el repo (docs/sidebar.json, src/legacy-routes.json, etc.).
CREATE TABLE IF NOT EXISTS site_files (
  path text PRIMARY KEY,                 -- relativo a la raíz del repo
  content text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by int REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS publish_jobs (
  id serial PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('publish','git_update','backup','import')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','ok','error')),
  log text NOT NULL DEFAULT '',
  user_id int REFERENCES users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE TABLE IF NOT EXISTS backups (
  id serial PRIMARY KEY,
  filename text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  user_id int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  user_id int REFERENCES users(id),
  action text NOT NULL,                  -- ej. page.update, page.create, structure.reorder, settings.update, publish, git.update, backup.create
  target text,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_log (created_at DESC);

-- Tours guiados sobre capturas. Se exportan como assets/tours/<slug>.json y se muestran en el manual con <Tour id="<slug>" />.
CREATE TABLE IF NOT EXISTS tours (
  id serial PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  steps jsonb NOT NULL DEFAULT '[]',   -- [{image,alt,title,text,spot:{x,y,w,h}|null,link:{label,route}|null}] (spot en % de la imagen)
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  version int NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  updated_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Subsecciones: una página puede depender de otra (se exporta como `padre: /ruta` en el frontmatter).
ALTER TABLE pages ADD COLUMN IF NOT EXISTS parent_id int REFERENCES pages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS pages_parent_idx ON pages (parent_id);

-- Respaldos: 'db' = volcado pg_dump; 'content' = paquete portable de contenido (.ispmax).
ALTER TABLE backups ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'db';

-- ── Autenticación endurecida (Adenda 5, 2026-11-26) ─────────────────────────────────────────────────────────────
-- Migración de sesiones: la versión anterior guardaba el token EN CLARO (columna `token`). Esas sesiones se borran
-- (hay que volver a iniciar sesión) y la columna desaparece. Los usuarios y sus hashes bcrypt no se tocan.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = current_schema() AND table_name = 'sessions' AND column_name = 'token') THEN
    DELETE FROM sessions;
    ALTER TABLE sessions DROP COLUMN token;   -- arrastra la clave primaria antigua
  END IF;
END $$;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS id bigserial;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token_hash text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent text;
DELETE FROM sessions WHERE token_hash IS NULL;
ALTER TABLE sessions ALTER COLUMN token_hash SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'sessions'::regclass AND contype = 'p') THEN
    ALTER TABLE sessions ADD PRIMARY KEY (id);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_key ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- Usuarios: cambio de contraseña obligatorio y verificación en dos pasos (TOTP). Los secretos van cifrados (AES-256-GCM).
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret_enc text;          -- secreto activo cifrado
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_pending_enc text;         -- secreto en alta (aún no confirmado)
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_pending_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_last_step bigint;         -- último paso TOTP aceptado (anti-reutilización)
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled_at timestamptz;

-- Códigos de recuperación de un solo uso (solo su huella SHA-256).
CREATE TABLE IF NOT EXISTS recovery_codes (
  id bigserial PRIMARY KEY,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recovery_codes_user_idx ON recovery_codes (user_id);

-- Retos del segundo paso del inicio de sesión: un solo uso, 5 minutos (solo su huella).
CREATE TABLE IF NOT EXISTS login_challenges (
  id bigserial PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip text,
  user_agent text,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

-- Intentos fallidos de inicio de sesión y bloqueos (persisten tras reiniciar el servidor).
CREATE TABLE IF NOT EXISTS login_attempts (
  id bigserial PRIMARY KEY,
  username text NOT NULL,                 -- en minúsculas, tal como se escribió (exista o no)
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_user_ip_idx ON login_attempts (username, ip, created_at);
CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON login_attempts (ip, created_at);
CREATE TABLE IF NOT EXISTS login_locks (
  scope text NOT NULL CHECK (scope IN ('user_ip','ip','user')),
  key text NOT NULL,
  locked_until timestamptz NOT NULL,
  level int NOT NULL DEFAULT 0,           -- bloqueos consecutivos: 15 min · 2^level (máx. 24 h)
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key)
);
CREATE INDEX IF NOT EXISTS audit_user_action_idx ON audit_log (user_id, action, id DESC);
