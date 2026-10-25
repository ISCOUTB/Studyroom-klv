# Campus Collaborative Study — Universidad Tecnológica de Bolívar (UTB)

Plataforma colaborativa web (responsive desde 360px) para estudiantes de primeros semestres (Cálculo, Física, Álgebra, Estadística) que permite:
1. **Unirse a salas de estudio simultáneo** y resolver ejercicios en conjunto con chat en tiempo real (< 2s) y control de cupo configurable (2 a 50 participantes, 10 por defecto).
2. **Agendar tutorías con estudiantes avanzados (monitores)**, seleccionando modalidad (Virtual / Presencial con ubicación en campus ej. "Bloque C · Salón 204") y bloques de disponibilidad horaria.

Proyecto desarrollado para la asignatura de Ingeniería de Software (Grupo 1206).

---

## Equipo de Desarrollo
- **Luis Alfredo Rodríguez** — Desarrollo / Gestión del repositorio
- **Kevin Acuña** — Desarrollo
- **Valery Aurela** — Desarrollo
- **Docente:** Aisner José Marrugo Juliao

---

## Estructura del Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + Shadcn/ui (Estilo institucional UTB `#0B4FC4` / `#1473E6`).
- **Backend (API REST):** Node.js + Express + Prisma ORM. La autenticación está implementada en `/api/auth`, las salas de estudio en `/api/salas`, los materiales de cada sala en `/api/salas/:id/materiales`, las tutorías en `/api/tutorias`, las notificaciones en `/api/notificaciones` y la administración de monitores en `/api/admin/monitores`.
- **Base de Datos:** PostgreSQL (Supabase o local) + Prisma ORM.
- **Autenticación:** JWT con expiración de 8 h + bcryptjs. Verificación de correo con token de 24 h y recuperación de contraseña con token de 1 h.
- **Correo:** Nodemailer vía SMTP. Si no hay SMTP configurado, los enlaces se imprimen en la consola del backend para desarrollo.
- **Tiempo Real:** Socket.IO sobre el mismo servidor HTTP de Express. El chat y las notificaciones usan el JWT de la API; el chat valida la participación en la sala, mientras que cada usuario autenticado se une a una sala privada para recibir sus avisos.

---

## Requisitos Previos

- Node.js >= 18.x
- npm >= 9.x o pnpm >= 8.x
- PostgreSQL local o en Supabase, con su `DATABASE_URL`

---

## Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/Studyroom-klv.git
   cd Studyroom-klv
   ```

2. **Configurar variables de entorno:**
   Copia `.env.example` a `.env` en la raíz (para Prisma) y a `backend/.env` (para la API):
   ```powershell
   Copy-Item .env.example .env
   Copy-Item .env.example backend/.env
   ```
   Ajusta al menos `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Si dejas las variables `SMTP_*` vacías, los enlaces de verificación y recuperación se imprimen en la consola del backend.

3. **Instalar dependencias (raíz, frontend y backend):**
   ```bash
   npm run install:all
   ```

4. **Preparar la base de datos (Prisma):**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```
   El seed crea (o actualiza) el usuario administrador con las credenciales definidas en `backend/.env`.

---

## Ejecución

### Desarrollo

Abre dos terminales en la raíz del proyecto:

```bash
# Terminal 1 - API (Express + Prisma)
npm run dev:backend

# Terminal 2 - Frontend (Next.js)
npm run dev:frontend
```

- Frontend: `http://localhost:3000`
- API: `http://localhost:3001`
- Salud de la API: `http://localhost:3001/health`

> `npm run dev` levanta únicamente el frontend.

### Producción
```bash
npm run build        # frontend
cd backend && npm run build && npm start
```

---

## API de Autenticación

URL base: `http://localhost:3001`

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `POST` | `/api/auth/registro` | Crea la cuenta (correo `@utb.edu.co`) y envía el enlace de verificación. |
| `GET` | `/api/auth/verificar/:token` | Verifica el correo con el token de 24 h. |
| `POST` | `/api/auth/reenviar-verificacion` | Genera y envía un nuevo enlace de verificación. |
| `POST` | `/api/auth/login` | Inicia sesión si el correo está verificado. Devuelve JWT (8 h). |
| `GET` | `/api/auth/me` | Devuelve el usuario autenticado. Requiere `Authorization: Bearer <token>`. |
| `POST` | `/api/auth/recuperar` | Envía el enlace de recuperación (token de 1 h). |
| `POST` | `/api/auth/restablecer` | Cambia la contraseña usando el token de recuperación. |

