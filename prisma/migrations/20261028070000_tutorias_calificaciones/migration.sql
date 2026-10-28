-- Experiencia del monitor y calificaciones de tutorías

ALTER TABLE "tutores" ADD COLUMN "experiencia" VARCHAR(500);

CREATE TABLE "calificaciones_tutoria" (
    "id" TEXT NOT NULL,
    "tutoria_id" TEXT NOT NULL,
    "monitor_id" TEXT NOT NULL,
    "estudiante_id" TEXT NOT NULL,
    "puntaje" INTEGER NOT NULL,
    "comentario" VARCHAR(300),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calificaciones_tutoria_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "calificaciones_tutoria_tutoria_id_key" ON "calificaciones_tutoria"("tutoria_id");
CREATE INDEX "calificaciones_tutoria_monitor_id_creado_en_idx" ON "calificaciones_tutoria"("monitor_id", "creado_en");

ALTER TABLE "calificaciones_tutoria" ADD CONSTRAINT "calificaciones_tutoria_tutoria_id_fkey" FOREIGN KEY ("tutoria_id") REFERENCES "tutorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calificaciones_tutoria" ADD CONSTRAINT "calificaciones_tutoria_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "tutores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "calificaciones_tutoria" ADD CONSTRAINT "calificaciones_tutoria_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
