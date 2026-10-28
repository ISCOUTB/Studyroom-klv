# StudyRoom — Universidad Tecnológica de Bolívar (UTB)

Plataforma colaborativa web (responsive desde 360px) para estudiantes de primeros semestres (Cálculo, Física, Álgebra, Estadística) que permite:
1. **Unirse a salas de estudio simultáneo** y resolver ejercicios en conjunto con mensajería en tiempo real (< 2s) y control de cupo configurable (2 a 50 participantes, 10 por defecto).
2. **Agendar tutorías con estudiantes avanzados (monitores)**, seleccionando modalidad (Virtual / Presencial con ubicación en campus ej. "Bloque C · Salón 204") y bloques de disponibilidad horaria.
3. **Publicar dudas en un foro académico**, filtrarlas por asignatura, tema y estado, y marcar la respuesta que resolvió la pregunta.

Proyecto desarrollado para la asignatura de Ingeniería de Software (Grupo 1206).

---

## Equipo de Desarrollo
- **Luis Alfredo Rodríguez** — Desarrollo / Diseño Visual
- **Kevin Acuña** — Desarrollo / Diseño Visual / Gestión del repositorio 
- **Valery Aurela** — Desarrollo / Flujo de Trabajo
- **Docente:** Aisner José Marrugo Juliao

---

## Estructura del Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + Shadcn/ui (Estilo institucional UTB `#0B4FC4` / `#1473E6`).
- **Backend (API REST):** Node.js + Express + Prisma ORM. La autenticación está implementada en `/api/auth`, las salas de estudio en `/api/salas`, los materiales de cada sala en `/api/salas/:id/materiales`, las tutorías en `/api/tutorias`, el foro de dudas en `/api/foro`, las notificaciones en `/api/notificaciones`, el catálogo de asignaturas en `/api/asignaturas`, los reportes de contenido en `/api/reportes` y la administración en `/api/admin`.
- **Base de Datos:** PostgreSQL (Supabase o local) + Prisma ORM.
- **Autenticación:** JWT con expiración de 8 h + bcryptjs. Verificación de correo con enlace válido por 24 h y recuperación de contraseña con enlace válido por 1 h.
- **Correo:** Nodemailer vía SMTP. Si no hay SMTP configurado, los enlaces se imprimen en la consola del servicio para desarrollo.
- **Tiempo Real:** Socket.IO sobre el mismo servidor HTTP de Express. La mensajería y las notificaciones usan el JWT de la API; la mensajería valida la participación en la sala, mientras que cada usuario autenticado se une a una sala privada para recibir sus avisos.

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

   > Si modificas `prisma/schema.prisma`, detén el backend antes de ejecutar `npm run db:generate`. En Windows el proceso en ejecución bloquea el motor de Prisma y la generación falla con `EPERM`.

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
| `GET` | `/api/auth/verificar/:token` | Verifica el correo con el enlace enviado (válido por 24 h). |
| `POST` | `/api/auth/reenviar-verificacion` | Genera y envía un nuevo enlace de verificación. |
| `POST` | `/api/auth/login` | Inicia sesión si el correo está verificado. Devuelve JWT (8 h). |
| `GET` | `/api/auth/me` | Devuelve el usuario autenticado. Requiere `Authorization: Bearer <token>`. |
| `POST` | `/api/auth/recuperar` | Envía el enlace de recuperación (válido por 1 h). |
| `POST` | `/api/auth/restablecer` | Cambia la contraseña usando el código del enlace de recuperación. |

El login rechaza las cuentas cuyo correo aún no esté verificado. Las rutas protegidas validan el JWT y los roles `ESTUDIANTE`, `TUTOR` y `ADMINISTRADOR`.

### Pantallas de autenticación (frontend)

| Ruta | Descripción |
| --- | --- |
| `/login` | Inicio de sesión y registro. Al registrarse, la cuenta queda pendiente de verificación y la pantalla vuelve a "Ingresar" con el correo escrito. |
| `/verificar?token=...` | Verifica el correo con el enlace enviado. Si el enlace expiró o ya se usó, permite solicitar uno nuevo. |
| `/recuperar` | Solicita el enlace de recuperación. Por seguridad, siempre responde con el mismo mensaje, exista o no la cuenta. |
| `/restablecer?token=...` | Permite crear la nueva contraseña (mínimo 8 caracteres y confirmación). El enlace de recuperación vence en 1 hora. |