El login rechaza las cuentas cuyo correo aún no esté verificado. Las rutas protegidas validan el JWT y los roles `ESTUDIANTE`, `TUTOR` y `ADMINISTRADOR`.

### Pantallas de autenticación (frontend)

| Ruta | Descripción |
| --- | --- |
| `/login` | Inicio de sesión y registro. Al registrarse, la cuenta queda pendiente de verificación y la pantalla vuelve a "Ingresar" con el correo escrito. |
| `/verificar?token=...` | Verifica el correo con el enlace enviado. Si el token expiró o ya se usó, permite solicitar uno nuevo. |
| `/recuperar` | Solicita el enlace de recuperación. Por seguridad, siempre responde con el mismo mensaje, exista o no la cuenta. |
| `/restablecer?token=...` | Permite crear la nueva contraseña (mínimo 8 caracteres y confirmación). El token de recuperación vence en 1 hora. |

El JWT se guarda en `localStorage` bajo la clave `utb_token` y la sesión se rehidrata consultando `/api/auth/me` al recargar la página.

---

## API de Salas de Estudio

Todas las rutas requieren `Authorization: Bearer <token>`.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/salas` | Lista las salas activas y programadas con su anfitrión y número de participantes. |
| `POST` | `/api/salas` | Crea una sala. El usuario autenticado queda como anfitrión y primer participante. |
| `GET` | `/api/salas/:id` | Devuelve el detalle de una sala y sus participantes activos. |
| `POST` | `/api/salas/:id/unirse` | Une al usuario autenticado a la sala (valida el cupo). |
| `POST` | `/api/salas/:id/abandonar` | Marca la participación del usuario como abandonada y lo saca del chat en tiempo real. |
| `GET` | `/api/salas/:id/mensajes` | Devuelve los últimos 100 mensajes del chat en orden cronológico. Solo para participantes activos. |
| `GET` | `/api/salas/:id/materiales` | Lista los materiales de la sala, del más reciente al más antiguo. Solo para participantes activos. |
| `POST` | `/api/salas/:id/materiales` | Sube un archivo (`multipart/form-data`, campo `archivo`) con descripción opcional (máx. 300 caracteres). Solo para participantes activos. |
| `GET` | `/api/salas/:id/materiales/:materialId/descargar` | Descarga el archivo original. Requiere JWT y participación activa. |
| `DELETE` | `/api/salas/:id/materiales/:materialId` | Elimina un material. Puede hacerlo quien lo subió, el anfitrión de la sala o un administrador. |

### Pantallas de salas (frontend)

| Ruta | Descripción |
| --- | --- |
| `/salas` | Listado real desde la API, búsqueda, filtros por asignatura/estado, creación de salas y acceso a cada sala. |
| `/salas/[id]` | Detalle real de la sala, anfitrión, participantes, cronómetro y acciones de unirse/abandonar. Incluye chat en tiempo real con historial y presencia, y la pestaña de materiales con carga, descarga y eliminación de archivos. |

---

## Chat en Tiempo Real

El chat usa **Socket.IO** en `http://localhost:3001/socket.io`, sobre el mismo servidor HTTP de Express. No requiere credenciales de servicios externos.

- El cliente se conecta con `auth: { token }` usando el mismo JWT de la API.
- Solo los participantes con `ParticipacionSala.estado = ACTIVO` pueden leer el historial, unirse al canal y enviar mensajes.
- Los mensajes se guardan en la tabla `mensajes_chat` (máximo 500 caracteres).
- Al reconectarse, el cliente vuelve a unirse a la sala y recarga el historial.
- Si un usuario abandona la sala, el servidor lo expulsa del canal y deja de recibir mensajes.

### Eventos de Socket.IO

