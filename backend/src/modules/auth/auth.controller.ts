import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { sendVerificationEmail, sendResetPasswordEmail } from './auth.service';

type ExpiresIn = jwt.SignOptions['expiresIn'];

const EMAIL_UTB_REGEX = /^[a-z0-9._%+-]+@utb\.edu\.co$/i;
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
const SESSION_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '8h') as ExpiresIn;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado en backend/.env');
  }
  return secret;
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeEmail(value: unknown): string {
  return text(value).toLowerCase();
}

function isValidUtbEmail(email: string): boolean {
  return EMAIL_UTB_REGEX.test(email);
}

function isTokenExpiredError(error: unknown): boolean {
  return error instanceof Error && error.name === 'TokenExpiredError';
}

function signEmailToken(userId: string, tipo: 'verificacion' | 'reset') {
  return jwt.sign({ sub: userId, tipo }, getJwtSecret(), {
    expiresIn: tipo === 'verificacion' ? '24h' : '1h',
  });
}

function verifyEmailToken(token: string, tipo: 'verificacion' | 'reset') {
  const payload = jwt.verify(token, getJwtSecret()) as jwt.JwtPayload;
  if (payload.tipo !== tipo) {
    throw new jwt.JsonWebTokenError('Tipo de token incorrecto');
  }
  return payload;
}

// ---------------------------------------------------------
// POST /api/auth/registro
// ---------------------------------------------------------
export const register = async (req: Request, res: Response) => {
  const nombre = text(req.body?.nombre);
  const carrera = text(req.body?.carrera);
  const semestre = Number(req.body?.semestre);
  const correo = normalizeEmail(req.body?.correoUnico ?? req.body?.correo);
  const contrasena = text(req.body?.contrasena ?? req.body?.password);

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio.' });
  }
  if (!carrera) {
    return res.status(400).json({ error: 'La carrera es obligatoria.' });
  }
  if (!Number.isInteger(semestre) || semestre < 1 || semestre > 12) {
    return res.status(400).json({ error: 'El semestre debe ser un número entre 1 y 12.' });
  }
  if (!isValidUtbEmail(correo)) {
    return res.status(400).json({ error: 'Solo se permiten correos institucionales @utb.edu.co.' });
  }
  if (contrasena.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener mínimo 8 caracteres.' });
  }

  try {
    const existente = await prisma.usuario.findUnique({ where: { correoUnico: correo } });
    if (existente) {
      return res.status(409).json({ error: 'El correo ya está registrado. Inicia sesión o recupera tu contraseña.' });
    }

    const usuarioId = randomUUID();
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const contrasenaHash = await bcrypt.hash(contrasena, salt);
    const tokenVerificacion = signEmailToken(usuarioId, 'verificacion');

    await prisma.usuario.create({
      data: {
        id: usuarioId,
        nombre,
        correoUnico: correo,
        contrasenaHash,
        salt,
        tokenVerificacion,
        emailVerificado: false,
        estudiante: {
          create: {
            carrera,
            semestre,
          },
        },
      },
    });

    await sendVerificationEmail(correo, tokenVerificacion);

    return res.status(201).json({
      message: 'Cuenta creada. Revisa tu correo institucional para verificar tu cuenta.',
      correo,
    });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') {
      return res.status(409).json({ error: 'El correo ya está registrado.' });
    }
    console.error('[auth:registro]', error);
    return res.status(500).json({ error: 'No se pudo completar el registro. Inténtalo de nuevo.' });
  }
};