El JWT se guarda en `localStorage` bajo la clave `utb_token` y la sesión se rehidrata consultando `/api/auth/me` al recargar la página.

---

## API de Salas de Estudio

Todas las rutas requieren `Authorization: Bearer <token>`.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/salas` | Lista las salas activas y programadas con su anfitrión, participantes y nuevos campos. Las salas privadas solo aparecen para su anfitrión, sus participantes activos o si se consulta con `?codigo=CODIGO`. |
| `POST` | `/api/salas` | Crea una sala. Acepta `titulo`, `asignatura`, `tema`, `descripcion`, `estado` (`Activa`/`Programada`), `privacidad` (`Pública`/`Privada`), `cupoMaximo` (2–50) y `programadaEn` (ISO, obligatoria y futura para salas programadas). Si es privada, genera un `codigoAcceso` único de 6 caracteres. El usuario autenticado queda como anfitrión y primer participante. |
| `GET` | `/api/salas/:id` | Devuelve el detalle de una sala y sus participantes activos. |
| `POST` | `/api/salas/:id/unirse` | Une al usuario autenticado a la sala (valida el cupo). En salas privadas exige `codigoAcceso`, salvo que quien se una sea el anfitrión o ya sea participante. Las salas programadas solo admiten ingresos desde su fecha y hora. |
| `POST` | `/api/salas/:id/abandonar` | Marca la participación del usuario como abandonada y lo saca de la mensajería en tiempo real. |
| `GET` | `/api/salas/:id/mensajes` | Devuelve los últimos 100 mensajes de la sala en orden cronológico. Solo para participantes activos. |
| `GET` | `/api/salas/:id/materiales` | Lista los materiales de la sala, del más reciente al más antiguo. Solo para participantes activos. |
| `POST` | `/api/salas/:id/materiales` | Sube un archivo (`multipart/form-data`, campo `archivo`) con descripción opcional (máx. 300 caracteres). Solo para participantes activos. |
| `GET` | `/api/salas/:id/materiales/:materialId/descargar` | Descarga el archivo original. Requiere JWT y participación activa. |
| `DELETE` | `/api/salas/:id/materiales/:materialId` | Elimina un material. Puede hacerlo quien lo subió, el anfitrión de la sala o un administrador. |

### Salas programadas y privadas

| Campo / comportamiento | Descripción |
| --- | --- |
| `SalaEstudio.programadaEn` | `DateTime?`. Fecha y hora de apertura de una sala programada. Debe ser futura al crear la sala. |
| `SalaEstudio.codigoAcceso` | `String? @unique`. Código aleatorio de 6 caracteres que se genera para las salas privadas. |
| Activación automática | El scheduler existente revisa cada minuto las salas `PROGRAMADA` cuya hora ya pasó y las pasa a `ACTIVA`. |
| Visibilidad | El listado excluye las salas privadas ajenas. El anfitrión y los participantes reciben el código; el resto debe conocerlo o abrir el enlace. |
| Formato de fecha en UI | `mié, 28 de oct, 2:26 p. m.` (según la zona horaria del navegador). |

### Navegación autenticada (frontend)

Todas las pantallas autenticadas comparten el componente `AppShell`: barra lateral con Inicio, Salas, Tutorías, Foro, Banco de ejercicios y Administración (solo para `ADMINISTRADOR`), además de la barra superior con buscador (`⌘K`/`Ctrl+K`), modo oscuro, notificaciones y acceso al perfil. La barra lateral se colapsa en móvil desde 360 px. La sala en vivo `/salas/[id]` mantiene su propio diseño sin `AppShell`.

| Ruta | Descripción |
| --- | --- |
| `/inicio` | Panel de bienvenida con saludo por hora, salas en vivo, próximas tutorías y la sección real **Dudas sin resolver** (máximo 3 preguntas del foro, con acceso al detalle y al modal de creación). Es la ruta posterior al inicio de sesión. |
| `/salas` | Listado real desde la API con búsqueda por título/tema/descripción, segmentado Todas/En vivo/Programadas, chips por materia, tarjetas con cupo, fecha programada, candado de privacidad y código para el anfitrión. Incluye el modal de creación y el acceso mediante código. |
| `/salas/[id]` | Detalle real de la sala, anfitrión, participantes, cronómetro y acciones de unirse/abandonar. Incluye mensajería en tiempo real con historial y presencia, y la pestaña de materiales con carga, descarga y eliminación de archivos. |
| `/foro` | Foro de dudas con buscador, filtro por tema, chips de asignatura, pestañas por estado, tarjetas clicables y modal de creación. |
| `/foro/[id]` | Detalle de una pregunta con sus respuestas, aceptación de la respuesta correcta y acciones de eliminación según permisos. |
| `/banco-ejercicios` | Página “Próximamente” dentro de `AppShell` para la funcionalidad en preparación. |
| `/tutorias`, `/perfil`, `/perfil/editar`, `/perfil/monitor` | Conservan su contenido actual y se muestran dentro de `AppShell`. |
| `/admin` | Panel de administración con pestañas Resumen, Monitores, Asignaturas, Reportes y Auditoría. Solo para `ADMINISTRADOR`; los demás roles ven **Acceso denegado**. La pestaña activa se refleja en la URL (`/admin?tab=monitores`). |
| `/admin/monitores` | Redirige a `/admin?tab=monitores` para conservar enlaces anteriores. |

---

## Mensajería en Tiempo Real

La mensajería usa **Socket.IO** en `http://localhost:3001/socket.io`, sobre el mismo servidor HTTP de Express. No requiere credenciales de servicios externos.

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
| Servidor → Cliente | `presencia:actualizada` | `{ salaId, usuarios }` | IDs de los usuarios con la mensajería abierta. |
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

