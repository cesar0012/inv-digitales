# Documentación Completa de la Aplicación de Invitaciones Digitales

## Descripción General

Esta es una aplicación web para generar, editar y gestionar invitaciones digitales dinámicas mediante inteligencia artificial. Los usuarios pueden crear invitaciones personalizadas para diferentes tipos de eventos (bodas, quinceañeras, cumpleaños, comuniones, etc.), editarlas y compartirlas públicamente mediante un enlace.

## Stack Tecnológico

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **Base de datos**: SQLite (better-sqlite3)
- **Autenticación**: Propia con cookies httpOnly + integración con API Laravel externa
- **AI**: Google Gemini API y OpenAI para generación de HTML e imágenes

---

## Estructura del Proyecto

```
/
├── App.tsx                          # Componente principal con rutas React
├── index.tsx                        # Punto de entrada React
├── index.html                       # HTML base
├── vite.config.ts                   # Configuración de Vite
├── package.json                     # Dependencias (React, Express, SQLite, etc.)
├── types.ts                         # TypeScript interfaces
├── components/                      # Componentes React
│   ├── Dashboard.tsx                # Panel principal del usuario
│   ├── EditorView.tsx               # Editor de invitaciones (CORE)
│   ├── EditorSidebar.tsx            # Barra lateral del editor
│   ├── PreviewPane.tsx              # Vista previa de la invitación
│   ├── InitialView.tsx              # Vista inicial para crear invitación
│   ├── CatalogoView.tsx             # Catálogo de plantillas públicas
│   ├── AdminView.tsx                # Panel de administración
│   ├── AdminLogin.tsx               # Login de administrador
│   ├── TestLogin.tsx                # Login de prueba (desarrollo)
│   ├── SSOConsume.tsx               # Consumo de token SSO
│   ├── PrivateRoute.tsx             # Protección de rutas
│   ├── ReplaceInvitationModal.tsx  # Modal para reemplazar invitación
│   ├── ShareModal.tsx               # Modal para compartir
│   ├── InvitationPreviewModal.tsx  # Modal de previsualización
│   └── admin/                       # Componentes del panel admin
│       ├── AdminUsers.tsx           # Gestión de usuarios
│       ├── AdminHistory.tsx         # Historial de acciones
├── contexts/                        # Contextos de React
│   ├── AuthContext.tsx              # Autenticación de usuario
│   └── AdminAuthContext.tsx        # Autenticación de admin
├── services/                        # Servicios del cliente
│   ├── apiService.ts                # Llamadas a la API del servidor
│   ├── aiService.ts                # Generación AI del lado cliente
│   ├── authService.ts              # Utilidades de autenticación
│   ├── adminService.ts             # Funciones de admin
│   ├── localImageService.ts       # Imágenes locales por tipo evento
│   ├── imageService.ts            # Servicio de imágenes
│   ├── imageCompressionService.ts # Compresión de imágenes
│   ├── metadataService.ts         # Metadatos de invitaciones
│   └── nanoBananaService.ts       # Generación de imágenes AI
├── server/                         # Backend Express
│   ├── index.js                    # Servidor principal (1776 líneas)
│   ├── database.js                 # Configuración SQLite
│   ├── geminiService.js            # Integración con Gemini API
│   ├── openaiService.js            # Integración con OpenAI
│   ├── nanoBananaService.js        # Servicio de imágenes
│   └── storage/                    # Archivos de usuarios e histórico
├── img/                            # Imágenes locales por tipo de evento
│   ├── xv-años/                    # Imágenes para XV años
│   ├── primera-comunión/           # Imágenes para comunión
│   ├── cumpleaños-niño/             # Imágenes para cumpleaños niño
│   ├── cumpleaños-niña/            # Imágenes para cumpleaños niña
│   ├── boda-gay-mujeres/           # Imágenes para boda lesbianas
│   └── boda-gay-hombres/           # Imágenes para boda homosexuales
└── dist/                          # Build de producción
```

