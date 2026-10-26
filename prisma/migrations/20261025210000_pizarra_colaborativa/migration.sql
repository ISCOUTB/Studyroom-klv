-- CreateTable
CREATE TABLE "pizarra_trazos" (
    "id" TEXT NOT NULL,
    "sala_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "grosor" INTEGER NOT NULL,
    "datos" JSONB NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pizarra_trazos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pizarra_trazos_sala_id_creado_en_idx" ON "pizarra_trazos"("sala_id", "creado_en");

-- AddForeignKey
ALTER TABLE "pizarra_trazos" ADD CONSTRAINT "pizarra_trazos_sala_id_fkey" FOREIGN KEY ("sala_id") REFERENCES "salas_estudio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pizarra_trazos" ADD CONSTRAINT "pizarra_trazos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