## Foro de Dudas (RF-16)

Espacio asíncrono para que los estudiantes publiquen sus dudas y reciban respuestas de compañeros y monitores, sin necesidad de coincidir en horario. Cada pregunta pertenece a una asignatura, puede llevar un tema opcional y queda **resuelta** cuando su autor acepta una respuesta.

### Reglas

- Solo los usuarios autenticados pueden listar, publicar, responder o consultar el foro.
- **Aceptar una respuesta:** únicamente el autor de la pregunta. Al hacerlo se desmarcan las demás respuestas, la elegida queda como aceptada y la pregunta pasa a `resuelta = true`.
- **Eliminar:** el autor de la pregunta o de la respuesta, o un usuario con rol `ADMINISTRADOR`. Al borrar una pregunta se eliminan sus respuestas en cascada; al borrar la respuesta aceptada, la pregunta vuelve a quedar sin resolver.
- **Límites:** título 150 caracteres, descripción 1000, tema 80 y respuesta 1000. El título requiere al menos 5 caracteres, la descripción 10 y la respuesta 3.
- **Orden del listado:** primero las preguntas sin resolver y, dentro de cada grupo, las más recientes. En el detalle, la respuesta aceptada aparece primero.
- **Notificaciones:** al responder una pregunta ajena se avisa al autor (`FORO_RESPUESTA`); al aceptar una respuesta se avisa a quien la escribió (`FORO_ACEPTADA`).

### API del foro