---

## Características Principales

### 1. Generación de Invitaciones con IA

- Los usuarios proporcionan un prompt describiendo el evento
- El sistema genera HTML dinámico con TailwindCSS
- Usa Google Gemini para generar código HTML completo
- Soporta imágenes generadas por IA (patrón `GEMINI_GENERATE:`)
- Procesa imágenes y las convierte a base64 antes de guardar

### 2. Editor de Invitaciones

- Vista previa en tiempo real del HTML
- Selección de elementos haciendo click en el preview
- Edición de contenido, atributos y estilos CSS
- Agregar módulos adicionales (consume 1 crédito de iteración)
- Modificar diseño existente (consume 1 crédito de iteración)
- Ocultar/mostrar módulos del diseño

### 3. Catálogo de Plantillas

- Todas las invitaciones generadas se guardan en `/historico`
- Acceso público sin autenticación
- Sistema de favoritos (starred) para destacar plantillas
- Vista previa de plantillas desde el catálogo

### 4. Sistema de Usuarios y Créditos

Cada usuario tiene en la base de datos:
- `invitations_count`: Cantidad de invitaciones guardadas
- `max_invitations`: Límite máximo de invitaciones (default: 20)
- `iteration_credits`: Créditos para iterar/editar (default: 10)
- `max_iteration_credits`: Límite de créditos de iteración (default: 10)
- `generation_credits`: Créditos para generar nuevas invitaciones (default: 3)
- `max_generation_credits`: Límite de créditos de generación (default: 3)

### 5. Autenticación

- Login local con hash SHA256
- Proxy a API Laravel externa cuando está disponible
- Tokens en cookies httpOnly (seguros)
- SSO para consumo de códigos entre dominios
- Sistema de fallback automático si Laravel no responde

### 6. Panel de Administración

- Gestión de usuarios (ver, modificar créditos)
- Ver todas las invitaciones del sistema
- Marcar/desmarcar como destacadas
- Configuración de API keys (Google Gemini, OpenAI)
- Seleccionar provider para generación de HTML e imágenes

---

## Rutas del Frontend (React Router)

| Ruta | Descripción | Requiere Auth |
|------|-------------|---------------|
| `/` | Dashboard del usuario (lista sus invitaciones) | Sí |
| `/editor` | Crear nueva invitación | Sí |
| `/editor/:filename` | Editar invitación existente | Sí |
| `/catalogo` | Catálogo de plantillas públicas | No |
| `/admin` | Panel de administración | Sí (admin) |
| `/admin-login` | Login de administrador | No |
| `/sso/consume` | Consumir token SSO | No |
| `/test` | Login de prueba (desarrollo) | No |

---

## Endpoints del Backend (Express)