| Dirección | Evento | Payload | Descripción |
| --- | --- | --- | --- |
| Cliente → Servidor | `sala:unirse` | `{ salaId }` | Valida la participación y une el socket a la sala. |
| Cliente → Servidor | `sala:salir` | `{ salaId }` | Sale del canal y actualiza la presencia. |
| Cliente → Servidor | `mensaje:enviar` | `{ salaId, contenido }` | Guarda y difunde el mensaje (máximo 500 caracteres). |
| Servidor → Cliente | `mensaje:nuevo` | `{ id, contenido, enviadoEn, usuario }` | Mensaje persistido que reciben todos los participantes conectados. |
| Servidor → Cliente | `presencia:actualizada` | `{ salaId, usuarios }` | IDs de los usuarios con el chat abierto. |
| Servidor → Cliente | `sala:expulsado` | `{ salaId, motivo }` | El usuario dejó de ser participante activo de la sala. |

Los eventos que modifican estado responden con un `ack` en formato `{ ok, error }`. La interfaz usa la petición HTTP del historial y mantiene el orden cronológico de los mensajes.

---

## Materiales de Estudio

Cada sala tiene una pestaña **Materiales** donde los participantes activos pueden compartir archivos y descargar los que subió el grupo.

- **Almacenamiento:** los archivos se guardan en disco en `backend/uploads` (ruta ignorada por Git). Los metadatos viven en la tabla `materiales_estudio` de PostgreSQL. La carpeta se crea automáticamente al iniciar el backend.
- **Tamaño máximo:** 10 MB por archivo.
- **Formatos permitidos:** PDF, Word (`.doc`, `.docx`), PowerPoint (`.ppt`, `.pptx`), Excel (`.xls`, `.xlsx`), TXT e imágenes JPG, PNG y WEBP.
- **Privacidad:** ni la lista ni la descarga son públicas. El backend exige el JWT y verifica que el usuario tenga una participación `ACTIVO` en la sala.
- **Permisos de eliminación:** quien subió el material, el anfitrión de la sala o un usuario con rol `ADMINISTRADOR`.
- **Límite de descripción:** 300 caracteres (opcional).
- **Descarga:** el navegador solicita el archivo con el header `Authorization` y lo guarda con su nombre original.

La ruta de almacenamiento se puede cambiar con la variable opcional `UPLOADS_DIR` en `backend/.env`. Si se usa una ruta relativa, se resuelve desde la carpeta `backend`. En producción conviene respaldar esa carpeta o migrarla a un almacenamiento de objetos.

---

## Tutorías Académicas

Los estudiantes pueden agendar acompañamiento con monitores de semestres avanzados, de forma virtual o presencial en el campus.

### Flujo de una tutoría

1. Un estudiante envía su **solicitud de monitor** con carrera, semestre, asignaturas, biografía y modalidad.
2. Un **administrador** revisa la solicitud y la aprueba o la rechaza en `/admin/monitores`.
3. Al aprobarse, el usuario pasa a tener rol `TUTOR` y puede publicar **bloques de disponibilidad** (fecha, hora de inicio y hora de fin), además de editar su perfil público.
4. Un estudiante elige un monitor y un bloque libre, indica modalidad (Virtual / Presencial), ubicación y notas.
5. El monitor tiene **24 horas** (o hasta el inicio del bloque, si ocurre antes) para aceptar o rechazar. Si acepta, la tutoría queda `AGENDADA` y las demás solicitudes de ese bloque se rechazan automáticamente. Si no responde, la solicitud pasa a `EXPIRADA`.

### Estados de una tutoría

`SOLICITADA` → `AGENDADA` → `FINALIZADA`

También puede terminar en `RECHAZADA`, `EXPIRADA` o `CANCELADA`. El solicitante, el monitor o un administrador pueden cancelar una tutoría activa. Solo el monitor (o un administrador) puede finalizarla una vez llegó la hora.

### Reglas de disponibilidad

- Cada bloque debe estar en una fecha y hora futuras.
- Duración mínima de 30 minutos y máxima de 4 horas.
- No se permiten bloques superpuestos para el mismo monitor.
- Un bloque con tutoría agendada no se puede eliminar hasta cancelarla.
- Al eliminar un bloque con solicitudes pendientes, estas se cancelan automáticamente.