// ---------------------------------------------------------
// GET /api/auth/verificar/:token
// ---------------------------------------------------------
export const verifyEmail = async (req: Request, res: Response) => {
  const token = text(req.params.token);
  if (!token) {
    return res.status(400).json({ error: 'El enlace de verificación no contiene un código válido.' });
  }

  try {
    verifyEmailToken(token, 'verificacion');
  } catch (error) {
    if (isTokenExpiredError(error)) {
      return res.status(400).json({
        error: 'El enlace de verificación expiró. Solicita uno nuevo desde la pantalla de verificación.',
      });
    }
    return res.status(400).json({ error: 'El enlace de verificación es inválido.' });
  }

  try {
    const usuario = await prisma.usuario.findFirst({ where: { tokenVerificacion: token } });
    if (!usuario) {
      return res.status(400).json({ error: 'El enlace ya fue usado o no es válido.' });
    }
    if (usuario.emailVerificado) {
      return res.json({ message: 'Tu correo ya estaba verificado. Puedes iniciar sesión.' });
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { emailVerificado: true, tokenVerificacion: null },
    });

    return res.json({ message: 'Correo verificado con éxito. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('[auth:verificar]', error);
    return res.status(500).json({ error: 'No se pudo verificar la cuenta. Inténtalo de nuevo.' });
  }
};

// ---------------------------------------------------------
// POST /api/auth/reenviar-verificacion
// ---------------------------------------------------------
export const resendVerification = async (req: Request, res: Response) => {
  const correo = normalizeEmail(req.body?.correoUnico ?? req.body?.correo);

  if (!isValidUtbEmail(correo)) {
    return res.status(400).json({ error: 'Ingresa un correo institucional @utb.edu.co válido.' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { correoUnico: correo } });
    if (!usuario) {
      return res.status(404).json({ error: 'No encontramos una cuenta registrada con ese correo.' });
    }
    if (usuario.emailVerificado) {
      return res.status(400).json({ error: 'Ese correo ya está verificado. Puedes iniciar sesión.' });
    }

    const tokenVerificacion = signEmailToken(usuario.id, 'verificacion');
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { tokenVerificacion },
    });

    await sendVerificationEmail(correo, tokenVerificacion);

    return res.json({ message: 'Enviamos un nuevo enlace de verificación a tu correo institucional.' });
  } catch (error) {
    console.error('[auth:reenviar-verificacion]', error);
    return res.status(500).json({ error: 'No se pudo reenviar el correo de verificación.' });
  }
};

// ---------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------
export const login = async (req: Request, res: Response) => {
  const correo = normalizeEmail(req.body?.correoUnico ?? req.body?.correo);
  const contrasena = text(req.body?.contrasena ?? req.body?.password);

  if (!isValidUtbEmail(correo) || !contrasena) {
    return res.status(400).json({ error: 'Ingresa tu correo institucional y tu contraseña.' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { correoUnico: correo } });
    if (!usuario) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    if (!usuario.emailVerificado) {
      return res.status(403).json({
        error: 'Debes verificar tu correo institucional antes de iniciar sesión.',
        codigo: 'CORREO_NO_VERIFICADO',
      });
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasenaHash);
    if (!contrasenaValida) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      { id: usuario.id, correo: usuario.correoUnico, rol: usuario.rol },
      getJwtSecret(),
      { expiresIn: SESSION_EXPIRES_IN }
    );

    return res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correoUnico,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error('[auth:login]', error);
    return res.status(500).json({ error: 'No se pudo iniciar sesión. Inténtalo de nuevo.' });
  }
};

// ---------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        correoUnico: true,
        rol: true,
        emailVerificado: true,
        creadoEn: true,
        ciudad: true,
        pais: true,
        zonaHoraria: true,
        visibilidadCorreo: true,
        fotoUrl: true,
        estudiante: {
          select: { carrera: true, semestre: true, fotoUrl: true },
        },
        tutor: {
          select: {
            carrera: true,
            semestre: true,
            fotoUrl: true,
            biografia: true,
            modalidad: true,
            ubicacion: true,
            asignaturas: true,
            aprobado: true,
          },
        },
      },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const { correoUnico, ...datos } = usuario;
    return res.json({ usuario: { ...datos, correo: correoUnico } });
  } catch (error) {
    console.error('[auth:me]', error);
    return res.status(500).json({ error: 'No se pudo obtener la información del usuario.' });
  }
};