### Autenticación de Usuario
- `POST /api/auth/login` - Login (proxy a Laravel o fallback local)
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/me` - Obtener usuario actual desde cookie
- `POST /api/auth/set-token` - Guardar token en cookie httpOnly
- `POST /api/auth/issue` - Emitir código SSO
- `POST /api/auth/consume-token` - Consumir código SSO

### Autenticación de Admin
- `POST /api/admin/login` - Login de administrador
- `GET /api/admin/me` - Verificar sesión de admin
- `POST /api/admin/logout` - Cerrar sesión de admin

### Imágenes
- `GET /api/images/:folder/list` - Listar imágenes de una carpeta
- `GET /api/images/:folder/random` - Obtener imagen aleatoria
- `GET /api/images/list-all` - Listar todas las carpetas con imágenes

### Invitaciones (protegidas)
- `POST /api/invitations` - Guardar invitación (nueva o reemplazar)
- `GET /api/invitations/:userId` - Listar invitaciones del usuario
- `GET /api/invitations/:userId/:filename` - Obtener contenido HTML
- `PUT /api/invitations/:userId/:filename` - Actualizar metadata
- `POST /api/user/:id/consume-credit` - Consumir crédito de iteración
- `POST /api/user/:id/consume-generation-credit` - Consumir crédito de generación

### Generación AI (protegida)
- `POST /api/generate-html` - Generar invitación completa con IA (requiere generation_credits)

### Catálogo (público)
- `GET /api/catalogo` - Listar todas las plantillas del catálogo
- `GET /api/catalogo/:filename` - Obtener HTML de una plantilla
- `GET /preview/:filename` - Vista web completa de plantilla

### Endpoints Admin (requieren auth de admin)
- `GET /api/admin/users` - Listar todos los usuarios
- `PUT /api/admin/users/:id` - Actualizar usuario (créditos)
- `GET /api/admin/invitations` - Listar todas las invitaciones
- `POST /api/admin/invitations/:userId/:filename/star` - Marcar como destacada
- `DELETE /api/admin/invitations/:userId/:filename/star` - Quitar destacar
- `DELETE /api/admin/invitations/:userId/:filename` - Eliminar invitación
- `GET /api/admin/config` - Ver configuración (sin exponer keys)
- `POST /api/admin/config` - Guardar configuración
- `POST /api/admin/sync-users` - Sincronizar usuarios desde Laravel

### Invitación Pública
- `GET /i/:slug` - Ver invitación pública por slug

---

## Tablas de Base de Datos (SQLite)

### users
```sql
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  invitations_count INTEGER DEFAULT 0,
  iteration_credits INTEGER DEFAULT 10,
  max_invitations INTEGER DEFAULT 20,
  max_iteration_credits INTEGER DEFAULT 10,
  generation_credits INTEGER DEFAULT 3,
  max_generation_credits INTEGER DEFAULT 3,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### invitations
```sql
CREATE TABLE invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  filename TEXT,
  slug TEXT UNIQUE,
  event_type TEXT,
  event_domain TEXT,
  event_date TEXT,
  event_time TEXT,
  starred INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### catalogo
```sql
CREATE TABLE catalogo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT,
  title TEXT,
  event_type TEXT,
  theme TEXT,
  colors TEXT,
  tags TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  starred INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### local_users
```sql
CREATE TABLE local_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  name TEXT,
  role_name TEXT DEFAULT 'user'
);
```

### admins
```sql
CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password_hash TEXT,
  name TEXT
);
```

### admin_sessions
```sql
CREATE TABLE admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  token TEXT,
  expires_at DATETIME
);
```

### admin_config
```sql
CREATE TABLE admin_config (
  id INTEGER PRIMARY KEY,
  html_provider TEXT DEFAULT 'openai',
  html_base_url TEXT,
  html_api_key TEXT,
  html_model TEXT DEFAULT 'gpt-4o',
  html_google_api_key TEXT,
  html_google_model TEXT DEFAULT 'gemini-3.1-flash-preview',
  image_provider TEXT DEFAULT 'gemini',
  image_model TEXT,
  image_api_key TEXT,
  login_page_url TEXT DEFAULT '/admin-login',
  updated_at DATETIME
);
```

### local_sso_codes
```sql
CREATE TABLE local_sso_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  code_hash TEXT,
  purpose TEXT,
  expires_at DATETIME,
  used_at DATETIME
);
```

---

## Errores Comunes y Cómo Reconocerlos

### Errores de Autenticación (Código de error en respuesta JSON)

| Código | Mensaje | Causa | Solución |
|--------|---------|-------|----------|
| `NO_TOKEN` | "No autenticado" | No hay token en cookies ni Authorization header | Verificar que la cookie `auth_token` esté presente |
| `INVALID_TOKEN` | "Token inválido o expirado" | Token existe pero no válido o no está en DB | Puede usuario eliminado, re-login necesario |
| - | "Token requerido" | Endpoint requiere auth pero no se envió | Incluir header Authorization: Bearer token |

