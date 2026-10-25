export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
).replace(/\/+$/, '');

/**
 * Realiza una petición al backend y convierte cualquier error
 * en un mensaje claro en español para mostrarlo en pantalla.
 */
export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté encendido.'
    );
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Respuesta sin cuerpo JSON.
  }

  if (!res.ok) {
    throw new Error(
      data?.error || 'Ocurrió un error inesperado. Inténtalo de nuevo.'
    );
  }

  return data as T;
}
