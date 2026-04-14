# Sistema de Autenticación SSO - Invitaciones Digitales

## 🔐 Arquitectura de Autenticación

Este sistema implementa autenticación SSO (Single Sign-On) entre dos dominios:

1. **Dashboard Principal (Laravel)** - Sistema de administración donde los usuarios se registran e inician sesión
2. **Editor de Invitaciones (React)** - Esta aplicación donde los usuarios crean sus invitaciones digitales

---

## 📊 Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD PRINCIPAL (Laravel)                             │
│                                                                                  │
│  1. Usuario inicia sesión con email/password                                     │
│     POST /api/login → { token, user }                                           │
│                                                                                  │
│  2. Usuario hace clic en "Abrir Editor de Invitaciones"                         │
│                                                                                  │
│  3. Dashboard genera código SSO de un solo uso                                   │
│     POST /api/issue (Bearer token) → { code, expires_in: 60 }                  │
│                                                                                  │
│  4. Dashboard redirige al Editor                                                 │
│     https://editor.tudominio.com/sso/consume?code=xxx                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        EDITOR DE INVITACIONES (React)                            │
│                                                                                  │
│  5. Editor recibe el código en la URL                                            │
│     /sso/consume?code=xxx                                                       │
│                                                                                  │
│  6. Editor intercambia el código por un token                                    │
│     POST /api/consume-token { code } → { token, user }                         │
│                                                                                  │
│  7. Editor guarda el token en cookie httpOnly                                    │
│     POST /api/auth/set-token { token } → cookie: auth_token                    │
│                                                                                  │
│  8. Usuario es redirigido al Dashboard del Editor                               │
│     /                                                                            │
│                                                                                  │
│  9. Todos los requests posteriores usan la cookie automáticamente               │
│     fetch('/api/invitations', { credentials: 'include' })                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        VALIDACIÓN EN EL BACKEND                                  │
│                                                                                  │
│  10. Cada request al backend valida el token                                     │
│      authMiddleware → validateToken(token) → GET /api/user                     │
│                                                                                  │
│  11. Si el token es válido → continúa la solicitud                               │
│      Si el token es inválido → 401 → redirigir a login                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Archivos del Sistema

### Frontend (React)

| Archivo | Descripción |
|---------|-------------|
| `services/authService.ts` | Funciones de autenticación: login, consumeToken, issueCode, etc. |
| `contexts/AuthContext.tsx` | Context de React para manejar estado de autenticación |
| `components/SSOConsume.tsx` | Página que consume el código SSO de la URL |
| `components/TestLogin.tsx` | Página de prueba para login directo (solo desarrollo) |
| `components/PrivateRoute.tsx` | Componente que protege rutas que requieren autenticación |
| `components/Dashboard.tsx` | Panel principal (actualizado para usar usuario autenticado) |
| `services/apiService.ts` | Servicios de API (actualizado para usar cookies) |
| `App.tsx` | Rutas de la aplicación (actualizado con AuthProvider) |

### Backend (Express)

| Archivo | Descripción |
|---------|-------------|
| `server/index.js` | Servidor Express con middleware de autenticación |

### Configuración

| Archivo | Descripción |
|---------|-------------|
| `.env.local` | Variables de entorno con URLs de la API principal |
| `vite-env.d.ts` | Tipos de TypeScript para variables de entorno |

---

## 🔧 Configuración

### Variables de Entorno (.env.local)

```env
# API Principal (Dashboard Laravel)
VITE_API_BASE_URL=http://mgo04coc00044soosok84ggc.217.216.43.10.sslip.io/api
VITE_DASHBOARD_URL=http://mgo04coc00044soosok84ggc.217.216.43.10.sslip.io

# Modo desarrollo (permite página /test)
VITE_DEV_MODE=true
```

---

## 🚀 Endpoints de Autenticación

### API Principal (Laravel)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/login` | POST | Iniciar sesión con email/password |
| `/issue` | POST | Generar código SSO (requiere Bearer token) |
| `/consume-token` | POST | Intercambiar código por token |
| `/user` | GET | Obtener usuario autenticado |
| `/logout` | POST | Cerrar sesión |

### Backend del Editor (Express)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/set-token` | POST | Guardar token en cookie httpOnly |
| `/api/auth/logout` | POST | Eliminar cookie de autenticación |
| `/api/auth/me` | GET | Obtener usuario actual desde cookie |