**Notas**: 
- El servidor hace fallback automático a BD local si Laravel no responde
- Los tokens locales tienen formato `id|hashSHA256`
- Las sesiones de admin duran 24 horas

### Errores de Créditos

| Código HTTP | Mensaje | Causa | Solución |
|-------------|---------|-------|----------|
| 400 | "No tienes créditos de iteración disponibles" | `iteration_credits <= 0` | Admin debe aumentar créditos |
| 400 | "No tienes créditos de generación disponibles" | `generation_credits < 1` | Admin debe aumentar créditos |
| 409 | "Has alcanzado el límite de invitaciones almacenadas" | `invitations_count >= max_invitations` | Código: `LIMIT_REACHED`, eliminar o reemplazar invitación |

**Verificación en código** (server/index.js):
```javascript
// Línea 760-762
if (user.iteration_credits <= 0) {
  return res.status(400).json({ error: 'No tienes créditos de iteración disponibles' });
}

// Línea 816-823
if (currentCount >= maxInvitations && !replaceFilename) {
  return res.status(409).json({ 
    error: 'Has alcanzado el límite de invitaciones almacenadas',
    code: 'LIMIT_REACHED',
    max_invitations: maxInvitations,
    invitations
  });
}
```

### Errores de Generación AI

| Mensaje | Causa | Solución |
|---------|-------|----------|
| "Configuración no encontrada" | No existe registro en `admin_config` | Insertar configuración inicial |
| "No hay API key de Google configurada" | `html_google_api_key` vacía en DB | Configurar en panel admin |
| "No hay API key de imagen configurada" | `image_api_key` vacía | Configurar en panel admin |
| Error en `processGeminiImages` | API key de imágenes inválida o quota agotada | Verificar en Google AI Studio |

**Verificación en código** (server/index.js):
```javascript
// Línea 1697-1718
if (config.html_google_api_key) {
  // Usar Gemini
} else {
  // Error: No hay API key de Google configurada
}

// Línea 1722-1727
if (config.image_api_key && config.image_api_key.trim() !== '') {
  htmlResult = await processGeminiImages(...);
} else {
  console.log('=== NO HAY API KEY DE IMAGEN CONFIGURADA - OMITIENDO IMÁGENES ===');
}
```

**Nota importante**: El sistema fuerza el uso de Gemini para HTML (`// Línea 1696: Siempre usar Gemini (forzado)`), la opción de OpenAI fue desactivada.

### Errores de Archivos

| Código HTTP | Mensaje | Causa | Solución |
|-------------|---------|-------|----------|
| 404 | "Archivo no encontrado" | No existe el HTML en `storage/users/:userId/:filename` | Verificar que el archivo exista fs |
| 404 | "Invitación no encontrada" (en `/i/:slug`) | El slug no existe en tabla `invitations` | La invitación fue eliminada de DB |
| 404 | "Carpeta no encontrada" | No existe carpeta de imágenes en `/img/:folder` | Verificar carpeta en sistema de archivos |

**Verificación de paths** (server/index.js):
```javascript
// storagePath = join(__dirname, 'storage', 'users')
// Las invitaciones se guardan como: storage/users/{user_id}/invitation_{timestamp}.html
// Las públicas se acceden via: /i/{slug}

// histórico: server/storage/historico/invitacion_{timestamp}.html
```

### Errores de Proxy a Laravel

| Mensaje en logs | Significado | Comportamiento |
|-----------------|-------------|----------------|
| "⚠️ Laravel no disponible para validateToken" | API Laravel no responde | Usa fallback local |
| "⚠️ Laravel no disponible, usando user local..." | GET /user falló | Usa validación local |
| "⚠️ Error conectando a Laravel: [mensaje]" | Error de red/timeout | Usa fallback local |

**Nota**: El servidor usa `fetchNoSSL` con `rejectUnauthorized: false` para permitir certificados autofirmados en desarrollo.

### Errores de Admin

