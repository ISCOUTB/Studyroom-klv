-- CreateEnum
CREATE TYPE "RolEnum" AS ENUM ('ESTUDIANTE', 'TUTOR', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "EstadoSalaEnum" AS ENUM ('ACTIVA', 'PROGRAMADA', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "PrivacidadSalaEnum" AS ENUM ('PUBLICA', 'PRIVADA');

-- CreateEnum
CREATE TYPE "EstadoTutoriaEnum" AS ENUM ('SOLICITADA', 'AGENDADA', 'RECHAZADA', 'EXPIRADA', 'CANCELADA', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "ModalidadEnum" AS ENUM ('VIRTUAL', 'PRESENCIAL');

-- CreateEnum
CREATE TYPE "EstadoParticipacionEnum" AS ENUM ('ACTIVO', 'ABANDONO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo_unico" TEXT NOT NULL,
    "contrasena_hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "rol" "RolEnum" NOT NULL DEFAULT 'ESTUDIANTE',
    "email_verificado" BOOLEAN NOT NULL DEFAULT false,
    "token_verificacion" TEXT,
    "reset_token" TEXT,
    "reset_token_exp" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estudiantes" (
    "id" TEXT NOT NULL,
    "carrera" TEXT NOT NULL,
    "semestre" INTEGER NOT NULL,
    "foto_url" TEXT,

    CONSTRAINT "estudiantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutores" (
    "id" TEXT NOT NULL,
    "carrera" TEXT NOT NULL,
    "semestre" INTEGER NOT NULL,
    "foto_url" TEXT,
    "biografia" VARCHAR(300),
    "modalidad" "ModalidadEnum" NOT NULL DEFAULT 'VIRTUAL',
    "ubicacion" TEXT,
    "asignaturas" TEXT[],
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "solicitud_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "administradores" (
    "id" TEXT NOT NULL,

    CONSTRAINT "administradores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salas_estudio" (
    "id" TEXT NOT NULL,
    "anfitrion_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "asignatura" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cupo_maximo" INTEGER NOT NULL DEFAULT 10,
    "privacidad" "PrivacidadSalaEnum" NOT NULL DEFAULT 'PUBLICA',
    "estado" "EstadoSalaEnum" NOT NULL DEFAULT 'ACTIVA',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salas_estudio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacion_sala" (
    "id" TEXT NOT NULL,
    "sala_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "unio_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoParticipacionEnum" NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "participacion_sala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorias" (
    "id" TEXT NOT NULL,
    "solicitante_id" TEXT NOT NULL,
    "monitor_id" TEXT NOT NULL,
    "estado" "EstadoTutoriaEnum" NOT NULL DEFAULT 'SOLICITADA',
    "solicitada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "respondida_en" TIMESTAMP(3),
    "programada_en" TIMESTAMP(3),
    "modalidad" "ModalidadEnum" NOT NULL DEFAULT 'VIRTUAL',
    "ubicacion" TEXT,
    "notas" TEXT,

    CONSTRAINT "tutorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilidad_monitor" (
    "id" TEXT NOT NULL,
    "tutor_id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_ini" TEXT NOT NULL,
    "hora_fin" TEXT NOT NULL,
    "dia_semana" TEXT NOT NULL,

    CONSTRAINT "disponibilidad_monitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes_chat" (
    "id" TEXT NOT NULL,
    "sala_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "enviado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_chat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_unico_key" ON "usuarios"("correo_unico");

-- CreateIndex
CREATE UNIQUE INDEX "participacion_sala_sala_id_usuario_id_key" ON "participacion_sala"("sala_id", "usuario_id");

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_id_fkey" FOREIGN KEY ("id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutores" ADD CONSTRAINT "tutores_id_fkey" FOREIGN KEY ("id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "administradores" ADD CONSTRAINT "administradores_id_fkey" FOREIGN KEY ("id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salas_estudio" ADD CONSTRAINT "salas_estudio_anfitrion_id_fkey" FOREIGN KEY ("anfitrion_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion_sala" ADD CONSTRAINT "participacion_sala_sala_id_fkey" FOREIGN KEY ("sala_id") REFERENCES "salas_estudio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion_sala" ADD CONSTRAINT "participacion_sala_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorias" ADD CONSTRAINT "tutorias_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorias" ADD CONSTRAINT "tutorias_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "tutores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disponibilidad_monitor" ADD CONSTRAINT "disponibilidad_monitor_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "tutores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_chat" ADD CONSTRAINT "mensajes_chat_sala_id_fkey" FOREIGN KEY ("sala_id") REFERENCES "salas_estudio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_chat" ADD CONSTRAINT "mensajes_chat_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
