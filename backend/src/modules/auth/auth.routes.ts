import { Router } from 'express';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
} from './auth.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { loginRateLimiter } from '../../shared/middleware/rateLimit.middleware';

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

// Recuperación y restablecimiento de contraseña
router.post('/recuperar', forgotPassword);
router.post('/restablecer', resetPassword);

export default router;
