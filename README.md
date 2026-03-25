 # 🚀 Nest Overlay API - Millionaire Game Engine

Este es el motor backend para el overlay de trivias inspirado en el clásico juego "¿Quién quiere ser millonario?". Proporciona una API robusta y un sistema de WebSockets para la comunicación en tiempo real entre el panel de administración y el overlay visual de OBS.

## 🛠 Stack Tecnológico

- **Framework:** [NestJS](https://nestjs.com/) (v11)
- **Lenguaje:** TypeScript
- **ORM:** [Prisma](https://www.prisma.io/)
- **Base de Datos:** PostgreSQL
- **Real-time:** Socket.io (WebSockets)
- **Auth:** Passport JWT

---

## 📂 Arquitectura de Módulos

El proyecto está organizado en módulos funcionales para mantener la escalabilidad y el orden:

### 1. 🎮 Game Module
Controla el flujo de la partida. Maneja la sesión activa, el nivel actual (el "money ladder"), la pregunta en pantalla y el estado de los comodines.
- **Responsabilidad:** Gestionar el estado de la partida y aplicar la lógica de avance de niveles.

### 2. ❓ Questions Module
CRUD completo para el banco de preguntas. Permite filtrar por niveles de dificultad y gestionar las opciones correctas.
- **Persistencia:** Las preguntas se almacenan con su nivel de dificultad y sus respectivas opciones.

### 3. 🆘 Lifelines Module
Implementa la lógica de los comodines:
- **50/50:** Elimina dos opciones incorrectas de forma aleatoria.
- **Llamada a un Amigo / Consulta al Público:** Genera data simulada o permite capturar la interacción.

### 4. 🛰 WebSocket Module (Game Gateway)
El corazón de la comunicación en tiempo real. Utiliza el namespace `/ws/game`.
- **Canales de Comunicación:**
  - `game:{sessionId}`: Para eventos específicos de una partida.
  - `overlay`: Canal público para el overlay de OBS.
  - `admin`: Canal protegido para el panel de control.

### 5. 🔐 Admin Module
Maneja la autenticación de los administradores y la gestión del sistema. Todas las rutas de la API están protegidas por JWT por defecto (excepto las marcadas como `@Public`).

---

## ⚙️ Configuración del Entorno

Debes crear un archivo `.env` basado en el `.env.example`.

| Variable | Descripción | Valor Ejemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | URI de conexión a PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `PORT` | Puerto donde corre la API | `3001` |
| `JWT_SECRET` | Clave secreta para firmar los tokens | `una-clave-muy-segura` |
| `ADMIN_EMAIL` | Email del administrador inicial | `admin@overlay.local` |
| `ADMIN_PASSWORD` | Contraseña del administrador inicial | `admin1234` |
| `CORS_ORIGIN` | Dominios permitidos (CORS) | `*` o `http://localhost:5173` |

---

## 🚀 Inicio Rápido

### 1. Instalación de dependencias
```bash
pnpm install
```

### 2. Configuración de Base de Datos (Prisma)
Asegúrate de tener un contenedor de Postgres corriendo o una base de datos accesible, luego ejecuta:
```bash
# Generar el cliente de Prisma
pnpm run prisma:generate

# Aplicar migraciones y crear esquema
pnpm run prisma:migrate:dev
```

### 3. Ejecución del proyecto
```bash
# Modo desarrollo
pnpm run start:dev

# Modo producción
pnpm run build
pnpm run start:prod
```

---

## 📡 Integración con el Front-end

### API Endpoints Base
`http://localhost:3001/api/v1`

### WebSockets
- **URL:** `ws://localhost:3001/ws/game`
- **Namespace:** `/ws/game`
- **Conexión:**
  - Para el Overlay (OBS): Conectarse enviando el query parameter `role=overlay`.
  - Para el Admin Panel: Conectarse enviando el query parameter `role=admin`.

---

## 🐳 Docker Support

El proyecto incluye un `Dockerfile` para despliegues rápidos.
```bash
docker build -t nest-overlay-api .
docker run -p 3001:3001 nest-overlay-api
```

---

## 📜 Licencia
Este proyecto es de uso privado. Todos los derechos reservados.
