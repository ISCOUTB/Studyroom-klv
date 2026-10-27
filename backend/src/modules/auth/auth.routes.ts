import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  getCurrentUser,
  updateProfile,
  forgotPassword,
  resetPassword,
} from './auth.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { loginRateLimiter } from '../../shared/middleware/rateLimit.middleware';
import {
  recibirFoto,
  subirFotoPerfil,
  eliminarFotoPerfil,
} from './foto.controller';

const router = Router();

// Registro de estudiantes (correo @utb.edu.co)
router.post('/registro', register);

// Verificación del correo (enlace enviado al registrarse)
router.get('/verificar/:token', verifyEmail);

// Reenvío del enlace de verificación
router.post('/reenviar-verificacion', resendVerification);

// Inicio de sesión (con límite de intentos)
router.post('/login', loginRateLimiter, login);

// Usuario autenticado (requiere JWT)
router.get('/me', authMiddleware, getCurrentUser);

// Actualización del perfil del usuario autenticado
router.patch('/perfil', authMiddleware, updateProfile);

// Foto de perfil (multipart, campo "foto")
router.post('/foto', authMiddleware, recibirFoto, subirFotoPerfil);
router.delete('/foto', authMiddleware, eliminarFotoPerfil);

// Recuperación y restablecimiento de contraseña
router.post('/recuperar', forgotPassword);
router.post('/restablecer', resetPassword);

export default router;
