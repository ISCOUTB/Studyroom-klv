-- CreateEnum
CREATE TYPE "TipoReporteEnum" AS ENUM ('MATERIAL', 'PREGUNTA', 'RESPUESTA', 'MENSAJE');

-- CreateEnum
CREATE TYPE "EstadoReporteEnum" AS ENUM ('PENDIENTE', 'RESUELTO');

-- AlterTable
ALTER TABLE "tutorias" ADD COLUMN     "calificacion" INTEGER;

-- CreateTable
CREATE TABLE "asignaturas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asignaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes" (
    "id" TEXT NOT NULL,
    "tipo" "TipoReporteEnum" NOT NULL,
    "referencia_id" TEXT NOT NULL,
    "motivo" VARCHAR(500) NOT NULL,
    "reportante_id" TEXT NOT NULL,
    "estado" "EstadoReporteEnum" NOT NULL DEFAULT 'PENDIENTE',
    "resuelto_por_id" TEXT,
    "resuelto_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reportes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_auditoria" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "accion" VARCHAR(120) NOT NULL,
    "detalle" VARCHAR(500) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asignaturas_nombre_key" ON "asignaturas"("nombre");

-- CreateIndex
CREATE INDEX "reportes_estado_creado_en_idx" ON "reportes"("estado", "creado_en");

-- CreateIndex
CREATE INDEX "reportes_tipo_referencia_id_idx" ON "reportes"("tipo", "referencia_id");

-- CreateIndex
CREATE INDEX "registro_auditoria_creado_en_idx" ON "registro_auditoria"("creado_en");

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_reportante_id_fkey" FOREIGN KEY ("reportante_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes" ADD CONSTRAINT "reportes_resuelto_por_id_fkey" FOREIGN KEY ("resuelto_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: catálogo inicial de asignaturas (RF-18)
INSERT INTO "asignaturas" ("id", "nombre", "color", "activa", "creado_en", "actualizado_en") VALUES
  ('1b0f5a10-0000-4000-8000-000000000001', 'Álgebra Lineal', 'amber', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('1b0f5a10-0000-4000-8000-000000000002', 'Cálculo I', 'blue', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('1b0f5a10-0000-4000-8000-000000000003', 'Cálculo Integral', 'violet', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('1b0f5a10-0000-4000-8000-000000000004', 'Estadística', 'rose', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('1b0f5a10-0000-4000-8000-000000000005', 'Física I', 'emerald', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nombre") DO NOTHING;