| Mensaje | Causa | Solución |
|---------|-------|----------|
| "No autenticado" | Token no está en tabla `admin_sessions` | Hacer login de nuevo |
| "Token inválido o expirado" | Sesión admin expiró (24h) | Login de nuevo |
| "Credenciales inválidas" | Email/password no coinciden | Verificar credenciales en tabla `admins` |

**Verificar sesión de admin** (server/index.js línea 1142-1151):
```javascript
const stmt = db.prepare('SELECT admin_id FROM admin_sessions WHERE token = ? AND expires_at > ?');
const session = stmt.get(token, new Date().toISOString());
if (!session) {
  return res.status(401).json({ error: 'Token inválido o expirado' });
}
```

### Errores de Propiedades Inválidas

| Error | Causa | Solución |
|-------|-------|----------|
| "No autorizado para modificar esta invitación" | `req.user.id !== userId` en endpoint | Usuario intenta acceder a invitación de otro |
| "No autorizado para ver estas invitaciones" | Mismo caso | Verificar ownership |
| "No hay campos para actualizar" | PUT sin campos válidos | Enviar al menos un campo |

---

## Flags de Feature

- **AI Iterations**: En `components/EditorSidebar.tsx` hay un feature flag condicional para mostrar/ocultar opciones de "Agregar Módulo" y "Modificar Diseño" basadas en la prop `onAddModule`. Estas funcionalidades consumen créditos de iteración.

---

## Variables de Entorno

```env
VITE_PUBLIC_URL=http://localhost:3001          # URL pública de la app
VITE_API_BASE_URL=https://api.invitacionesmodernas.com/api  # API Laravel externa
NODE_ENV=production                              # 'production' o 'development'
```

---

## Scripts Disponibles

```json
{
  "dev": "concurrently \"vite\" \"node server/index.js\"",
  "dev:client": "vite",
  "dev:server": "node server/index.js",
  "build": "vite build",
  "start": "NODE_ENV=production node server/index.js",
  "preview": "vite preview"
}
```

---

## Puertos y URLs

- **Backend Express**: Puerto 3001
- **Frontend Vite**: Puerto 3002 (desarrollo)
- **Invitaciones públicas**: `http://localhost:3001/i/{slug}`
- **Catálogo público**: `http://localhost:3001/preview/{filename}`
- **Logs**: `server/debug.log`

---

## Credenciales de Prueba

### Usuario de prueba
- Email: `test@test.com`
- Password: `test123`

### Admin
- Email: `test@test.com`
- Password: `test123`

(Estas credenciales están hasheadas con SHA256 en la tabla `local_users` y `admins`)

---

## Cómo Diagnosticar Problemas

### 1. Verificar que el servidor esté corriendo
```bash
curl http://localhost:3001/api/images/list-all
```

### 2. Ver logs del servidor
```bash
type server\debug.log
```

### 3. Verificar la base de datos
```bash
# En sqlite3
sqlite3 server/database.db ".schema"
sqlite3 server/database.db "SELECT * FROM users;"
sqlite3 server/database.db "SELECT * FROM admin_config;"
```

### 4. Verificar archivos físicos
```bash
# Ver invitaciones de un usuario
dir server\storage\users\{user_id}
```

### 5. Probar endpoint de autenticación
```bash
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"test123\"}"
```

---

## Notas de Desarrollo Importantes

1. El servidor Express corre en puerto 3001
2. El cliente Vite corre en puerto 3002 por defecto
3. Los logs se escriben en `server/debug.log`
4. Las invitaciones públicas se acceden vía `/i/:slug`
5. El catálogo público está en `/preview/:filename`
6. La sincronización de histórico con DB ocurre en cada request a `/api/catalogo`
7. El sistema fuerza el uso de Google Gemini para generación de HTML
8. Las imágenes con patrón `GEMINI_GENERATE:` son procesadas por el servidor antes de guardar
9. El fallback a Laravel es automático si la API externa no responde
10. Las API keys NO se exponen al frontend (solo valores vacíos en respuestas)