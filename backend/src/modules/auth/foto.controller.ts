import { NextFunction, Response } from 'express';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer, { MulterError } from 'multer';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { AVATARES_DIR } from '../../shared/uploads';

const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const EXTENSIONES_PERMITIDAS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const TIPOS_MIME_PERMITIDOS = new Set(['image/png', 'image/jpeg', 'image/webp']);

fs.mkdirSync(AVATARES_DIR, { recursive: true });

const almacenamiento = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARES_DIR),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extension}`);
  },
});

const subida = multer({
  storage: almacenamiento,
  limits: { fileSize: MAX_FOTO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      !EXTENSIONES_PERMITIDAS.has(extension) ||
      !TIPOS_MIME_PERMITIDOS.has(file.mimetype)
    ) {
      const error = new Error('FORMATO_NO_PERMITIDO') as Error & {
        code?: string;
      };
      error.code = 'FORMATO_NO_PERMITIDO';
      return cb(error);
    }

    return cb(null, true);
  },
});

/**
 * Recibe la imagen en el campo "foto" y traduce los errores de Multer.
 */
export const recibirFoto = (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  subida.single('foto')(_req, res, (error: unknown) => {
    if (!error) return next();

    if (error instanceof MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(413)
          .json({ error: 'La foto supera el límite de 5 MB.' });
      }
      return res.status(400).json({ error: 'No se pudo recibir la foto.' });
    }

    if ((error as { code?: string }).code === 'FORMATO_NO_PERMITIDO') {
      return res.status(400).json({
        error: 'Formato no permitido. Usa una imagen JPG, PNG o WEBP.',
      });
    }

    console.error('[perfil:foto]', error);
    return res
      .status(500)
      .json({ error: 'No se pudo subir la foto de perfil.' });
  });
};

function borrarArchivo(fotoUrl: string | null): void {
  if (!fotoUrl || !fotoUrl.startsWith('/avatares/')) return;

  try {
    fs.unlinkSync(path.join(AVATARES_DIR, path.basename(fotoUrl)));
  } catch {
    // La foto pudo borrarse antes; la base de datos es la fuente de verdad.
  }
}

// ---------------------------------------------------------
// POST /api/auth/foto
// ---------------------------------------------------------
export const subirFotoPerfil = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const archivo = req.file;
  if (!archivo) {
    return res
      .status(400)
      .json({ error: 'Selecciona una imagen para tu foto de perfil.' });
  }

  const fotoUrl = `/avatares/${archivo.filename}`;

  try {
    const actual = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        fotoUrl: true,
        estudiante: { select: { id: true } },
        tutor: { select: { id: true } },
      },
    });

    if (!actual) {
      borrarArchivo(fotoUrl);
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: actual.id },
        data: { fotoUrl },
      }),
      ...(actual.estudiante
        ? [
            prisma.estudiante.update({
              where: { id: actual.id },
              data: { fotoUrl },
            }),
          ]
        : []),
      ...(actual.tutor
        ? [
            prisma.tutor.update({
              where: { id: actual.id },
              data: { fotoUrl },
            }),
          ]
        : []),
    ]);

    borrarArchivo(actual.fotoUrl);

    return res.status(201).json({ fotoUrl });
  } catch (error) {
    borrarArchivo(fotoUrl);
    console.error('[perfil:foto]', error);
    return res
      .status(500)
      .json({ error: 'No se pudo guardar la foto de perfil.' });
  }
};

// ---------------------------------------------------------
// DELETE /api/auth/foto
// ---------------------------------------------------------
export const eliminarFotoPerfil = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  try {
    const actual = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        fotoUrl: true,
        estudiante: { select: { id: true } },
        tutor: { select: { id: true } },
      },
    });

    if (!actual) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: actual.id },
        data: { fotoUrl: null },
      }),
      ...(actual.estudiante
        ? [
            prisma.estudiante.update({
              where: { id: actual.id },
              data: { fotoUrl: null },
            }),
          ]
        : []),
      ...(actual.tutor
        ? [
            prisma.tutor.update({
              where: { id: actual.id },
              data: { fotoUrl: null },
            }),
          ]
        : []),
    ]);

    borrarArchivo(actual.fotoUrl);

    return res.json({ message: 'Foto de perfil eliminada.', fotoUrl: null });
  } catch (error) {
    console.error('[perfil:foto]', error);
    return res
      .status(500)
      .json({ error: 'No se pudo eliminar la foto de perfil.' });
  }
};