---

## 🔒 Seguridad

### Por qué usar códigos SSO en lugar de tokens directos?

El token de acceso real **nunca** viaja en la URL porque:

1. **Historial del navegador** - Las URLs se guardan en el historial
2. **Logs de servidores** - Los servidores proxy registran las URLs
3. **Analytics** - Herramientas como Google Analytics capturan URLs
4. **Referers** - La URL puede ser expuesta en headers Referer

### Características de seguridad del código SSO:

- **Un solo uso** - El código se marca como usado inmediatamente
- **Vida corta** - Expira en 60 segundos (configurable entre 15-300s)
- **Hash en BD** - Solo se guarda el hash SHA-256, no el código plano
- **Transacción atómica** - Evita condiciones de carrera

### Almacenamiento del token:

- **Cookie httpOnly** - No accesible desde JavaScript (protección contra XSS)
- **Secure flag** - Solo se envía por HTTPS en producción
- **SameSite=lax** - Protección contra CSRF

---

## 📱 Rutas de la Aplicación

| Ruta | Componente | Protegida | Descripción |
|------|------------|-----------|-------------|
| `/` | Dashboard | ✅ Sí | Panel principal con invitaciones |
| `/editor` | EditorView | ✅ Sí | Editor para crear invitaciones |
| `/editor/:filename` | EditorView | ✅ Sí | Editor para editar invitación existente |
| `/sso/consume` | SSOConsume | ❌ No | Consume código SSO de la URL |
| `/test` | TestLogin | ❌ No* | Página de prueba (solo desarrollo) |

*La página `/test` solo está disponible cuando `VITE_DEV_MODE=true`

---

## 🧪 Pruebas en Desarrollo

### 1. Acceder a la página de prueba

```
http://localhost:3002/test
```

### 2. Iniciar sesión

Las credenciales de prueba están precargadas:
- Email: `arj1931126@gmail.com`
- Password: `Jar123456`

### 3. Generar código SSO

Después de iniciar sesión, haz clic en "Generar código SSO de prueba"

### 4. Probar consumo del código

Haz clic en "Probar consumo de código SSO" para simular el flujo completo

---

## ⚠️ Instalación de Dependencias

El backend requiere el paquete `cookie-parser`:

```bash
cd server
npm install cookie-parser
```

---

## 🔄 Flujo de Request Protegido

```javascript
// Frontend - Todas las peticiones incluyen credentials: 'include'
const response = await fetch('/api/invitations', {
  credentials: 'include' // Envía cookies automáticamente
});

// Backend - Middleware valida el token
app.get('/api/invitations', authMiddleware, (req, res) => {
  // req.user contiene los datos del usuario validado
  // req.token contiene el token de la cookie
});
```

---

## 🚨 Manejo de Errores

### Token expirado o inválido

```javascript
// El backend responde con 401
{ error: "Token inválido o expirado", code: "INVALID_TOKEN" }

// El frontend detecta el error y redirige
if (error.code === 'INVALID_TOKEN') {
  window.location.href = '/test'; // En producción: redirect al dashboard
}
```

### Código SSO expirado

```javascript
// El backend responde con 401
{ message: "Código inválido o expirado" }

// El frontend muestra error en SSOConsume
<p>Error al procesar código SSO</p>
```

---

## 📝 Notas Importantes

1. **En producción**: La página `/test` debe estar deshabilitada (`VITE_DEV_MODE=false`)

2. **Redirección en producción**: Cambiar `/test` por la URL del Dashboard principal:
   ```javascript
   // authService.ts
   window.location.href = `${getDashboardUrl()}/login`;
   ```

3. **CORS**: El backend ya está configurado para permitir cookies:
   ```javascript
   cors({ origin: [...], credentials: true })
   ```

4. **Usuarios nuevos**: El backend crea automáticamente usuarios en la base de datos local si no existen:
   ```javascript
   ensureUserInDB(user) // Crea usuario con user.id como user_id
   ```

---

## 🎯 Próximos Pasos

1. ✅ Sistema SSO implementado
2. ✅ Middleware de autenticación en backend
3. ✅ Context de autenticación en frontend
4. ✅ Rutas protegidas
5. ✅ Página de prueba para desarrollo

---

**Última actualización:** Abril 2026