// ---------------------------------------------------------
// PATCH /api/auth/perfil
// ---------------------------------------------------------
export const updateProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const nombre = text(req.body?.nombre);
  const apellido = text(req.body?.apellido);
  const ciudad = text(req.body?.ciudad);
  const pais = text(req.body?.pais) || 'Colombia';
  const zonaHoraria = text(req.body?.zonaHoraria) || 'America/Bogota';
  const visibilidadCorreo =
    text(req.body?.visibilidadCorreo).toUpperCase() || 'CURSO';
  const carrera = text(req.body?.carrera);
  const semestre = Number(req.body?.semestre);

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio.' });
  }
  if (nombre.length > 80) {
    return res
      .status(400)
      .json({ error: 'El nombre no puede superar los 80 caracteres.' });
  }
  if (apellido.length > 80) {
    return res
      .status(400)
      .json({ error: 'Los apellidos no pueden superar los 80 caracteres.' });
  }
  if (ciudad.length > 80) {
    return res
      .status(400)
      .json({ error: 'La ciudad no puede superar los 80 caracteres.' });
  }
  if (pais.length > 80 || zonaHoraria.length > 60) {
    return res
      .status(400)
      .json({ error: 'El país o la zona horaria no son válidos.' });
  }
  if (!['CURSO', 'OCULTO'].includes(visibilidadCorreo)) {
    return res
      .status(400)
      .json({ error: 'La visibilidad del correo no es válida.' });
  }
  if (carrera.length > 80) {
    return res
      .status(400)
      .json({ error: 'La carrera no puede superar los 80 caracteres.' });
  }
  if (carrera && (!Number.isInteger(semestre) || semestre < 1 || semestre > 12)) {
    return res
      .status(400)
      .json({ error: 'El semestre debe ser un número entre 1 y 12.' });
  }

  // "nombre" conserva el nombre completo para el resto de la aplicación;
  // "apellido" guarda solo los apellidos para poder separarlos al editar.
  const nombreCompleto = `${nombre} ${apellido}`.trim();

  try {
    const actual = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: { id: true, estudiante: { select: { id: true } } },
    });

    if (!actual) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    await prisma.usuario.update({
      where: { id: actual.id },
      data: {
        nombre: nombreCompleto,
        apellido: apellido || null,
        ciudad: ciudad || null,
        pais,
        zonaHoraria,
        visibilidadCorreo,
        ...(actual.estudiante && carrera
          ? { estudiante: { update: { carrera, semestre } } }
          : {}),
      },
    });

    // Devolvemos el mismo formato que GET /api/auth/me.
    return getCurrentUser(req, res);
  } catch (error) {
    console.error('[auth:perfil]', error);
    return res
      .status(500)
      .json({ error: 'No se pudo actualizar tu perfil. Inténtalo de nuevo.' });
  }
};

// ---------------------------------------------------------
// POST /api/auth/recuperar
// ---------------------------------------------------------
export const forgotPassword = async (req: Request, res: Response) => {
  const correo = normalizeEmail(req.body?.correoUnico ?? req.body?.correo);

  if (!isValidUtbEmail(correo)) {
    return res.status(400).json({ error: 'Ingresa un correo institucional @utb.edu.co válido.' });
  }

  const respuestaGenerica = {
    message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
  };

  try {
    const usuario = await prisma.usuario.findUnique({ where: { correoUnico: correo } });
    if (!usuario) {
      return res.json(respuestaGenerica);
    }

    const resetToken = signEmailToken(usuario.id, 'reset');
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { resetToken, resetTokenExp },
    });

    await sendResetPasswordEmail(correo, resetToken);
    return res.json(respuestaGenerica);
  } catch (error) {
    console.error('[auth:recuperar]', error);
    return res.status(500).json({ error: 'No se pudo procesar la solicitud de recuperación.' });
  }
};

// ---------------------------------------------------------
// POST /api/auth/restablecer
// ---------------------------------------------------------
export const resetPassword = async (req: Request, res: Response) => {
  const token = text(req.body?.token);
  const nuevaContrasena = text(
    req.body?.nuevaContrasena ?? req.body?.contrasena ?? req.body?.password
  );

  if (!token) {
    return res.status(400).json({ error: 'El enlace de recuperación no contiene un código válido.' });
  }
  if (nuevaContrasena.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener mínimo 8 caracteres.' });
  }

  try {
    verifyEmailToken(token, 'reset');
  } catch (error) {
    if (isTokenExpiredError(error)) {
      return res.status(400).json({ error: 'El enlace de recuperación expiró. Solicita uno nuevo.' });
    }
    return res.status(400).json({ error: 'El enlace de recuperación es inválido.' });
  }

  try {
    const usuario = await prisma.usuario.findFirst({
      where: { resetToken: token, resetTokenExp: { gt: new Date() } },
    });

    if (!usuario) {
      return res.status(400).json({ error: 'El enlace es inválido o ya fue utilizado. Solicita uno nuevo.' });
    }

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const contrasenaHash = await bcrypt.hash(nuevaContrasena, salt);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        contrasenaHash,
        salt,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    return res.json({ message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('[auth:restablecer]', error);
    return res.status(500).json({ error: 'No se pudo restablecer la contraseña. Inténtalo de nuevo.' });
  }
};
