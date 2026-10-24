import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_utb_2026';
const JWT_EXPIRES_IN = '1d';

export class PasswordService {
  static async hashPassword(password: string): Promise<{ hash: string; salt: string }> {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return { hash, salt };
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export interface JwtPayload {
  userId: string;
  correo: string;
  rol: 'ESTUDIANTE' | 'TUTOR' | 'ADMINISTRADOR';
}

export class TokenService {
  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  }
}

export function validateUTBEmail(email: string): boolean {
  const utbRegex = /^[a-zA-Z0-9._%+-]+@utb\.edu\.co$/;
  return utbRegex.test(email);
}
