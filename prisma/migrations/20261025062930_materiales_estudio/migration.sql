-- CreateTable
CREATE TABLE "materiales_estudio" (
    "id" TEXT NOT NULL,
    "sala_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nombre_original" TEXT NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "tipo_mime" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "descripcion" VARCHAR(300),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materiales_estudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "materiales_estudio_sala_id_creado_en_idx" ON "materiales_estudio"("sala_id", "creado_en");

-- AddForeignKey
ALTER TABLE "materiales_estudio" ADD CONSTRAINT "materiales_estudio_sala_id_fkey" FOREIGN KEY ("sala_id") REFERENCES "salas_estudio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materiales_estudio" ADD CONSTRAINT "materiales_estudio_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