### API de tutorías

Todas las rutas requieren `Authorization: Bearer <token>`.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/tutorias/contexto` | Indica si el usuario es monitor aprobado y el estado de su solicitud. |
| `POST` | `/api/tutorias/solicitud-monitor` | Envía o actualiza una solicitud para ser monitor. |
| `GET` | `/api/tutorias/perfil-monitor` | Devuelve el perfil público del monitor y sus bloques. |
| `PUT` | `/api/tutorias/perfil-monitor` | Actualiza carrera, semestre, asignaturas, biografía y modalidad. |
| `GET` | `/api/tutorias/disponibilidad` | Lista los bloques futuros del monitor autenticado. |
| `POST` | `/api/tutorias/disponibilidad` | Publica un bloque (`fecha`, `horaIni`, `horaFin`). |
| `DELETE` | `/api/tutorias/disponibilidad/:id` | Elimina un bloque propio. |
| `GET` | `/api/tutorias/monitores` | Catálogo de monitores aprobados con sus bloques libres. |
| `GET` | `/api/tutorias` | Tutorías del usuario (solicitante o monitor; el administrador ve todas). |
| `POST` | `/api/tutorias` | Solicita una tutoría (`monitorId`, `disponibilidadId`, `modalidad`, `ubicacion`, `notas`). |
| `PATCH` | `/api/tutorias/:id/responder` | El monitor acepta o rechaza (`{ "aceptar": true }`). |
| `PATCH` | `/api/tutorias/:id/cancelar` | Cancela una tutoría activa. |
| `PATCH` | `/api/tutorias/:id/finalizar` | Marca como finalizada una tutoría agendada que ya comenzó. |
| `GET` | `/api/admin/monitores` | Lista solicitudes pendientes y monitores aprobados (solo administrador). |
| `PATCH` | `/api/admin/monitores/:id` | Aprueba o rechaza una solicitud (`{ "aprobado": true }`). |

### Pantallas de tutorías (frontend)

| Ruta | Descripción |
| --- | --- |
| `/tutorias` | Catálogo de monitores, filtros, agendamiento y seguimiento de tutorías activas e historial. |
| `/perfil/monitor` | Solicitud para ser monitor, edición del perfil público y gestión de bloques de disponibilidad. |
| `/admin/monitores` | Revisión, aprobación y rechazo de solicitudes de monitor. |

Los enlaces a **Tutorías** están disponibles desde la pantalla de salas. Los monitores ven el acceso a su perfil y los administradores al panel de aprobación.

---

## Notificaciones en Tiempo Real

Cada cambio relevante del ciclo de tutorías y de las postulaciones de monitor genera una **notificación persistente** en PostgreSQL. El usuario la recibe al instante si tiene la aplicación abierta y puede consultarla después desde la campanita.

### Experiencia de usuario

- **Campanita con contador** de avisos sin leer en `/salas`, `/salas/[id]`, `/tutorias`, `/perfil/monitor` y `/admin/monitores`.
- **Panel desplegable** con las últimas 30 notificaciones, su tipo, mensaje, fecha relativa y estado de lectura.
- **Aviso flotante (toast)** al recibir una notificación mientras la aplicación está abierta.
- **Marcado individual o masivo** como leído, con actualización inmediata del contador.
- **Enlaces de destino:** las tutorías abren `/tutorias#mis-tutorias` y las postulaciones abren `/admin/monitores` o `/perfil/monitor`, según corresponda.
- Las pantallas abiertas **se actualizan solas** al recibir un aviso (lista de tutorías, postulaciones o perfil del monitor).
- La campanita usa variante clara en las pantallas blancas y variante oscura dentro de la sala en vivo. El panel y el toast se adaptan desde 360 px.

### Eventos notificados

