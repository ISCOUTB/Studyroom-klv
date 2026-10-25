import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';
import authRoutes from './modules/auth/auth.routes';
import salasRoutes from './modules/salas/salas.routes';
import { registrarChat } from './modules/salas/chat.socket';
import { getCurrentUser } from './modules/auth/auth.controller';
import {
  authMiddleware,
  rbacMiddleware,
  rateLimitMiddleware,
} from './shared/middleware';

if (!process.env.JWT_SECRET) {
  console.error(
    '[ERROR] Falta JWT_SECRET en backend/.env. Copia backend/.env.example o define un secreto seguro.'
  );
  process.exit(1);
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Render/Vercel entregan la IP real en X-Forwarded-For.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------
// Salud del servicio
// ---------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Campus Collaborative Study API',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------
// Autenticación
// ---------------------------------------------------------
app.use('/api/auth', rateLimitMiddleware, authRoutes);

// ---------------------------------------------------------
// Salas de estudio
// ---------------------------------------------------------
app.use('/api/salas', salasRoutes);

// Alias de compatibilidad para el usuario autenticado
app.get('/api/me', authMiddleware, getCurrentUser);

// ---------------------------------------------------------
// Ruta protegida de ejemplo: solo ADMINISTRADOR
// ---------------------------------------------------------
app.get('/api/admin', authMiddleware, rbacMiddleware('ADMINISTRADOR'), (_req, res) => {
  res.json({ message: 'Acceso de administrador concedido.' });
});

// ---------------------------------------------------------
// 404 y manejo global de errores
// ---------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[error-global]', err);
    res.status(err?.status || 500).json({
      error: err?.message || 'Error interno del servidor.',
    });
  }
);

// ---------------------------------------------------------
// Chat en tiempo real (Socket.IO sobre el mismo servidor)
// ---------------------------------------------------------
registrarChat(io);

httpServer.listen(PORT, () => {
  console.log('');
  console.log('============================================================');
  console.log('  Campus Collaborative Study - API');
  console.log(`  http://localhost:${PORT}`);
  console.log('============================================================');
  console.log('  Endpoints disponibles:');
  console.log('   POST   /api/auth/registro');
  console.log('   GET    /api/auth/verificar/:token');
  console.log('   POST   /api/auth/reenviar-verificacion');
  console.log('   POST   /api/auth/login');
  console.log('   GET    /api/auth/me                 (requiere JWT)');
  console.log('   POST   /api/auth/recuperar');
  console.log('   POST   /api/auth/restablecer');
  console.log('   GET    /api/salas                   (requiere JWT)');
  console.log('   POST   /api/salas                   (requiere JWT)');
  console.log('   GET    /api/salas/:id               (requiere JWT)');
  console.log('   GET    /api/salas/:id/mensajes      (requiere JWT)');
  console.log('   POST   /api/salas/:id/unirse        (requiere JWT)');
  console.log('   POST   /api/salas/:id/abandonar     (requiere JWT)');
  console.log('   WS     /socket.io                   (chat con JWT)');
  console.log('   GET    /api/me                      (requiere JWT)');
  console.log('   GET    /api/admin                   (solo ADMINISTRADOR)');
  console.log('   GET    /health');
  console.log('============================================================');
  console.log('');
});

export { io };
export default app;
