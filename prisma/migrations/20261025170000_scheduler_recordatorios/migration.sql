-- AlterEnum
ALTER TYPE "TipoNotificacionEnum" ADD VALUE 'TUTORIA_RECORDATORIO';

-- AlterTable
ALTER TABLE "tutorias" ADD COLUMN "recordatorio_enviado_en" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tutorias_estado_recordatorio_enviado_en_programada_en_idx" ON "tutorias"("estado", "recordatorio_enviado_en", "programada_en");
