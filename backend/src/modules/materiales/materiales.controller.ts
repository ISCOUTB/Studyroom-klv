import { NextFunction, Response } from 'express';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer, { MulterError } from 'multer';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { esParticipanteActivo } from '../salas/chat.service';

// Los archivos se guardan fuera de la carpeta pública: solo se entregan
// mediante la ruta de descarga, que exige JWT y participación activa.
// Las rutas relativas de UPLOADS_DIR se resuelven desde la carpeta backend.
const RAIZ_BACKEND = path.resolve(__dirname, '../../..');
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.isAbsolute(process.env.UPLOADS_DIR)
    ? process.env.UPLOADS_DIR
    : path.resolve(RAIZ_BACKEND, process.env.UPLOADS_DIR)
  : path.join(RAIZ_BACKEND, 'uploads');

const MAX_ARCHIVO_BYTES = 10 * 1024 * 1024;
const MAX_DESCRIPCION = 300;

const EXTENSIONES_PERMITIDAS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
]);

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function text(value: unknown): string {
  return String(value ?? '').trim();
}

/**
 * Algunos navegadores envían el nombre del archivo en latin1. Si detectamos
 * el patrón típico de acentos mal codificados, lo convertimos a UTF-8.
 */
function decodificarNombre(nombre: string): string {
  if (!/[\u00C2\u00C3]/.test(nombre)) return nombre;

  const convertido = Buffer.from(nombre, 'latin1').toString('utf8');
  return convertido.includes('\uFFFD') ? nombre : convertido;
}

function limpiarNombreOriginal(nombre: string): string {
  const sinRuta = decodificarNombre(nombre)
    .replace(/[\\/]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();

  const base = sinRuta || 'material';
  if (base.length <= 180) return base;

  const extension = path.extname(base).slice(0, 12);
  return `${base.slice(0, 180 - extension.length)}${extension}`;
}

function borrarArchivo(nombreArchivo: string): void {
  try {
    fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(nombreArchivo)));
  } catch {
    // El archivo pudo haberse borrado antes; la base es la fuente de verdad.
  }
}

