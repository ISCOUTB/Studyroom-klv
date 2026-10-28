/**
 * Determina dinámicamente la URL base del backend API.
 * - Si estamos en el navegador y la URL del frontend es por ejemplo http://192.168.1.50:3000,
 *   automáticamente apunta a http://192.168.1.50:3001 para que cualquier dispositivo en la red
 *   pueda comunicarse sin configurar manualmente la IP en cada cliente.
 * - Si se define una variable NEXT_PUBLIC_API_URL que no sea localhost (por ejemplo un dominio en producción),
 *   se respeta esa URL.
 */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const envUrl = process.env.NEXT_PUBLIC_API_URL;

    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl.replace(/\/+$/, '');
    }

    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:3001`;
    }
  }

  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
}

export const API_URL = getApiUrl();

/**
 * Resuelve URLs de avatares o archivos asegurando el host correcto si es relativo.
 */
export function resolverFotoUrl(fotoUrl?: string | null): string {
  if (!fotoUrl) return '';
  if (fotoUrl.startsWith('http://') || fotoUrl.startsWith('https://')) {
    return fotoUrl;
  }
  return `${getApiUrl()}${fotoUrl.startsWith('/') ? '' : '/'}${fotoUrl}`;
}

/**
 * Realiza una petición al backend y convierte cualquier error
 * en un mensaje claro en español para mostrarlo en pantalla.
 */
export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response;
  const baseUrl = getApiUrl();

  try {
    res = await fetch(`${baseUrl}${path}`, options);
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el servicio esté encendido.'
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
