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
- **Backend (API REST):** Node.js + Express + Prisma ORM. La autenticación está implementada en `/api/auth` y las salas de estudio en `/api/salas`; Tutorías y Recursos se montarán sobre la misma API.
- **Base de Datos:** PostgreSQL (Supabase o local) + Prisma ORM.
- **Autenticación:** JWT con expiración de 8 h + bcryptjs. Verificación de correo con token de 24 h y recuperación de contraseña con token de 1 h.
- **Correo:** Nodemailer vía SMTP. Si no hay SMTP configurado, los enlaces se imprimen en la consola del backend para desarrollo.
- **Tiempo Real:** Socket.IO sobre el mismo servidor HTTP de Express. El chat usa el JWT de la API, valida la participación en la sala y persiste los mensajes en PostgreSQL.

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

### Pantallas de salas (frontend)

| Ruta | Descripción |
| --- | --- |
| `/salas` | Listado real desde la API, búsqueda, filtros por asignatura/estado, creación de salas y acceso a cada sala. |
| `/salas/[id]` | Detalle real de la sala, anfitrión, participantes, cronómetro y acciones de unirse/abandonar. Incluye chat en tiempo real con historial y presencia. Los materiales siguen pendientes. |

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
