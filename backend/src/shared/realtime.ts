import type { Server } from 'socket.io';

let ioRef: Server | null = null;

/** Cada usuario autenticado se une a una sala privada para recibir avisos. */
export function salaUsuario(usuarioId: string): string {
  return `usuario:${usuarioId}`;
}

export function registrarServidorRealtime(io: Server): void {
  ioRef = io;
}

export function emitirAUsuario(
  usuarioId: string,
  evento: string,
  payload: unknown
): void {
  ioRef?.to(salaUsuario(usuarioId)).emit(evento, payload);
}
