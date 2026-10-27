-- Salas programadas y acceso privado mediante código.
ALTER TABLE "salas_estudio"
  ADD COLUMN "programada_en" TIMESTAMP(3),
  ADD COLUMN "codigo_acceso" TEXT;

CREATE UNIQUE INDEX "salas_estudio_codigo_acceso_key"
  ON "salas_estudio"("codigo_acceso");