Todas las rutas requieren `Authorization: Bearer <token>`.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/foro` | Lista las preguntas con autor, número de respuestas y fecha. Acepta `?asignatura=`, `?estado=todas\|sin-resolver\|resueltas`, `?q=` (título o descripción) y `?tema=` (búsqueda parcial sin distinguir mayúsculas). |
| `POST` | `/api/foro` | Publica una pregunta (`titulo`, `descripcion`, `asignatura`, `tema` opcional). |
| `GET` | `/api/foro/:id` | Devuelve la pregunta completa y sus respuestas, con la aceptada primero. |
| `POST` | `/api/foro/:id/respuestas` | Agrega una respuesta (`contenido`). |
| `PATCH` | `/api/foro/:id/respuestas/:respuestaId/aceptar` | Marca una respuesta como aceptada y la pregunta como resuelta. Solo el autor de la pregunta. |
| `DELETE` | `/api/foro/:id` | Elimina una pregunta y sus respuestas. Autor o administrador. |
| `DELETE` | `/api/foro/:id/respuestas/:respuestaId` | Elimina una respuesta. Autor de la respuesta o administrador. |

### Pantallas del foro

| Ruta | Descripción |
| --- | --- |
| `/foro` | Listado con buscador por palabra clave, filtro por tema, chips de asignatura (Todas + catálogo activo), pestañas Todas/Sin resolver/Resueltas y tarjetas clicables con etiqueta de asignatura, tema, autor, tiempo relativo, contador de respuestas e insignia verde "Resuelta". Incluye el modal "Hacer una pregunta". |
| `/foro/[id]` | Pregunta completa, respuestas (la aceptada destacada en verde), caja para responder y botón "Marcar como respuesta" visible solo para el autor. Permite eliminar la pregunta o las respuestas según los permisos. |

La sección **Dudas sin resolver** de `/inicio` consume `GET /api/foro?estado=sin-resolver`, muestra como máximo 3 preguntas y su botón "Hacer una pregunta" abre el mismo modal de creación.

### Persistencia

- Modelos Prisma `Pregunta` y `Respuesta`, mapeados a las tablas `preguntas_foro` y `respuestas_foro`.
- `Pregunta`: `id`, `autor_id`, `titulo` (150), `descripcion` (1000), `asignatura`, `tema` (80, opcional), `resuelta` (por defecto `false`) y `creado_en`.
- `Respuesta`: `id`, `pregunta_id` (cascada), `autor_id`, `contenido` (1000), `aceptada` (por defecto `false`) y `creado_en`.
- Índices para el listado por asignatura/estado/fecha y para las respuestas por pregunta/fecha.
- Migración: `prisma/migrations/20261028000000_foro_dudas`, que además agrega los tipos `FORO_RESPUESTA` y `FORO_ACEPTADA` al enum de notificaciones.

---

## Administración, Catálogo y Moderación (RF-18)

La pantalla `/admin` está disponible únicamente para el rol `ADMINISTRADOR`; cualquier otro rol autenticado ve **Acceso denegado**. El título es **Administración**, con el subtítulo “Métricas de la plataforma, monitores, catálogo y moderación.”, y cinco pestañas con icono cuya selección se refleja en la URL:

| Pestaña | URL | Contenido |
| --- | --- | --- |
| Resumen | `/admin?tab=resumen` | Nueve tarjetas de métricas: usuarios registrados y nuevos en 7 días, activación de estudiantes, salas activas/total, tutorías finalizadas/solicitadas, calificación promedio con estrellas, preguntas del foro, ejercicios resueltos, materiales publicados y reportes pendientes. |
| Monitores | `/admin?tab=monitores` | Solicitudes pendientes con aprobar/rechazar y listado de monitores activos. Reemplaza la antigua `/admin/monitores`, que ahora redirige aquí. |
| Asignaturas | `/admin?tab=asignaturas` | CRUD del catálogo: crear, renombrar, elegir color y activar/desactivar. |
| Reportes | `/admin?tab=reportes` | Reportes de material, pregunta, respuesta o mensaje con estado, motivo, reportante y fecha. Acciones **Retirar contenido** y **Descartar**. |
| Auditoría | `/admin?tab=auditoria` | Tabla paginada y de solo lectura con fecha, responsable, acción y detalle. |

### Catálogo de asignaturas

- Las pantallas de **salas**, **tutorías**, **foro**, **inicio** y **perfil de monitor** leen el catálogo activo desde `GET /api/asignaturas` mediante el `CatalogoProvider` del layout raíz.
- Si la API no está disponible o el catálogo está vacío, el frontend usa como respaldo la lista fija de `frontend/lib/salas.ts` (`Cálculo I`, `Física I`, `Álgebra Lineal`, `Estadística`, `Cálculo Integral`).
- El backend valida la asignatura de salas y foro contra el catálogo activo y también aplica la lista fija como respaldo si la tabla está vacía.
- Colores disponibles: `blue`, `emerald`, `amber`, `rose`, `violet`, `sky`, `indigo`, `teal`, `orange`, `slate`.
- La migración siembra el catálogo inicial con identificadores fijos.

### Reportes y moderación

- Cualquier usuario autenticado puede reportar materiales de sala, preguntas y respuestas del foro desde el botón **Reportar**.
- Un mismo usuario no puede tener dos reportes pendientes sobre el mismo contenido (`409`).
- **Retirar contenido** elimina el material, la pregunta, la respuesta o el mensaje reportado. Si la respuesta era la aceptada, la pregunta vuelve a quedar sin resolver. Los demás reportes pendientes del mismo contenido se cierran automáticamente.
- **Descartar** cierra el reporte sin borrar el contenido.
- Cada decisión administrativa queda registrada en la auditoría.

### API de administración

Todas las rutas de `/api/admin` requieren `Authorization: Bearer <token>` y el rol `ADMINISTRADOR`.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/admin/resumen` | Devuelve todas las métricas del panel en una sola respuesta. |
| `GET` | `/api/admin/asignaturas` | Lista el catálogo completo con colores disponibles. |
| `POST` | `/api/admin/asignaturas` | Crea una asignatura (`nombre`, `color`). |
| `PATCH` | `/api/admin/asignaturas/:id` | Renombra, cambia el color o activa/desactiva (`activa`). |
| `GET` | `/api/admin/reportes?estado=todos\|pendientes\|resueltos` | Lista los reportes y sus totales por estado. |
| `PATCH` | `/api/admin/reportes/:id` | Resuelve un reporte con `{ "accion": "retirar" \| "descartar" }`. |
| `GET` | `/api/admin/auditoria?page=1&limit=10` | Devuelve la auditoría paginada. |
| `GET` | `/api/admin/monitores` | Lista solicitudes pendientes y monitores aprobados. |
| `PATCH` | `/api/admin/monitores/:id` | Aprueba o rechaza una solicitud (`{ "aprobado": true }`). |