const almacenamiento = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extension}`);
  },
});

const subida = multer({
  storage: almacenamiento,
  limits: { fileSize: MAX_ARCHIVO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!EXTENSIONES_PERMITIDAS.has(extension)) {
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
 * Recibe un único archivo en el campo "archivo" y traduce los errores de
 * Multer a mensajes claros en español.
 */
export const recibirArchivo = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  subida.single('archivo')(req, res, (error: unknown) => {
    if (!error) return next();

    if (error instanceof MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'El archivo supera el límite de 10 MB.',
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'Solo puedes subir un archivo por vez.',
        });
      }
      return res.status(400).json({
        error: 'No se pudo procesar el archivo. Inténtalo de nuevo.',
      });
    }

    if ((error as { code?: string }).code === 'FORMATO_NO_PERMITIDO') {
      return res.status(400).json({
        error:
          'Formato no permitido. Puedes subir PDF, documentos, presentaciones, hojas de cálculo, texto o imágenes JPG, PNG o WEBP.',
      });
    }

    console.error('[materiales:multer]', error);
    return res.status(400).json({
      error: 'No se pudo procesar el archivo. Inténtalo de nuevo.',
    });
  });
};

type MaterialConUsuario = {
  id: string;
  usuarioId: string;
  nombreOriginal: string;
  tipoMime: string;
  tamano: number;
  descripcion: string | null;
  creadoEn: Date;
  usuario: { id: string; nombre: string };
};

function serializarMaterial(
  material: MaterialConUsuario,
  usuarioId: string,
  anfitrionId: string,
  rol: string
) {
  return {
    id: material.id,
    nombre: material.nombreOriginal,
    descripcion: material.descripcion,
    tipoMime: material.tipoMime,
    tamano: material.tamano,
    creadoEn: material.creadoEn.toISOString(),
    usuario: {
      id: material.usuario.id,
      nombre: material.usuario.nombre,
    },
    puedeEliminar:
      material.usuarioId === usuarioId ||
      anfitrionId === usuarioId ||
      rol === 'ADMINISTRADOR',
  };
}

// ---------------------------------------------------------
// GET /api/salas/:id/materiales
// ---------------------------------------------------------
export const listarMateriales = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const salaId = text(req.params.id);

  try {
    const sala = await prisma.salaEstudio.findUnique({
      where: { id: salaId },
      select: { id: true, anfitrionId: true },
    });

    if (!sala) {
      return res.status(404).json({ error: 'La sala de estudio no existe.' });
    }

    const participa = await esParticipanteActivo(salaId, req.user.id);
    if (!participa) {
      return res.status(403).json({
        error: 'Únete a la sala para ver los materiales de estudio.',
      });
    }

    const materiales = await prisma.materialEstudio.findMany({
      where: { salaId },
      orderBy: { creadoEn: 'desc' },
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
    });

    return res.json({
      materiales: materiales.map((material) =>
        serializarMaterial(material, req.user!.id, sala.anfitrionId, req.user!.rol)
      ),
    });
  } catch (error) {
    console.error('[materiales:listar]', error);
    return res.status(500).json({
      error: 'No se pudieron cargar los materiales de la sala.',
    });
  }
};

// ---------------------------------------------------------
// POST /api/salas/:id/materiales  (multipart/form-data)
// ---------------------------------------------------------
export const subirMaterial = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const archivo = req.file;
  if (!archivo) {
    return res.status(400).json({
      error: 'Selecciona un archivo para subir.',
    });
  }

  const salaId = text(req.params.id);

  try {
    const sala = await prisma.salaEstudio.findUnique({
      where: { id: salaId },
      select: { id: true, anfitrionId: true },
    });

    if (!sala) {
      borrarArchivo(archivo.filename);
      return res.status(404).json({ error: 'La sala de estudio no existe.' });
    }

    const participa = await esParticipanteActivo(salaId, req.user.id);
    if (!participa) {
      borrarArchivo(archivo.filename);
      return res.status(403).json({
        error: 'Únete a la sala para subir materiales de estudio.',
      });
    }

    const descripcion = text(req.body?.descripcion);
    if (descripcion.length > MAX_DESCRIPCION) {
      borrarArchivo(archivo.filename);
      return res.status(400).json({
        error: `La descripción no puede superar los ${MAX_DESCRIPCION} caracteres.`,
      });
    }

    const material = await prisma.materialEstudio.create({
      data: {
        salaId,
        usuarioId: req.user.id,
        nombreOriginal: limpiarNombreOriginal(archivo.originalname),
        nombreArchivo: archivo.filename,
        tipoMime: archivo.mimetype || 'application/octet-stream',
        tamano: archivo.size,
        descripcion: descripcion || null,
      },
      include: {
        usuario: { select: { id: true, nombre: true } },
      },
    });

    return res.status(201).json({
      message: 'Material subido con éxito.',
      material: serializarMaterial(
        material,
        req.user.id,
        sala.anfitrionId,
        req.user.rol
      ),
    });
  } catch (error) {
    borrarArchivo(archivo.filename);
    console.error('[materiales:subir]', error);
    return res.status(500).json({
      error: 'No se pudo guardar el material. Inténtalo de nuevo.',
    });
  }
};

// ---------------------------------------------------------
// GET /api/salas/:id/materiales/:materialId/descargar
// ---------------------------------------------------------
export const descargarMaterial = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const salaId = text(req.params.id);
  const materialId = text(req.params.materialId);

  try {
    const material = await prisma.materialEstudio.findFirst({
      where: { id: materialId, salaId },
    });

    if (!material) {
      return res.status(404).json({ error: 'El material no existe.' });
    }

    const participa = await esParticipanteActivo(salaId, req.user.id);
    if (!participa) {
      return res.status(403).json({
        error: 'Únete a la sala para descargar los materiales.',
      });
    }

    const rutaArchivo = path.join(
      UPLOADS_DIR,
      path.basename(material.nombreArchivo)
    );

    if (!fs.existsSync(rutaArchivo)) {
      return res.status(404).json({
        error: 'El archivo ya no está disponible en el servidor.',
      });
    }

    res.setHeader('Cache-Control', 'private, no-store');
    return res.download(rutaArchivo, material.nombreOriginal, (error) => {
      if (error && !res.headersSent) {
        console.error('[materiales:descargar]', error);
        res.status(500).json({
          error: 'No se pudo descargar el material.',
        });
      }
    });
  } catch (error) {
    console.error('[materiales:descargar]', error);
    return res.status(500).json({
      error: 'No se pudo descargar el material.',
    });
  }
};

// ---------------------------------------------------------
// DELETE /api/salas/:id/materiales/:materialId
// ---------------------------------------------------------
export const eliminarMaterial = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const salaId = text(req.params.id);
  const materialId = text(req.params.materialId);

  try {
    const material = await prisma.materialEstudio.findFirst({
      where: { id: materialId, salaId },
      include: {
        sala: { select: { anfitrionId: true } },
      },
    });

    if (!material) {
      return res.status(404).json({ error: 'El material no existe.' });
    }

    const esAutor = material.usuarioId === req.user.id;
    const esAnfitrion = material.sala.anfitrionId === req.user.id;
    const esAdmin = req.user.rol === 'ADMINISTRADOR';

    if (!esAutor && !esAnfitrion && !esAdmin) {
      return res.status(403).json({
        error:
          'Solo quien subió el material, el anfitrión de la sala o un administrador pueden eliminarlo.',
      });
    }

    if (!esAnfitrion && !esAdmin) {
      const participa = await esParticipanteActivo(salaId, req.user.id);
      if (!participa) {
        return res.status(403).json({
          error: 'Únete a la sala para administrar sus materiales.',
        });
      }
    }

    await prisma.materialEstudio.delete({ where: { id: material.id } });
    borrarArchivo(material.nombreArchivo);

    return res.json({ message: 'Material eliminado con éxito.' });
  } catch (error) {
    console.error('[materiales:eliminar]', error);
    return res.status(500).json({
      error: 'No se pudo eliminar el material. Inténtalo de nuevo.',
    });
  }
};
