'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Socket } from 'socket.io-client';
import {
  COLORES_PIZARRA,
  COLOR_POR_DEFECTO,
  GROSORES_PIZARRA,
  GROSOR_POR_DEFECTO,
  colorDeUsuario,
  distanciaASegmento,
  type HerramientaPizarra,
  type PuntoTrazo,
  type TrazoPizarra,
} from '@/lib/pizarra';

type Props = {
  salaId: string;
  socket: Socket | null;
  participando: boolean;
  conexionLista: boolean;
  esAnfitrion: boolean;
  usuario: { id: string; nombre: string };
};

type CursorRemoto = {
  x: number;
  y: number;
  nombre: string;
  color: string;
  visto: number;
};

const ANCHO_REFERENCIA = 1200;

function grosorEscalado(grosor: number, ancho: number): number {
  return Math.max(1, grosor * Math.max(0.55, ancho / ANCHO_REFERENCIA));
}

function pintarTrazo(
  ctx: CanvasRenderingContext2D,
  trazo: Pick<TrazoPizarra, 'tipo' | 'color' | 'grosor' | 'datos'>,
  ancho: number,
  alto: number
) {
  const puntos = trazo.datos.puntos ?? [];

  if (trazo.tipo === 'texto') {
    const texto = trazo.datos.texto ?? '';
    if (!texto) return;

    const tamano = Math.max(14, grosorEscalado(trazo.grosor, ancho) * 5.5);
    ctx.fillStyle = trazo.color;
    ctx.font = `600 ${tamano}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(texto, (trazo.datos.x ?? 0) * ancho, (trazo.datos.y ?? 0) * alto);
    return;
  }

  if (puntos.length < 2) return;

  ctx.strokeStyle = trazo.color;
  ctx.lineWidth = grosorEscalado(trazo.grosor, ancho);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(puntos[0].x * ancho, puntos[0].y * alto);

  for (let i = 1; i < puntos.length; i += 1) {
    ctx.lineTo(puntos[i].x * ancho, puntos[i].y * alto);
  }

  ctx.stroke();
}

export function Pizarra({
  salaId,
  socket,
  participando,
  conexionLista,
  esAnfitrion,
  usuario,
}: Props) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const trazosRef = useRef<TrazoPizarra[]>([]);
  const previewsRef = useRef<Map<string, TrazoPizarra>>(new Map());
  const actualRef = useRef<{
    puntos: PuntoTrazo[];
    color: string;
    grosor: number;
  } | null>(null);
  const redoRef = useRef<TrazoPizarra[]>([]);
  const dibujandoRef = useRef(false);
  const ultimoPreviewRef = useRef(0);
  const ultimoCursorRef = useRef(0);

  const [cantidad, setCantidad] = useState(0);
  const [herramienta, setHerramienta] = useState<HerramientaPizarra>('dibujar');
  const [color, setColor] = useState<string>(COLOR_POR_DEFECTO);
  const [grosor, setGrosor] = useState<number>(GROSOR_POR_DEFECTO);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [textoPendiente, setTextoPendiente] = useState<{
    x: number;
    y: number;
    valor: string;
  } | null>(null);
  const [cursores, setCursores] = useState<Record<string, CursorRemoto>>({});

  const miColor = useMemo(() => colorDeUsuario(usuario.id), [usuario.id]);

  /* ------------------------------------------------------------------ */
  /* Pintado                                                             */
  /* ------------------------------------------------------------------ */

  const redibujar = useCallback(() => {
    const canvas = canvasRef.current;
    const contenedor = contenedorRef.current;
    if (!canvas || !contenedor) return;

    const ancho = contenedor.clientWidth;
    const alto = contenedor.clientHeight;
    if (ancho === 0 || alto === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const anchoFisico = Math.round(ancho * dpr);
    const altoFisico = Math.round(alto * dpr);

    if (canvas.width !== anchoFisico || canvas.height !== altoFisico) {
      canvas.width = anchoFisico;
      canvas.height = altoFisico;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, ancho, alto);

    for (const trazo of trazosRef.current) {
      pintarTrazo(ctx, trazo, ancho, alto);
    }

    previewsRef.current.forEach((preview) => {
      ctx.save();
      ctx.globalAlpha = 0.75;
      pintarTrazo(ctx, preview, ancho, alto);
      ctx.restore();
    });

    if (actualRef.current) {
      pintarTrazo(
        ctx,
        {
          tipo: 'trazo',
          color: actualRef.current.color,
          grosor: actualRef.current.grosor,
          datos: { puntos: actualRef.current.puntos },
        },
        ancho,
        alto
      );
    }
  }, []);

  useEffect(() => {
    redibujar();

    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const observador = new ResizeObserver(() => redibujar());
    observador.observe(contenedor);

    return () => observador.disconnect();
  }, [redibujar]);

  /* ------------------------------------------------------------------ */
  /* Sincronización                                                      */
  /* ------------------------------------------------------------------ */

  const cargarPizarra = useCallback(() => {
    if (!socket || !participando || !conexionLista) return;

    setCargando(true);
    socket.timeout(8000).emit(
      'pizarra:cargar',
      { salaId },
      (timeoutError: Error | null, respuesta: any) => {
        setCargando(false);

        if (timeoutError) {
          setError('La pizarra tardó demasiado en responder.');
          return;
        }
        if (!respuesta?.ok) {
          setError(respuesta?.error || 'No se pudo cargar la pizarra.');
          return;
        }

        trazosRef.current = Array.isArray(respuesta.trazos)
          ? respuesta.trazos
          : [];
        previewsRef.current.clear();
        redoRef.current = [];
        setCantidad(trazosRef.current.length);
        setError('');
        redibujar();
      }
    );
  }, [socket, participando, conexionLista, salaId, redibujar]);

  useEffect(() => {
    if (!socket || !participando) {
      trazosRef.current = [];
      previewsRef.current.clear();
      setCantidad(0);
      redibujar();
      return;
    }

    if (conexionLista) cargarPizarra();

    const alConectar = () => cargarPizarra();

    const alRecibirTrazo = (payload: any) => {
      if (payload?.salaId !== salaId || !payload?.trazo) return;

      const trazo = payload.trazo as TrazoPizarra;
      if (trazosRef.current.some((item) => item.id === trazo.id)) return;

      previewsRef.current.delete(trazo.usuarioId);
      trazosRef.current = [...trazosRef.current, trazo];
      setCantidad(trazosRef.current.length);
      redibujar();
    };

    const alRecibirPreview = (payload: any) => {
      if (payload?.salaId !== salaId || !payload?.trazo) return;

      previewsRef.current.set(payload.usuarioId, {
        id: `preview-${payload.usuarioId}`,
        tipo: 'trazo',
        color: payload.trazo.color,
        grosor: payload.trazo.grosor,
        datos: payload.trazo.datos,
        creadoEn: new Date().toISOString(),
        usuarioId: payload.usuarioId,
        usuarioNombre: payload.usuarioNombre,
      });
      redibujar();
    };

    const alQuitar = (payload: any) => {
      if (payload?.salaId !== salaId || !Array.isArray(payload?.ids)) return;

      const ids = new Set(payload.ids.map((id: unknown) => String(id)));
      trazosRef.current = trazosRef.current.filter(
        (trazo) => !ids.has(trazo.id)
      );
      setCantidad(trazosRef.current.length);
      redibujar();
    };

    const alLimpiar = (payload: any) => {
      if (payload?.salaId !== salaId) return;

      trazosRef.current = [];
      previewsRef.current.clear();
      redoRef.current = [];
      setCantidad(0);
      redibujar();
    };

    const alMoverCursor = (payload: any) => {
      if (payload?.salaId !== salaId || payload?.usuarioId === usuario.id) {
        return;
      }

      setCursores((prev) => ({
        ...prev,
        [payload.usuarioId]: {
          x: Number(payload.x) || 0,
          y: Number(payload.y) || 0,
          nombre: payload.usuarioNombre || 'Participante',
          color: payload.color || '#1D4ED8',
          visto: Date.now(),
        },
      }));
    };

    socket.on('connect', alConectar);
    socket.on('pizarra:trazo', alRecibirTrazo);
    socket.on('pizarra:preview', alRecibirPreview);
    socket.on('pizarra:quitar', alQuitar);
    socket.on('pizarra:limpiar', alLimpiar);
    socket.on('pizarra:cursor', alMoverCursor);

    return () => {
      socket.off('connect', alConectar);
      socket.off('pizarra:trazo', alRecibirTrazo);
      socket.off('pizarra:preview', alRecibirPreview);
      socket.off('pizarra:quitar', alQuitar);
      socket.off('pizarra:limpiar', alLimpiar);
      socket.off('pizarra:cursor', alMoverCursor);
    };
  }, [socket, participando, salaId, usuario.id, conexionLista, cargarPizarra, redibujar]);

  // Limpia cursores de usuarios que dejaron de moverse.
  useEffect(() => {
    const intervalo = setInterval(() => {
      const ahora = Date.now();
      setCursores((prev) => {
        const siguiente: Record<string, CursorRemoto> = {};
        let cambio = false;

        for (const [id, cursor] of Object.entries(prev)) {
          if (ahora - cursor.visto < 4000) {
            siguiente[id] = cursor;
          } else {
            cambio = true;
          }
        }

        return cambio ? siguiente : prev;
      });
    }, 1500);

    return () => clearInterval(intervalo);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Envío de trazos                                                     */
  /* ------------------------------------------------------------------ */

  const guardarTrazo = useCallback(
    (trazo: {
      tipo: 'trazo' | 'texto';
      color: string;
      grosor: number;
      datos: TrazoPizarra['datos'];
    }) => {
      if (!socket || !participando) return;

      setGuardando(true);
      socket.timeout(8000).emit(
        'pizarra:trazo',
        { salaId, trazo },
        (timeoutError: Error | null, respuesta: any) => {
          setGuardando(false);

          if (timeoutError) {
            setError('El trazo no se pudo guardar a tiempo. Revisa tu conexión.');
            return;
          }
          if (!respuesta?.ok) {
            setError(respuesta?.error || 'No se pudo guardar el trazo.');
            return;
          }

          setError('');
        }
      );
    },
    [socket, participando, salaId]
  );

  const borrarTrazos = useCallback(
    (ids: string[]) => {
      if (!socket || !participando || ids.length === 0) return;

      trazosRef.current = trazosRef.current.filter(
        (trazo) => !ids.includes(trazo.id)
      );
      setCantidad(trazosRef.current.length);
      redibujar();

      socket.timeout(8000).emit(
        'pizarra:borrar',
        { salaId, ids },
        (timeoutError: Error | null, respuesta: any) => {
          if (timeoutError || !respuesta?.ok) {
            setError(
              respuesta?.error || 'No se pudieron borrar los trazos seleccionados.'
            );
          }
        }
      );
    },
    [socket, participando, salaId, redibujar]
  );

  const deshacer = useCallback(() => {
    if (!socket || !participando) return;

    socket.timeout(8000).emit(
      'pizarra:deshacer',
      { salaId },
      (timeoutError: Error | null, respuesta: any) => {
        if (timeoutError) {
          setError('No se pudo deshacer el trazo.');
          return;
        }
        if (!respuesta?.ok) {
          setError(respuesta?.error || 'No se pudo deshacer el trazo.');
          return;
        }

        if (respuesta.trazo) {
          redoRef.current = [...redoRef.current, respuesta.trazo];
        }
        setError('');
      }
    );
  }, [socket, participando, salaId]);

  const rehacer = useCallback(() => {
    const trazo = redoRef.current[redoRef.current.length - 1];
    if (!trazo) return;

    redoRef.current = redoRef.current.slice(0, -1);
    guardarTrazo({
      tipo: trazo.tipo,
      color: trazo.color,
      grosor: trazo.grosor,
      datos: trazo.datos,
    });
  }, [guardarTrazo]);

  const limpiarPizarra = useCallback(() => {
    if (!socket || !participando) return;
    if (!window.confirm('¿Borrar todos los trazos de la pizarra?')) return;

    socket.timeout(8000).emit(
      'pizarra:limpiar',
      { salaId },
      (timeoutError: Error | null, respuesta: any) => {
        if (timeoutError || !respuesta?.ok) {
          setError(
            respuesta?.error || 'No se pudo limpiar la pizarra.'
          );
        }
      }
    );
  }, [socket, participando, salaId]);

  /* ------------------------------------------------------------------ */
  /* Interacción con el lienzo                                           */
  /* ------------------------------------------------------------------ */

  const puntoDeEvento = (e: React.PointerEvent<HTMLCanvasElement>): PuntoTrazo => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const borrarEnPunto = (punto: PuntoTrazo) => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const ancho = contenedor.clientWidth;
    const alto = contenedor.clientHeight;
    const umbral = 10;

    const ids = trazosRef.current
      .filter((trazo) => {
        if (trazo.tipo === 'texto') {
          const cx = (trazo.datos.x ?? 0) * ancho;
          const cy = (trazo.datos.y ?? 0) * alto;
          return Math.hypot(punto.x * ancho - cx, punto.y * alto - cy) < 40;
        }

        const puntos = trazo.datos.puntos ?? [];
        for (let i = 1; i < puntos.length; i += 1) {
          const distancia = distanciaASegmento(
            punto.x * ancho,
            punto.y * alto,
            puntos[i - 1].x * ancho,
            puntos[i - 1].y * alto,
            puntos[i].x * ancho,
            puntos[i].y * alto
          );

          if (distancia <= umbral) return true;
        }

        return false;
      })
      .map((trazo) => trazo.id);

    borrarTrazos(ids);
  };

  const alPresionar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!participando) return;

    const punto = puntoDeEvento(e);

    if (herramienta === 'texto') {
      setTextoPendiente({ x: punto.x, y: punto.y, valor: '' });
      return;
    }

    if (herramienta === 'borrar') {
      borrarEnPunto(punto);
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    dibujandoRef.current = true;
    actualRef.current = { puntos: [punto], color, grosor };
    redibujar();
  };

  const alMover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!participando) return;

    const punto = puntoDeEvento(e);

    if (socket) {
      const ahora = Date.now();
      if (ahora - ultimoCursorRef.current > 120) {
        ultimoCursorRef.current = ahora;
        socket.emit('pizarra:cursor', {
          salaId,
          x: punto.x,
          y: punto.y,
          color: miColor,
        });
      }
    }

    if (!dibujandoRef.current || !actualRef.current) return;

    const actual = actualRef.current;
    const ultimo = actual.puntos[actual.puntos.length - 1];
    if (Math.hypot(punto.x - ultimo.x, punto.y - ultimo.y) < 0.0015) return;

    actual.puntos.push(punto);
    redibujar();

    const ahora = Date.now();
    if (socket && ahora - ultimoPreviewRef.current > 80) {
      ultimoPreviewRef.current = ahora;
      socket.emit('pizarra:preview', {
        salaId,
        trazo: {
          color: actual.color,
          grosor: actual.grosor,
          datos: { puntos: actual.puntos },
        },
      });
    }
  };

  const terminarTrazo = () => {
    if (!dibujandoRef.current || !actualRef.current) return;

    const actual = actualRef.current;
    dibujandoRef.current = false;
    actualRef.current = null;

    if (actual.puntos.length >= 2) {
      guardarTrazo({
        tipo: 'trazo',
        color: actual.color,
        grosor: actual.grosor,
        datos: { puntos: actual.puntos },
      });
    }

    redibujar();
  };

  const confirmarTexto = () => {
    if (!textoPendiente) return;

    const contenido = textoPendiente.valor.trim();
    if (contenido) {
      guardarTrazo({
        tipo: 'texto',
        color,
        grosor,
        datos: {
          texto: contenido,
          x: textoPendiente.x,
          y: textoPendiente.y,
        },
      });
    }

    setTextoPendiente(null);
  };

  /* ------------------------------------------------------------------ */
  /* Exportar imagen                                                     */
  /* ------------------------------------------------------------------ */

  const descargarImagen = () => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    const ancho = 1600;
    const alto = Math.round((contenedor.clientHeight / contenedor.clientWidth) * ancho);

    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;

    const ctx = lienzo.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, ancho, alto);

    for (const trazo of trazosRef.current) {
      pintarTrazo(ctx, trazo, ancho, alto);
    }

    const enlace = document.createElement('a');
    enlace.href = lienzo.toDataURL('image/png');
    enlace.download = `pizarra-${salaId.slice(0, 8)}.png`;
    enlace.click();
    setMenuAbierto(false);
  };

  const habilitado = participando && conexionLista;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)]">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">
            ✏️
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Pizarra colaborativa
            </h2>
            <p className="text-[11px] text-slate-400">
              {cargando
                ? 'Cargando trazos…'
                : `${cantidad} trazo${cantidad === 1 ? '' : 's'} guardado${
                    cantidad === 1 ? '' : 's'
                  }`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span
            className={`h-2 w-2 rounded-full ${
              error
                ? 'bg-red-400'
                : guardando
                  ? 'bg-amber-400'
                  : habilitado
                    ? 'bg-emerald-500'
                    : 'bg-slate-300'
            }`}
          />
          <span className="text-slate-500">
            {error
              ? 'Revisa la conexión'
              : guardando
                ? 'Guardando…'
                : habilitado
                  ? 'Sincronizado'
                  : 'Solo lectura'}
          </span>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setHerramienta('texto')}
            disabled={!habilitado}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
              herramienta === 'texto'
                ? 'bg-white text-[#0B4FC4] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Escribir texto"
          >
            <span aria-hidden="true" className="font-serif text-sm leading-none">T</span>
            <span className="hidden sm:inline">Escribir</span>
          </button>
          <button
            type="button"
            onClick={() => setHerramienta('dibujar')}
            disabled={!habilitado}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
              herramienta === 'dibujar'
                ? 'bg-[#0B4FC4] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Dibujar a mano alzada"
          >
            <span aria-hidden="true">✎</span>
            <span className="hidden sm:inline">Dibujar</span>
          </button>
          <button
            type="button"
            onClick={() => setHerramienta('borrar')}
            disabled={!habilitado}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
              herramienta === 'borrar'
                ? 'bg-white text-[#0B4FC4] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Borrar trazos"
          >
            <span aria-hidden="true">⌫</span>
            <span className="hidden sm:inline">Borrador</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={deshacer}
            disabled={!habilitado}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
            title="Deshacer mi último trazo"
          >
            ↺
          </button>
          <button
            type="button"
            onClick={rehacer}
            disabled={!habilitado}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
            title="Rehacer"
          >
            ↻
          </button>
        </div>

        <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-1.5">
          {COLORES_PIZARRA.map((opcion) => (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => setColor(opcion.valor)}
              disabled={!habilitado}
              className={`h-5 w-5 rounded-full border-2 transition-transform disabled:opacity-40 ${
                color === opcion.valor
                  ? 'scale-110 border-slate-900'
                  : 'border-white ring-1 ring-slate-200'
              }`}
              style={{ backgroundColor: opcion.valor }}
              title={opcion.nombre}
              aria-label={`Color ${opcion.nombre}`}
            />
          ))}
        </div>

        <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />

        <div className="flex items-center gap-1">
          {GROSORES_PIZARRA.map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => setGrosor(opcion)}
              disabled={!habilitado}
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                grosor === opcion ? 'bg-slate-200' : 'hover:bg-slate-100'
              }`}
              title={`Grosor ${opcion}`}
              aria-label={`Grosor ${opcion}`}
            >
              <span
                className="rounded-full bg-slate-700"
                style={{ width: opcion + 1, height: opcion + 1 }}
              />
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setMenuAbierto((prev) => !prev)}
            className="rounded-lg px-2 py-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title="Más opciones"
            aria-expanded={menuAbierto}
          >
            ⋯
          </button>

          {menuAbierto && (
            <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={descargarImagen}
                className="block w-full px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50"
              >
                Descargar imagen (PNG)
              </button>
              {esAnfitrion && (
                <button
                  type="button"
                  onClick={limpiarPizarra}
                  className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                >
                  Limpiar pizarra
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="border-b border-red-100 bg-red-50 px-3 py-1.5 text-[11px] text-red-700">
          {error}
        </div>
      )}

      {/* Lienzo */}
      <div
        ref={contenedorRef}
        className="relative min-h-[220px] flex-1 overflow-hidden bg-white"
        style={{
          backgroundColor: '#FFFFFF',
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full touch-none ${
            habilitado
              ? herramienta === 'texto'
                ? 'cursor-text'
                : herramienta === 'borrar'
                  ? 'cursor-cell'
                  : 'cursor-crosshair'
              : 'cursor-not-allowed'
          }`}
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={terminarTrazo}
          onPointerLeave={terminarTrazo}
          onPointerCancel={terminarTrazo}
        />

        {/* Cursor remoto */}
        {Object.entries(cursores).map(([id, cursor]) => (
          <div
            key={id}
            className="pointer-events-none absolute z-10 transition-transform duration-75"
            style={{
              left: `${cursor.x * 100}%`,
              top: `${cursor.y * 100}%`,
              transform: 'translate(-2px, -2px)',
            }}
          >
            <svg width="14" height="18" viewBox="0 0 14 18" aria-hidden="true">
              <path
                d="M1 1l11 8.5-5.2.8L9 16l-2.4 1-2-5.8L1 14V1z"
                fill={cursor.color}
                stroke="#fff"
                strokeWidth="1"
              />
            </svg>
            <span
              className="ml-2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.nombre}
            </span>
          </div>
        ))}

        {/* Entrada de texto */}
        {textoPendiente && (
          <div
            className="absolute z-20 flex items-center gap-1 rounded-lg border-2 border-[#0B4FC4] bg-white p-1 shadow-lg"
            style={{
              left: `min(calc(${textoPendiente.x * 100}% - 12px), calc(100% - 15rem))`,
              top: `min(${textoPendiente.y * 100}%, calc(100% - 3rem))`,
            }}
          >
            <input
              autoFocus
              value={textoPendiente.valor}
              onChange={(e) =>
                setTextoPendiente((prev) =>
                  prev ? { ...prev, valor: e.target.value } : prev
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmarTexto();
                if (e.key === 'Escape') setTextoPendiente(null);
              }}
              maxLength={300}
              placeholder="Escribe y pulsa Enter"
              aria-label="Texto para la pizarra"
              className="w-40 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-slate-300"
              style={{ color }}
            />
            <button
              type="button"
              onClick={confirmarTexto}
              className="shrink-0 rounded-md bg-[#0B4FC4] px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-[#093fa3]"
            >
              Añadir
            </button>
            <button
              type="button"
              onClick={() => setTextoPendiente(null)}
              aria-label="Cancelar texto"
              className="shrink-0 rounded-md px-1.5 py-1 text-[10px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        )}

        {!participando && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/80 px-6 text-center backdrop-blur-[1px]">
            <p className="text-sm font-bold text-slate-700">
              Únete a la sala para dibujar
            </p>
            <p className="text-xs text-slate-500">
              La pizarra se comparte solo con los participantes activos.
            </p>
          </div>
        )}
      </div>

      {/* Pie */}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              habilitado ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          />
          {habilitado ? 'Historial guardado · sincronización en vivo' : 'Sin conexión'}
        </span>
        <span className="hidden sm:inline">
          {herramienta === 'borrar'
            ? 'Haz clic sobre un trazo para borrarlo'
            : herramienta === 'texto'
              ? 'Haz clic en la pizarra para escribir'
              : 'Dibuja con el ratón o el dedo'}
        </span>
      </div>
    </section>
  );
}