Rutas para usuarios autenticados:

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/asignaturas` | Catálogo activo para filtros, formularios y etiquetas. |
| `POST` | `/api/reportes` | Reporta contenido (`tipo`, `referenciaId`, `motivo`). |

### Persistencia

- **`Asignatura`** → tabla `asignaturas`: `id`, `nombre` único, `color`, `activa`, `creado_en`, `actualizado_en`.
- **`Reporte`** → tabla `reportes`: `id`, `tipo` (`MATERIAL`, `PREGUNTA`, `RESPUESTA`, `MENSAJE`), `referencia_id`, `motivo` (500), `reportante_id`, `estado` (`PENDIENTE`, `RESUELTO`), `resuelto_por_id` opcional, `resuelto_en`, `creado_en`.
- **`RegistroAuditoria`** → tabla `registro_auditoria`: `id`, `admin_id`, `accion` (120), `detalle` (500), `creado_en`.
- La migración `prisma/migrations/20261028055454_admin_catalogo_moderacion` crea los enums `TipoReporteEnum` y `EstadoReporteEnum`, las tres tablas, sus índices y relaciones, agrega `calificacion` a `tutorias` y siembra el catálogo inicial.

---

## Tutorías Académicas

Los estudiantes pueden agendar acompañamiento con monitores de semestres avanzados, de forma virtual o presencial en el campus.

### Flujo de una tutoría

1. Un estudiante envía su **solicitud de monitor** con carrera, semestre, asignaturas, biografía y modalidad.
2. Un **administrador** revisa la solicitud y la aprueba o la rechaza en `/admin?tab=monitores`.
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
| `/admin?tab=monitores` | Revisión, aprobación y rechazo de solicitudes de monitor. |

Los enlaces a **Tutorías** están disponibles en la barra lateral de todas las pantallas autenticadas. Los monitores ven el acceso a su perfil desde la barra lateral/buscador y los administradores al panel de aprobación.

---

## Notificaciones en Tiempo Real

Cada cambio relevante del ciclo de tutorías, de las postulaciones de monitor y de la actividad del foro genera una **notificación persistente** en PostgreSQL. El usuario la recibe al instante si tiene la aplicación abierta y puede consultarla después desde la campanita.

### Experiencia de usuario

- **Campanita con contador** de avisos sin leer en la barra superior de `AppShell` (todas las pantallas autenticadas) y en la sala en vivo `/salas/[id]`.
- **Panel desplegable** con las últimas 30 notificaciones, su tipo, mensaje, fecha relativa y estado de lectura.
- **Aviso flotante (toast)** al recibir una notificación mientras la aplicación está abierta.
- **Marcado individual o masivo** como leído, con actualización inmediata del contador.
- **Enlaces de destino:** las tutorías abren `/tutorias#mis-tutorias`, las postulaciones abren `/admin?tab=monitores` o `/perfil/monitor` y los avisos del foro abren la pregunta correspondiente en `/foro/[id]`.
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
| `TUTORIA_RECORDATORIO` | Estudiante y monitor | La tutoría agendada comienza dentro de la ventana de recordatorio. |
| `SOLICITUD_MONITOR` | Administradores | Un estudiante envía o actualiza su postulación de monitor. |
| `MONITOR_APROBADO` | Solicitante | Un administrador aprueba su postulación. |
| `MONITOR_RECHAZADO` | Solicitante | Un administrador rechaza su postulación. |
| `FORO_RESPUESTA` | Autor de la pregunta | Otro usuario responde su pregunta del foro. |
| `FORO_ACEPTADA` | Autor de la respuesta | El autor de la pregunta marca su respuesta como aceptada. |

