-- AlterTable
ALTER TABLE "tutorias" ADD COLUMN "disponibilidad_id" TEXT;

-- CreateIndex
CREATE INDEX "tutorias_monitor_id_programada_en_idx" ON "tutorias"("monitor_id", "programada_en");

-- CreateIndex
CREATE INDEX "tutorias_solicitante_id_estado_idx" ON "tutorias"("solicitante_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "disponibilidad_monitor_tutor_id_fecha_hora_ini_key" ON "disponibilidad_monitor"("tutor_id", "fecha", "hora_ini");

-- CreateIndex
CREATE INDEX "disponibilidad_monitor_tutor_id_fecha_idx" ON "disponibilidad_monitor"("tutor_id", "fecha");

-- AddForeignKey
ALTER TABLE "tutorias" ADD CONSTRAINT "tutorias_disponibilidad_id_fkey" FOREIGN KEY ("disponibilidad_id") REFERENCES "disponibilidad_monitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
