import { Response } from 'express';
import prisma from '../../config/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { registrarAuditoria } from './auditoria.service';
import {
  COLORES_ASIGNATURA,
  esColorValido,
  listarAsignaturas,
} from './catalogo.service';

const MAX_NOMBRE = 80;

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function colorParaGuardar(value: unknown): string | null {
  const color = text(value).toLowerCase();
  if (!color) return 'blue';
  return esColorValido(color) ? color : null;
}

// ---------------------------------------------------------
// GET /api/admin/asignaturas
// ---------------------------------------------------------
export const listarCatalogo = async (_req: AuthRequest, res: Response) => {
  try {
    const asignaturas = await listarAsignaturas(false, false);
    return res.json({ asignaturas, colores: COLORES_ASIGNATURA });
  } catch (error) {
    console.error('[admin:asignaturas:listar]', error);
    return res.status(500).json({ error: 'No se pudo cargar el catálogo de asignaturas.' });
  }
};

// ---------------------------------------------------------
// POST /api/admin/asignaturas
// ---------------------------------------------------------
export const crearAsignatura = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado.' });

  const nombre = text(req.body?.nombre).replace(/\s+/g, ' ');
  const color = colorParaGuardar(req.body?.color);

  if (nombre.length < 2 || nombre.length > MAX_NOMBRE) {
    return res.status(400).json({
      error: `El nombre debe tener entre 2 y ${MAX_NOMBRE} caracteres.`,
    });
  }
  if (!color) {
    return res.status(400).json({ error: 'Selecciona un color válido.' });
  }

  try {
    const existente = await prisma.asignatura.findUnique({
      where: { nombre },
      select: { id: true },
    });
    if (existente) {
      return res.status(409).json({ error: 'Ya existe una asignatura con ese nombre.' });
    }

    const asignatura = await prisma.asignatura.create({
      data: { nombre, color },
      select: { id: true, nombre: true, color: true, activa: true },
    });

    await registrarAuditoria(
      req.user.id,
      'ASIGNATURA_CREADA',
      `Creó la asignatura “${asignatura.nombre}” con color ${asignatura.color}.`
    );

    return res.status(201).json({
      message: 'Asignatura creada.',
      asignatura,
    });
  } catch (error) {
    console.error('[admin:asignaturas:crear]', error);
    return res.status(500).json({ error: 'No se pudo crear la asignatura.' });
  }
};

// ---------------------------------------------------------
// PATCH /api/admin/asignaturas/:id
// ---------------------------------------------------------
export const actualizarAsignatura = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado.' });

  const id = text(req.params.id);
  const nombre = req.body?.nombre === undefined ? undefined : text(req.body.nombre).replace(/\s+/g, ' ');
  const color = req.body?.color === undefined ? undefined : colorParaGuardar(req.body.color);
  const activa = req.body?.activa;

  if (!id) return res.status(400).json({ error: 'La asignatura no es válida.' });
  if (nombre === undefined && color === undefined && activa === undefined) {
    return res.status(400).json({ error: 'No hay cambios para guardar.' });
  }
  if (nombre !== undefined && (nombre.length < 2 || nombre.length > MAX_NOMBRE)) {
    return res.status(400).json({
      error: `El nombre debe tener entre 2 y ${MAX_NOMBRE} caracteres.`,
    });
  }
  if (color === null) {
    return res.status(400).json({ error: 'Selecciona un color válido.' });
  }
  if (activa !== undefined && typeof activa !== 'boolean') {
    return res.status(400).json({ error: 'El estado debe ser activa o inactiva.' });
  }

  try {
    const actual = await prisma.asignatura.findUnique({ where: { id } });
    if (!actual) {
      return res.status(404).json({ error: 'La asignatura no existe.' });
    }

    if (nombre && nombre !== actual.nombre) {
      const existente = await prisma.asignatura.findFirst({
        where: { nombre, NOT: { id } },
        select: { id: true },
      });
      if (existente) {
        return res.status(409).json({ error: 'Ya existe una asignatura con ese nombre.' });
      }
    }

    const asignatura = await prisma.asignatura.update({
      where: { id },
      data: {
        ...(nombre !== undefined ? { nombre } : {}),
        ...(color !== undefined && color !== null ? { color } : {}),
        ...(activa !== undefined ? { activa } : {}),
      },
      select: { id: true, nombre: true, color: true, activa: true },
    });

    const cambios: string[] = [];
    if (nombre !== undefined && nombre !== actual.nombre) {
      cambios.push(`nombre “${actual.nombre}” → “${nombre}”`);
    }
    if (color !== undefined && color !== actual.color) {
      cambios.push(`color ${actual.color} → ${color}`);
    }
    if (activa !== undefined && activa !== actual.activa) {
      cambios.push(activa ? 'activada' : 'desactivada');
    }

    await registrarAuditoria(
      req.user.id,
      'ASIGNATURA_ACTUALIZADA',
      `Actualizó “${asignatura.nombre}”: ${cambios.join(', ') || 'sin cambios visibles'}.`
    );

    return res.json({ message: 'Asignatura actualizada.', asignatura });
  } catch (error) {
    console.error('[admin:asignaturas:actualizar]', error);
    return res.status(500).json({ error: 'No se pudo actualizar la asignatura.' });
  }
};