La expiración corre en cada ciclo del scheduler y también al consultar o responder tutorías. Usa un `updateMany` condicionado por estado para **no duplicar avisos** si dos procesos coinciden. La creación de notificaciones es *best-effort*: si falla el aviso, la acción principal (agendar, aceptar, cancelar, etc.) no se interrumpe.

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

El frontend mantiene una única conexión de notificaciones en el layout raíz (`NotificationsProvider`), independiente de la conexión de mensajería de una sala.

### Persistencia

- Tabla `notificaciones` con relación en cascada al usuario.
- Campos: `id`, `usuario_id`, `tipo`, `titulo` (120), `mensaje` (300), `enlace` (200), `leida` y `creada_en`.
- Índice `(usuario_id, leida, creada_en)` para el contador y el listado.
- Migración: `prisma/migrations/20261025150000_notificaciones`.

---

## Scheduler y Recordatorios

El backend inicia un ciclo de mantenimiento **en proceso** al arrancar (`backend/src/modules/tutorias/tutorias.scheduler.ts`). No requiere un servicio externo ni una dependencia adicional.

### Qué hace cada ciclo

1. **Expira solicitudes vencidas** aunque ningún usuario consulte la API. Las marca como `EXPIRADA` y avisa al estudiante.
2. **Envía recordatorios** de las tutorías `AGENDADA` que comienzan dentro de la ventana configurada (60 minutos por defecto). Genera el aviso `TUTORIA_RECORDATORIO` en la campanita y envía un correo al estudiante y al monitor.

El campo `recordatorio_enviado_en` se reclama con un `updateMany` condicionado por estado y por ese mismo campo: si hay varias instancias del backend, **solo una envía** el recordatorio. Un ciclo nunca se solapa con el anterior y las tutorías canceladas, rechazadas, expiradas o finalizadas quedan excluidas.

Si SMTP no está configurado, el correo se imprime en la consola del backend en modo desarrollo, igual que los enlaces de verificación y recuperación. Un fallo al enviar el correo no afecta la tutoría ni el aviso en la app.

### Configuración

| Variable | Valor por defecto | Descripción |
| --- | --- | --- |
| `SCHEDULER_ENABLED` | `true` | Permite desactivar el ciclo con `false`. |
| `SCHEDULER_INTERVAL_MS` | `60000` | Cada cuánto corre el ciclo, en milisegundos. |
| `RECORDATORIO_MINUTOS` | `60` | Minutos de anticipación del recordatorio (mínimo 5). |

### Migración

`prisma/migrations/20261025170000_scheduler_recordatorios` agrega el tipo `TUTORIA_RECORDATORIO`, la columna `recordatorio_enviado_en` en `tutorias` y su índice de búsqueda.

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
