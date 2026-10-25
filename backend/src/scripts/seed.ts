import 'dotenv/config';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';

async function main() {
  const correo = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const contrasena = process.env.ADMIN_PASSWORD || '';
  const nombre = (process.env.ADMIN_NOMBRE || 'Administrador UTB').trim();
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

  if (!/^[a-z0-9._%+-]+@utb\.edu\.co$/i.test(correo)) {
    throw new Error('ADMIN_EMAIL debe ser un correo institucional @utb.edu.co.');
  }
  if (contrasena.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener mínimo 8 caracteres.');
  }

  const salt = await bcrypt.genSalt(saltRounds);
  const contrasenaHash = await bcrypt.hash(contrasena, salt);

  const existente = await prisma.usuario.findUnique({ where: { correoUnico: correo } });

  if (existente) {
    await prisma.usuario.update({
      where: { id: existente.id },
      data: {
        nombre,
        contrasenaHash,
        salt,
        rol: 'ADMINISTRADOR',
        emailVerificado: true,
        tokenVerificacion: null,
        administrador: {
          upsert: {
            create: {},
            update: {},
          },
        },
      },
    });
    console.log(`[seed] Administrador actualizado: ${correo}`);
    return;
  }

  const id = randomUUID();
  await prisma.usuario.create({
    data: {
      id,
      nombre,
      correoUnico: correo,
      contrasenaHash,
      salt,
      rol: 'ADMINISTRADOR',
      emailVerificado: true,
      administrador: {
        create: {},
      },
    },
  });

  console.log(`[seed] Administrador creado: ${correo}`);
}

main()
  .catch((error) => {
    console.error('[seed] Error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