| Tipo | Destinatario | Cuándo se genera |
| --- | --- | --- |
| `TUTORIA_SOLICITADA` | Monitor | Un estudiante solicita uno de sus bloques. |
| `TUTORIA_ACEPTADA` | Estudiante | El monitor acepta la tutoría. |
| `TUTORIA_RECHAZADA` | Estudiante | El monitor rechaza la solicitud o el bloque fue ocupado por otra persona. |
| `TUTORIA_CANCELADA` | La otra parte | Se cancela la tutoría o el monitor elimina un bloque con solicitudes pendientes. |
| `TUTORIA_FINALIZADA` | Estudiante | El monitor finaliza una tutoría agendada. |
| `TUTORIA_EXPIRADA` | Estudiante | Pasan 24 h (o llega la hora del bloque) sin respuesta del monitor. |
| `SOLICITUD_MONITOR` | Administradores | Un estudiante envía o actualiza su postulación de monitor. |
| `MONITOR_APROBADO` | Solicitante | Un administrador aprueba su postulación. |
| `MONITOR_RECHAZADO` | Solicitante | Un administrador rechaza su postulación. |

La expiración se ejecuta al consultar o responder tutorías y usa un `updateMany` condicionado por estado para **no duplicar avisos** si dos procesos coinciden. La creación de notificaciones es *best-effort*: si falla el aviso, la acción principal (agendar, aceptar, cancelar, etc.) no se interrumpe.

### API de notificaciones

Todas las rutas requieren `Authorization: Bearer <token>`.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/notificaciones` | Devuelve las últimas 30 notificaciones del usuario y el total de no leídas. Acepta `?take=` (máximo 50). |
| `PATCH` | `/api/notificaciones/leer-todas` | Marca todas las notificaciones del usuario como leídas y devuelve `noLeidas: 0`. |
| `PATCH` | `/api/notificaciones/:id/leer` | Marca una notificación propia como leída. Responde `404` si pertenece a otro usuario. |

### Socket.IO

Al autenticarse, cada socket se une automáticamente a la sala privada `usuario:<id>`. El backend emite:

| Dirección | Evento | Payload | Descripción |
| --- | --- | --- | --- |
| Servidor → Cliente | `notificacion:nueva` | `{ id, tipo, titulo, mensaje, enlace, leida, creadaEn }` | Aviso persistido, enviado a todas las sesiones abiertas del usuario. |

El frontend mantiene una única conexión de notificaciones en el layout raíz (`NotificationsProvider`), independiente de la conexión del chat de una sala.

### Persistencia

- Tabla `notificaciones` con relación en cascada al usuario.
- Campos: `id`, `usuario_id`, `tipo`, `titulo` (120), `mensaje` (300), `enlace` (200), `leida` y `creada_en`.
- Índice `(usuario_id, leida, creada_en)` para el contador y el listado.
- Migración: `prisma/migrations/20261025150000_notificaciones`.

---

## Estrategia de Ramas (Git Flow Simplificado)

El equipo opera con una estrategia basada en ramas de características (`feature/*`) integradas a `develop` y liberadas a `main`:

- `main`: Rama de producción estable. Todo despliegue oficial proviene de aquí.
- `develop`: Rama de integración para el Sprint en curso.
- `feature/*`: Ramas individuales para cada funcionalidad o tarea (ej. `feature/auth-login`, `feature/salas-chat`, `feature/perfil-monitor`).

---

## Convención de Commits (Conventional Commits)

Los mensajes de commit deben seguir estrictamente el formato:
```
<tipo>(<alcance>): <descripción breve>

[cuerpo opcional]
```

**Tipos permitidos:**
- `feat`: Nueva característica (ej. `feat(salas): agregar control de cupo máximo 10`)
- `fix`: Corrección de error (ej. `fix(auth): validar correo @utb.edu.co`)
- `docs`: Cambios en documentación (`docs(readme): actualizar instrucciones`)
- `style`: Cambios de formato, CSS, diseño visual (`style(login): ajustar colores UTB`)
- `refactor`: Refactorización de código sin cambios funcionales
- `test`: Adición o corrección de pruebas
- `chore`: Tareas de mantenimiento, dependencias o configuración (`chore(prisma): inicializar schema`)

---

## Licencia
Proyecto académico institucional — Universidad Tecnológica de Bolívar (2026).
