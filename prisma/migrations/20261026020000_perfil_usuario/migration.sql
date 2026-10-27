-- Perfil ampliado: datos personales, visibilidad del correo y foto de perfil.
ALTER TABLE "usuarios"
  ADD COLUMN "apellido" TEXT,
  ADD COLUMN "ciudad" TEXT,
  ADD COLUMN "pais" TEXT NOT NULL DEFAULT 'Colombia',
  ADD COLUMN "zona_horaria" TEXT NOT NULL DEFAULT 'America/Bogota',
  ADD COLUMN "visibilidad_correo" TEXT NOT NULL DEFAULT 'CURSO',
  ADD COLUMN "foto_url" TEXT;

-- Conservamos las fotos que ya existieran en los perfiles de estudiante/monitor.
UPDATE "usuarios" u
SET "foto_url" = e."foto_url"
FROM "estudiantes" e
WHERE e."id" = u."id" AND e."foto_url" IS NOT NULL;

UPDATE "usuarios" u
SET "foto_url" = t."foto_url"
FROM "tutores" t
WHERE t."id" = u."id" AND t."foto_url" IS NOT NULL;
