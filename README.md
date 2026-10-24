# Campus Collaborative Study — Universidad Tecnológica de Bolívar (UTB)

Plataforma colaborativa web (responsive desde 360px) para estudiantes de primeros semestres (Cálculo, Física, Álgebra, Estadística) que permite:
1. **Unirse a salas de estudio simultáneo** y resolver ejercicios en conjunto con chat en tiempo real (< 2s) y control de cupo máximo (10 participantes).
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
- **Backend (API Gateway):** Next.js Route Handlers unificando tres servicios limpios:
  - **Servicio de Salas** (`/api/salas`)
  - **Servicio de Tutorías** (`/api/tutorias`)
  - **Servicio de Recursos** (`/api/recursos`)
- **Base de Datos & Auth:** Supabase PostgreSQL + Prisma ORM + JWT con Bcrypt.
- **Tiempo Real:** Supabase Realtime (WebSockets) para chat en vivo y sincronización < 2s.

---

## Requisitos Previos

- Node.js >= 18.x
- npm >= 9.x o pnpm >= 8.x
- Cuenta en Supabase o PostgreSQL local (Docker)

---

## Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/Studyroom-klv.git
   cd Studyroom-klv
   ```

2. **Configurar variables de entorno:**
   Copia el archivo `.env.example` a `.env` en la raíz (y en frontend/backend si aplica) y ajusta los valores de conexión:
   ```bash
   cp .env.example .env
   ```

3. **Instalar dependencias:**
   ```bash
   npm install
   ```

4. **Configurar la base de datos (Prisma):**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npm run db:seed
   ```

---

## Ejecución

### Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### Producción
```bash
npm run build
npm start
```

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
