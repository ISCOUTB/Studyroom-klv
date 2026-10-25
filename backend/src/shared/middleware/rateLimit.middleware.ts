import rateLimit from 'express-rate-limit';

/**
 * Límite general para todas las rutas de autenticación.
 * Evita ráfagas de peticiones automatizadas.
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.',
  },
});

/**
 * Límite específico del login: solo cuentan los intentos fallidos,
 * para no bloquear a un usuario que inicia sesión correctamente.
 */
export const loginRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde.',
  },
});
