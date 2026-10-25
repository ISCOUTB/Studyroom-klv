import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: string; correo: string; rol: string };
}

/**
 * Verifica el JWT enviado en el header Authorization: Bearer <token>.
 */
export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const [scheme, token] = authHeader?.split(' ') ?? [];

  if (!token || scheme?.toLowerCase() !== 'bearer') {
    return res.status(401).json({ error: 'Tu sesión no está activa. Inicia sesión.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id?: string;
      correo?: string;
      rol?: string;
    };

    if (!decoded.id || !decoded.rol) {
      return res.status(401).json({ error: 'Tu sesión no es válida o está incompleta.' });
    }

    req.user = {
      id: decoded.id,
      correo: decoded.correo ?? '',
      rol: decoded.rol,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Tu sesión no es válida o expiró.' });
  }
};

/**
 * Restringe una ruta a uno o varios roles.
 * Debe usarse siempre después de authMiddleware.
 */
export const rbacMiddleware = (...rolesPermitidos: string[]) => (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }
  if (!rolesPermitidos.includes(req.user.rol)) {
    return res.status(403).json({ error: 'Acceso denegado. Rol insuficiente.' });
  }
  return next();
};
