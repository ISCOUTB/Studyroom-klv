import path from 'path';

// Las rutas relativas de UPLOADS_DIR se resuelven desde la carpeta backend.
const RAIZ_BACKEND = path.resolve(__dirname, '../..');

export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.isAbsolute(process.env.UPLOADS_DIR)
    ? process.env.UPLOADS_DIR
    : path.resolve(RAIZ_BACKEND, process.env.UPLOADS_DIR)
  : path.join(RAIZ_BACKEND, 'uploads');

// Solo esta subcarpeta se publica por HTTP (fotos de perfil).
export const AVATARES_DIR = path.join(UPLOADS_DIR, 'avatares');
