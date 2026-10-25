-- CreateEnum
CREATE TYPE "TipoNotificacionEnum" AS ENUM (
  'TUTORIA_SOLICITADA',
  'TUTORIA_ACEPTADA',
  'TUTORIA_RECHAZADA',
  'TUTORIA_CANCELADA',
  'TUTORIA_FINALIZADA',
  'TUTORIA_EXPIRADA',
  'MONITOR_APROBADO',
  'MONITOR_RECHAZADO',
  'SOLICITUD_MONITOR'
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "TipoNotificacionEnum" NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "mensaje" VARCHAR(300) NOT NULL,
    "enlace" VARCHAR(200),
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_leida_creada_en_idx" ON "notificaciones"("usuario_id", "leida", "creada_en");

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
