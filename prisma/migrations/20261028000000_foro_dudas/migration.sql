-- Foro de dudas (RF-16): preguntas, respuestas y nuevos tipos de aviso.

-- AlterEnum
ALTER TYPE "TipoNotificacionEnum" ADD VALUE IF NOT EXISTS 'FORO_RESPUESTA';
ALTER TYPE "TipoNotificacionEnum" ADD VALUE IF NOT EXISTS 'FORO_ACEPTADA';

-- CreateTable
CREATE TABLE "preguntas_foro" (
    "id" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "descripcion" VARCHAR(1000) NOT NULL,
    "asignatura" TEXT NOT NULL,
    "tema" VARCHAR(80),
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preguntas_foro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuestas_foro" (
    "id" TEXT NOT NULL,
    "pregunta_id" TEXT NOT NULL,
    "autor_id" TEXT NOT NULL,
    "contenido" VARCHAR(1000) NOT NULL,
    "aceptada" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuestas_foro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "preguntas_foro_asignatura_resuelta_creado_en_idx" ON "preguntas_foro"("asignatura", "resuelta", "creado_en");

-- CreateIndex
CREATE INDEX "preguntas_foro_creado_en_idx" ON "preguntas_foro"("creado_en");

-- CreateIndex
CREATE INDEX "respuestas_foro_pregunta_id_creado_en_idx" ON "respuestas_foro"("pregunta_id", "creado_en");

-- AddForeignKey
ALTER TABLE "preguntas_foro" ADD CONSTRAINT "preguntas_foro_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_foro" ADD CONSTRAINT "respuestas_foro_pregunta_id_fkey" FOREIGN KEY ("pregunta_id") REFERENCES "preguntas_foro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_foro" ADD CONSTRAINT "respuestas_foro_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
