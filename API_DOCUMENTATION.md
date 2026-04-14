# API de Invitaciones Digitales

Documentación completa de la API REST para el sistema de Invitaciones Digitales.

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Autenticación](#autenticación)
3. [Endpoints Públicos](#endpoints-públicos)
4. [Endpoints de Usuarios](#endpoints-de-usuarios)
5. [Endpoints de Invitaciones](#endpoints-de-invitaciones)
6. [Modelos de Datos](#modelos-de-datos)
7. [Ejemplos de Integración](#ejemplos-de-integración)

---

## 📌 Introducción

### Información General

| Campo | Valor |
|-------|-------|
| **Base URL (localhost)** | `http://localhost:3001` |
| **Base URL (Stage)** | *Pendiente de asignar* |
| **Formato de respuesta** | JSON |
| **Content-Type** | `application/json` |
| **Encoding** | UTF-8 |
| **Versión** | 1.0.0 |

### Códigos de Estado HTTP

| Código | Estado | Descripción |
|--------|--------|-------------|
| `200` | OK | Solicitud procesada exitosamente |
| `201` | Created | Recurso creado exitosamente |
| `400` | Bad Request | Parámetros inválidos o faltantes |
| `404` | Not Found | Recurso no encontrado |
| `500` | Internal Server Error | Error interno del servidor |

### Formato de Respuesta Estándar

#### Respuesta Exitosa

```json
{
  "success": true,
  "data": { ... }
}
```

#### Respuesta de Error

```json
{
  "error": "Mensaje descriptivo del error"
}
```

---

## 🔐 Autenticación

### Descripción General

Todos los endpoints protegidos requieren autenticación mediante **Bearer Token** obtenido del sistema principal de la Landing Page (Laravel).

### Header de Autenticación

```http
Authorization: Bearer {token}
```

### Alternativa: Cookie

```http
Cookie: auth_token={token}
```

### Validación del Token

El token se valida en cada request contra la API principal de la Landing Page:

```
GET http://mgo04coc00044soosok84ggc.217.216.43.10.sslip.io/api/user
Authorization: Bearer {token}
```

**Respuesta exitosa (Token válido):**
```json
{
  "id": 2,
  "name": "Usuario Ejemplo",
  "email": "usuario@ejemplo.com",
  "role_name": "user"
}
```

**Respuesta de error (Token inválido):**
```json
{
  "error": "No autenticado",
  "code": "NO_TOKEN"
}
```

```json
{
  "error": "Token inválido o expirado",
  "code": "INVALID_TOKEN"
}
```

### Códigos de Error de Autenticación

| Código HTTP | Error Code | Descripción |
|-------------|------------|-------------|
| `401` | `NO_TOKEN` | Token no proporcionado |
| `401` | `INVALID_TOKEN` | Token inválido o expirado |
| `403` | `UNAUTHORIZED` | No autorizado para este recurso |

### Endpoints Protegidos vs Públicos

| Endpoint | Protegido | Requiere Token |
|----------|-----------|----------------|
| `GET /i/:slug` | ❌ No | No (público) |
| `GET /api/users` | ✅ Sí | Sí |
| `GET /api/user/:id` | ✅ Sí | Sí |
| `POST /api/user/:id/consume-credit` | ✅ Sí | Sí |
| `POST /api/invitations` | ✅ Sí | Sí |
| `GET /api/invitations/:userId` | ✅ Sí | Sí (verifica propiedad) |
| `GET /api/invitations/:userId/:filename` | ✅ Sí | Sí (verifica propiedad) |

### Verificación de Propiedad

Algunos endpoints verifican que el `userId` en la URL coincida con el ID del usuario autenticado:

```javascript
// Ejemplo de verificación en el servidor
if (req.user.id.toString() !== userId) {
  return res.status(403).json({ error: 'No autorizado para ver este recurso' });
}
```

### Ejemplo de Request con Token

#### JavaScript (Fetch)

```javascript
const TOKEN = 'tu_token_de_la_landing_page';
const API_BASE = 'http://localhost:3001';

fetch(`${API_BASE}/api/user/2`, {
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept': 'application/json'
  }
})
  .then(response => response.json())
  .then(data => console.log(data));
```

#### Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept': 'application/json'
  }
});

const { data } = await api.get('/api/user/2');
```

#### cURL

```bash
curl -X GET "http://localhost:3001/api/user/2" \
  -H "Authorization: Bearer tu_token_aqui" \
  -H "Accept: application/json"
```

---

## 🌐 Endpoints Públicos

Los endpoints públicos no requieren autenticación y pueden ser accedidos por cualquier persona con el enlace.

---

### GET /i/:slug

Sirve el contenido HTML de una invitación pública mediante su slug único.

#### 📥 Request

**Método:** `GET`

**URL:** `/i/:slug`

**Content-Type:** `text/html`

#### Parámetros

| Nombre | Ubicación | Tipo | Requerido | Descripción |
|--------|-----------|------|-----------|-------------|
| `slug` | Path | String | ✅ Sí | Identificador único de la invitación (ej: `boda-k2m3`) |

#### 📤 Response

##### Status: `200 OK`

Devuelve el contenido HTML completo de la invitación.

**Headers:**

```
Content-Type: text/html; charset=utf-8
```

**Body:** Documento HTML completo

##### Status: `404 Not Found`

Devuelve una página HTML con mensaje de error.

```html
<!DOCTYPE html>
<html>
<head><title>Invitación no encontrada</title></head>
<body>
  <h1>Invitación no encontrada</h1>
  <p>Esta invitación no existe o ha sido eliminada.</p>
</body>
</html>
```

#### 💻 Ejemplos de Código

##### JavaScript (Fetch)

```javascript
const slug = 'boda-k2m3';

fetch(`http://localhost:3001/i/${slug}`)
  .then(response => response.text())
  .then(html => {
    document.body.innerHTML = html;
  })
  .catch(error => console.error('Error:', error));
```

##### cURL

```bash
curl -X GET "http://localhost:3001/i/boda-k2m3" \
  -H "Accept: text/html"
```

##### Python (requests)

```python
import requests

slug = 'boda-k2m3'
response = requests.get(f'http://localhost:3001/i/{slug}')

if response.status_code == 200:
    html_content = response.text
    print(f"HTML recibido: {len(html_content)} bytes")
else:
    print(f"Error: {response.status_code}")
```

---

## 👤 Endpoints de Usuarios

Endpoints para gestionar información de usuarios y sus créditos.

---

### GET /api/users

Obtiene la lista completa de todos los usuarios registrados junto con sus invitaciones.

#### 🔐 Autenticación Requerida

Este endpoint requiere autenticación con Bearer Token.

```http
Authorization: Bearer {token}
```

#### 📥 Request

**Método:** `GET`

**URL:** `/api/users`

**Content-Type:** `application/json`

#### Parámetros

| Nombre | Ubicación | Tipo | Requerido | Descripción |
|--------|-----------|------|-----------|-------------|
| - | - | - | - | Este endpoint no recibe parámetros |

#### 📤 Response

##### Status: `200 OK`

```json
{
  "users": [
    {
      "user_id": "test_user_001",
      "invitations_count": 2,
      "iteration_credits": 7,
      "invitations_remaining": 1,
      "max_invitations": 3,
      "max_iteration_credits": 10,
      "created_at": "2026-04-02T08:30:00.000Z",
      "invitations": [
        {
          "filename": "invitation_1743612345678.html",
          "slug": "boda-k2m3",
          "publicUrl": "http://localhost:3001/i/boda-k2m3",
          "event_type": "Boda",
          "created_at": "2026-04-02T09:00:00.000Z",
          "size": 125000
        },
        {
          "filename": "invitation_1743611111111.html",
          "slug": "xv-aos-x7y9",
          "publicUrl": "http://localhost:3001/i/xv-aos-x7y9",
          "event_type": "XV Años",
          "created_at": "2026-04-01T15:30:00.000Z",
          "size": 98000
        }
      ]
    }
  ],
  "total": 1
}
```

#### Campos de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `users` | Array[User] | Lista de usuarios con sus invitaciones |
| `total` | Number | Total de usuarios registrados |

#### Estructura del Objeto User

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user_id` | String | Identificador único del usuario |
| `invitations_count` | Number | Número de invitaciones creadas |
| `iteration_credits` | Number | Créditos de iteración disponibles |
| `invitations_remaining` | Number | Invitaciones restantes que puede crear (máximo - creadas) |
| `max_invitations` | Number | Límite máximo de invitaciones permitidas (siempre 3) |
| `max_iteration_credits` | Number | Límite máximo de créditos de iteración (siempre 10) |
| `created_at` | String | Fecha de creación en formato ISO 8601 |
| `invitations` | Array[Invitation] | Lista de invitaciones del usuario |

#### 💻 Ejemplos de Código

##### JavaScript (Fetch)

```javascript
const TOKEN = 'tu_token_de_la_landing_page';

fetch('http://localhost:3001/api/users', {
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Accept': 'application/json'
  }
})
  .then(response => {
    if (!response.ok) throw new Error('Error al obtener usuarios');
    return response.json();
  })
  .then(data => {
    console.log(`Total usuarios: ${data.total}`);
    data.users.forEach(user => {
      console.log(`Usuario: ${user.user_id}`);
      console.log(`Invitaciones: ${user.invitations_count}/${user.max_invitations}`);
      console.log(`Créditos: ${user.iteration_credits}`);
    });
  })
  .catch(error => console.error(error));
```

##### cURL

```bash
curl -X GET "http://localhost:3001/api/users" \
  -H "Authorization: Bearer tu_token_aqui" \
  -H "Accept: application/json"
```

##### Python (requests)

```python
import requests

TOKEN = 'tu_token_de_la_landing_page'

response = requests.get(
    'http://localhost:3001/api/users',
    headers={'Authorization': f'Bearer {TOKEN}'}
)

if response.status_code == 200:
    data = response.json()
    print(f"Total usuarios: {data['total']}")
    
    for user in data['users']:
        print(f"Usuario: {user['user_id']}")
        print(f"Invitaciones: {user['invitations_count']}/{user['max_invitations']}")
        print(f"Créditos restantes: {user['iteration_credits']}")
else:
    print(f"Error: {response.status_code}")
```

---

### GET /api/user/:id

Obtiene los datos de un usuario específico junto con todas sus invitaciones.

**Este es el endpoint principal para que la Landing Page obtenga los datos del usuario.**

#### 🔐 Autenticación Requerida

Este endpoint requiere autenticación con Bearer Token.

```http
Authorization: Bearer {token}
```

#### 📥 Request

**Método:** `GET`

**URL:** `/api/user/:id`

**Content-Type:** `application/json`

#### Parámetros

| Nombre | Ubicación | Tipo | Requerido | Descripción |
|--------|-----------|------|-----------|-------------|
| `id` | Path | String | ✅ Sí | ID único del usuario |

#### 📤 Response

##### Status: `200 OK`

```json
{
  "user_id": "test_user_001",
  "invitations_count": 2,
  "iteration_credits": 7,
  "invitations_remaining": 1,
  "max_invitations": 3,
  "max_iteration_credits": 10,
  "created_at": "2026-04-02T08:30:00.000Z",
  "invitations": [
    {
      "filename": "invitation_1743612345678.html",
      "slug": "boda-k2m3",
      "publicUrl": "http://localhost:3001/i/boda-k2m3",
      "event_type": "Boda",
      "created_at": "2026-04-02T09:00:00.000Z",
      "size": 125000
    }
  ]
}
```

#### Campos de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user_id` | String | Identificador único del usuario |
| `invitations_count` | Number | Número de invitaciones creadas |
| `iteration_credits` | Number | Créditos de iteración disponibles |
| `invitations_remaining` | Number | Invitaciones restantes que puede crear |
| `max_invitations` | Number | Límite máximo de invitaciones (3) |
| `max_iteration_credits` | Number | Límite máximo de créditos (10) |
| `created_at` | String | Fecha de creación en formato ISO 8601 |
| `invitations` | Array[Invitation] | Lista de invitaciones del usuario |

##### Status: `404 Not Found`

```json
{
  "error": "Usuario no encontrado"
}
```

#### 💻 Ejemplos de Código

##### JavaScript (Fetch)

```javascript
const userId = 'test_user_001';

fetch(`http://localhost:3001/api/user/${userId}`)
  .then(response => {
    if (!response.ok) throw new Error('Error al obtener usuario');
    return response.json();
  })
  .then(user => {
    console.log(`Usuario: ${user.user_id}`);
    console.log(`Invitaciones: ${user.invitations_count}`);
    console.log(`Créditos: ${user.iteration_credits}`);
    console.log(`Invitaciones restantes: ${user.invitations_remaining}`);
    
    user.invitations.forEach(inv => {
      console.log(`- ${inv.event_type}: ${inv.publicUrl}`);
    });
  })
  .catch(error => console.error(error));
```

##### cURL

```bash
curl -X GET "http://localhost:3001/api/user/test_user_001" \
  -H "Content-Type: application/json"
```

##### Python (requests)

```python
import requests

user_id = 'test_user_001'
response = requests.get(f'http://localhost:3001/api/user/{user_id}')

if response.status_code == 200:
    user = response.json()
    print(f"Usuario: {user['user_id']}")
    print(f"Invitaciones creadas: {user['invitations_count']}")
    print(f"Créditos restantes: {user['iteration_credits']}")
    
    for inv in user['invitations']:
        print(f"- {inv['event_type']}: {inv['publicUrl']}")
else:
    print(f"Error: {response.status_code} - {response.text}")
```

---

### POST /api/user/:id/consume-credit

Consume un crédito de iteración del usuario. Cada llamada resta 1 crédito.

#### 📥 Request

**Método:** `POST`

**URL:** `/api/user/:id/consume-credit`

**Content-Type:** `application/json`

#### Parámetros

| Nombre | Ubicación | Tipo | Requerido | Descripción |
|--------|-----------|------|-----------|-------------|
| `id` | Path | String | ✅ Sí | ID único del usuario |

#### Request Body

Este endpoint no requiere body.

#### 📤 Response

##### Status: `200 OK`

```json
{
  "success": true,
  "iteration_credits": 6
}
```

#### Campos de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | Boolean | Indica si la operación fue exitosa |
| `iteration_credits` | Number | Créditos restantes después del consumo |

##### Status: `400 Bad Request`

```json
{
  "error": "No tienes créditos de iteración disponibles"
}
```

##### Status: `404 Not Found`

```json
{
  "error": "Usuario no encontrado"
}
```

#### 💻 Ejemplos de Código

##### JavaScript (Fetch)

```javascript
const userId = 'test_user_001';

fetch(`http://localhost:3001/api/user/${userId}/consume-credit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log(`Crédito consumido. Restantes: ${data.iteration_credits}`);
    }
  })
  .catch(error => console.error(error));
```

##### cURL

```bash
curl -X POST "http://localhost:3001/api/user/test_user_001/consume-credit" \
  -H "Content-Type: application/json"
```

##### Python (requests)

```python
import requests

user_id = 'test_user_001'
response = requests.post(
    f'http://localhost:3001/api/user/{user_id}/consume-credit',
    headers={'Content-Type': 'application/json'}
)

if response.status_code == 200:
    data = response.json()
    print(f"Crédito consumido. Restantes: {data['iteration_credits']}")
else:
    error = response.json()
    print(f"Error: {error.get('error', 'Unknown error')}")
```

---

## 💌 Endpoints de Invitaciones

Endpoints para crear, listar y obtener invitaciones.

---

### POST /api/invitations

Crea una nueva invitación y la guarda en el sistema.

#### 📥 Request

**Método:** `POST`

**URL:** `/api/invitations`

**Content-Type:** `application/json`

#### Parámetros

Este endpoint no recibe parámetros en la URL.

#### Request Body

```json
{
  "userId": "test_user_001",
  "htmlContent": "<!DOCTYPE html><html>...</html>",
  "eventType": "Boda"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `userId` | String | ✅ Sí | ID del usuario que crea la invitación |
| `htmlContent` | String | ✅ Sí | Contenido HTML completo de la invitación |
| `eventType` | String | ❌ No | Tipo de evento (Boda, XV Años, etc.). Se usa para generar el slug |

**Tipos de evento disponibles:**

| Valor | Slug generado (ejemplo) |
|-------|-------------------------|
| `Boda` | `boda-k2m3` |
| `XV Años` | `xv-aos-x7y9` |
| `Bautizo` | `bautizo-m4n2` |
| `Cumpleaños` | `cumpleanos-p5q8` |
| `Baby Shower` | `baby-shower-r3t6` |

#### 📤 Response

##### Status: `200 OK`

```json
{
  "success": true,
  "filename": "invitation_1743612345678.html",
  "slug": "boda-k2m3",
  "publicUrl": "http://localhost:3001/i/boda-k2m3",
  "invitations_count": 1,
  "invitations_remaining": 2
}
```

#### Campos de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | Boolean | Indica si la operación fue exitosa |
| `filename` | String | Nombre del archivo guardado |
| `slug` | String | Identificador único para URL pública |
| `publicUrl` | String | URL completa para compartir la invitación |
| `invitations_count` | Number | Total de invitaciones del usuario |
| `invitations_remaining` | Number | Invitaciones restantes disponibles |

##### Status: `400 Bad Request`

```json
{
  "error": "userId y htmlContent son requeridos"
}
```

```json
{
  "error": "Has alcanzado el límite de 3 invitaciones"
}
```

##### Status: `404 Not Found`

```json
{
  "error": "Usuario no encontrado"
}
```

#### 💻 Ejemplos de Código

##### JavaScript (Fetch)

```javascript
const invitationData = {
  userId: 'test_user_001',
  htmlContent: '<!DOCTYPE html><html><body><h1>Mi Boda</h1></body></html>',
  eventType: 'Boda'
};

fetch('http://localhost:3001/api/invitations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(invitationData)
})
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log(`Invitación creada: ${data.publicUrl}`);
      console.log(`Slug: ${data.slug}`);
      console.log(`Invitaciones restantes: ${data.invitations_remaining}`);
    }
  })
  .catch(error => console.error(error));
```

##### cURL

```bash
curl -X POST "http://localhost:3001/api/invitations" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_001",
    "htmlContent": "<!DOCTYPE html><html><body><h1>Mi Boda</h1></body></html>",
    "eventType": "Boda"
  }'
```

##### Python (requests)

```python
import requests

invitation_data = {
    'userId': 'test_user_001',
    'htmlContent': '<!DOCTYPE html><html><body><h1>Mi Boda</h1></body></html>',
    'eventType': 'Boda'
}

response = requests.post(
    'http://localhost:3001/api/invitations',
    json=invitation_data
)

if response.status_code == 200:
    data = response.json()
    print(f"Invitación creada: {data['publicUrl']}")
    print(f"Slug: {data['slug']}")
    print(f"Invitaciones restantes: {data['invitations_remaining']}")
else:
    error = response.json()
    print(f"Error: {error.get('error', 'Unknown error')}")
```

---

### GET /api/invitations/:userId

Obtiene la lista de todas las invitaciones de un usuario específico.

#### 📥 Request

**Método:** `GET`

**URL:** `/api/invitations/:userId`

**Content-Type:** `application/json`

#### Parámetros

| Nombre | Ubicación | Tipo | Requerido | Descripción |
|--------|-----------|------|-----------|-------------|
| `userId` | Path | String | ✅ Sí | ID del usuario |

#### 📤 Response

##### Status: `200 OK`

```json
{
  "invitations": [
    {
      "filename": "invitation_1743612345678.html",
      "slug": "boda-k2m3",
      "publicUrl": "http://localhost:3001/i/boda-k2m3",
      "event_type": "Boda",
      "created_at": "2026-04-02T09:00:00.000Z",
      "size": 125000
    },
    {
      "filename": "invitation_1743611111111.html",
      "slug": "xv-aos-x7y9",
      "publicUrl": "http://localhost:3001/i/xv-aos-x7y9",
      "event_type": "XV Años",
      "created_at": "2026-04-01T15:30:00.000Z",
      "size": 98000
    }
  ]
}
```

#### Campos de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `invitations` | Array[Invitation] | Lista de invitaciones ordenadas por fecha (más reciente primero) |

#### Estructura del Objeto Invitation

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `filename` | String | Nombre del archivo en el servidor |
| `slug` | String | Identificador único para URL pública |
| `publicUrl` | String | URL completa para acceder a la invitación |
| `event_type` | String | Tipo de evento (Boda, XV Años, etc.) |
| `created_at` | String | Fecha de creación en formato ISO 8601 |
| `size` | Number | Tamaño del archivo en bytes |

##### Status: `404 Not Found`

```json
{
  "error": "Usuario no encontrado"
}
```

#### 💻 Ejemplos de Código

##### JavaScript (Fetch)

```javascript
const userId = 'test_user_001';

fetch(`http://localhost:3001/api/invitations/${userId}`)
  .then(response => response.json())
  .then(data => {
    console.log(`Total invitaciones: ${data.invitations.length}`);
    
    data.invitations.forEach(inv => {
      console.log(`- ${inv.event_type}`);
      console.log(`  URL: ${inv.publicUrl}`);
      console.log(`  Creada: ${inv.created_at}`);
      console.log(`  Tamaño: ${(inv.size / 1024).toFixed(1)} KB`);
    });
  })
  .catch(error => console.error(error));
```

##### cURL

```bash
curl -X GET "http://localhost:3001/api/invitations/test_user_001" \
  -H "Content-Type: application/json"
```

##### Python (requests)

```python
import requests

user_id = 'test_user_001'
response = requests.get(f'http://localhost:3001/api/invitations/{user_id}')

if response.status_code == 200:
    data = response.json()
    print(f"Total invitaciones: {len(data['invitations'])}")
    
    for inv in data['invitations']:
        print(f"- {inv['event_type']}")
        print(f"  URL: {inv['publicUrl']}")
        print(f"  Creada: {inv['created_at']}")
        print(f"  Tamaño: {inv['size'] / 1024:.1f} KB")
else:
    print(f"Error: {response.status_code}")
```

---

### GET /api/invitations/:userId/:filename

Obtiene el contenido HTML completo de una invitación específica.

#### 📥 Request

**Método:** `GET`

**URL:** `/api/invitations/:userId/:filename`

**Content-Type:** `text/html`

#### Parámetros

| Nombre | Ubicación | Tipo | Requerido | Descripción |
|--------|-----------|------|-----------|-------------|
| `userId` | Path | String | ✅ Sí | ID del usuario propietario |
| `filename` | Path | String | ✅ Sí | Nombre del archivo (ej: `invitation_1743612345678.html`) |

#### 📤 Response

##### Status: `200 OK`

**Headers:**

```
Content-Type: text/html
```

**Body:** Documento HTML completo

##### Status: `404 Not Found`

```json
{
  "error": "Usuario no encontrado"
}
```

```json
{
  "error": "Archivo no encontrado"
}
```

#### 💻 Ejemplos de Código

##### JavaScript (Fetch)

```javascript
const userId = 'test_user_001';
const filename = 'invitation_1743612345678.html';

fetch(`http://localhost:3001/api/invitations/${userId}/${filename}`)
  .then(response => {
    if (!response.ok) throw new Error('Error al obtener invitación');
    return response.text();
  })
  .then(html => {
    console.log(`HTML recibido: ${html.length} caracteres`);
    // Procesar el HTML...
  })
  .catch(error => console.error(error));
```

##### cURL

```bash
curl -X GET "http://localhost:3001/api/invitations/test_user_001/invitation_1743612345678.html" \
  -H "Accept: text/html" \
  -o invitation.html
```

##### Python (requests)

```python
import requests

user_id = 'test_user_001'
filename = 'invitation_1743612345678.html'

response = requests.get(
    f'http://localhost:3001/api/invitations/{user_id}/{filename}'
)

if response.status_code == 200:
    html_content = response.text
    print(f"HTML recibido: {len(html_content)} caracteres")
    
    # Guardar en archivo
    with open('invitation.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
else:
    print(f"Error: {response.status_code}")
```

---

## 📦 Modelos de Datos

### User (Usuario)

Modelo completo de un usuario con todas sus propiedades.

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `user_id` | String | Identificador único del usuario | `"test_user_001"` |
| `invitations_count` | Number | Número de invitaciones creadas | `2` |
| `iteration_credits` | Number | Créditos de iteración disponibles | `7` |
| `invitations_remaining` | Number | Invitaciones restantes que puede crear | `1` |
| `max_invitations` | Number | Límite máximo de invitaciones (siempre 3) | `3` |
| `max_iteration_credits` | Number | Límite máximo de créditos (siempre 10) | `10` |
| `created_at` | String | Fecha de creación (ISO 8601) | `"2026-04-02T08:30:00.000Z"` |
| `invitations` | Array[Invitation] | Lista de invitaciones del usuario | `[...]` |

**Ejemplo completo:**

```json
{
  "user_id": "test_user_001",
  "invitations_count": 2,
  "iteration_credits": 7,
  "invitations_remaining": 1,
  "max_invitations": 3,
  "max_iteration_credits": 10,
  "created_at": "2026-04-02T08:30:00.000Z",
  "invitations": [
    {
      "filename": "invitation_1743612345678.html",
      "slug": "boda-k2m3",
      "publicUrl": "http://localhost:3001/i/boda-k2m3",
      "event_type": "Boda",
      "created_at": "2026-04-02T09:00:00.000Z",
      "size": 125000
    }
  ]
}
```

---

### Invitation (Invitación)

Modelo de una invitación individual.

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `filename` | String | Nombre del archivo en el servidor | `"invitation_1743612345678.html"` |
| `slug` | String | Identificador único para URL pública | `"boda-k2m3"` |
| `publicUrl` | String | URL completa de acceso público | `"http://localhost:3001/i/boda-k2m3"` |
| `event_type` | String | Tipo de evento | `"Boda"` |
| `created_at` | String | Fecha de creación (ISO 8601) | `"2026-04-02T09:00:00.000Z"` |
| `size` | Number | Tamaño del archivo en bytes | `125000` |

**Ejemplo completo:**

```json
{
  "filename": "invitation_1743612345678.html",
  "slug": "boda-k2m3",
  "publicUrl": "http://localhost:3001/i/boda-k2m3",
  "event_type": "Boda",
  "created_at": "2026-04-02T09:00:00.000Z",
  "size": 125000
}
```

---

### ErrorResponse (Respuesta de Error)

Modelo estándar para respuestas de error.

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `error` | String | Mensaje descriptivo del error | `"Usuario no encontrado"` |

**Ejemplos:**

```json
{
  "error": "Usuario no encontrado"
}
```

```json
{
  "error": "userId y htmlContent son requeridos"
}
```

```json
{
  "error": "No tienes créditos de iteración disponibles"
}
```

```json
{
  "error": "Has alcanzado el límite de 3 invitaciones"
}
```

---

### SaveInvitationResponse (Respuesta al Guardar)

Modelo de respuesta al crear una nueva invitación.

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `success` | Boolean | Indica si la operación fue exitosa | `true` |
| `filename` | String | Nombre del archivo guardado | `"invitation_1743612345678.html"` |
| `slug` | String | Identificador único generado | `"boda-k2m3"` |
| `publicUrl` | String | URL pública completa | `"http://localhost:3001/i/boda-k2m3"` |
| `invitations_count` | Number | Total de invitaciones del usuario | `1` |
| `invitations_remaining` | Number | Invitaciones restantes | `2` |

---

## 🔧 Ejemplos de Integración

### Frontend (React/TypeScript)

Usando el servicio `apiService.ts` incluido en el proyecto:

```typescript
import { getUser, saveInvitation, getAllUsers } from './services/apiService';

// Obtener datos del usuario actual
const loadUserData = async () => {
  try {
    const user = await getUser();
    console.log(`Usuario: ${user.user_id}`);
    console.log(`Invitaciones: ${user.invitations_count}/${user.max_invitations}`);
    console.log(`Créditos: ${user.iteration_credits}`);
    
    // Acceder a las invitaciones
    user.invitations.forEach(inv => {
      console.log(`- ${inv.event_type}: ${inv.publicUrl}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
};

// Guardar una nueva invitación
const createInvitation = async (htmlContent: string, eventType: string) => {
  try {
    const result = await saveInvitation(htmlContent, eventType);
    console.log(`Invitación guardada: ${result.publicUrl}`);
    return result;
  } catch (error) {
    console.error('Error al guardar:', error);
    throw error;
  }
};

// Obtener todos los usuarios
const loadAllUsers = async () => {
  try {
    const { users, total } = await getAllUsers();
    console.log(`Total usuarios: ${total}`);
    return users;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};
```

---

### Backend (Node.js)

Ejemplo de consumo desde un servidor Node.js:

```javascript
const http = require('http');

// Función helper para hacer requests
function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.headers['content-type']?.includes('application/json')) {
          resolve(JSON.parse(data));
        } else {
          resolve(data);
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Obtener usuario
async function getUser(userId) {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: `/api/user/${userId}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  
  return makeRequest(options);
}

// Crear invitación
async function createInvitation(userId, htmlContent, eventType) {
  const body = { userId, htmlContent, eventType };
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/invitations',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };
  
  return makeRequest(options, body);
}

// Uso
(async () => {
  try {
    const user = await getUser('test_user_001');
    console.log('Usuario:', user.user_id);
    
    const result = await createInvitation(
      'test_user_001',
      '<html><body>Mi invitación</body></html>',
      'Boda'
    );
    console.log('URL pública:', result.publicUrl);
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

---

### Colección Postman

Importa esta colección en Postman para probar todos los endpoints:

```json
{
  "info": {
    "name": "Invitaciones Digitales API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3001"
    },
    {
      "key": "user_id",
      "value": "test_user_001"
    }
  ],
  "item": [
    {
      "name": "Endpoints Públicos",
      "item": [
        {
          "name": "GET Invitación Pública",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/i/boda-k2m3"
          }
        }
      ]
    },
    {
      "name": "Usuarios",
      "item": [
        {
          "name": "GET Todos los Usuarios",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/users"
          }
        },
        {
          "name": "GET Usuario por ID",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/user/{{user_id}}"
          }
        },
        {
          "name": "POST Consumir Crédito",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/user/{{user_id}}/consume-credit"
          }
        }
      ]
    },
    {
      "name": "Invitaciones",
      "item": [
        {
          "name": "POST Crear Invitación",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/api/invitations",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"userId\": \"test_user_001\",\n  \"htmlContent\": \"<!DOCTYPE html><html><body><h1>Mi Invitación</h1></body></html>\",\n  \"eventType\": \"Boda\"\n}"
            }
          }
        },
        {
          "name": "GET Invitaciones del Usuario",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/invitations/{{user_id}}"
          }
        },
        {
          "name": "GET Contenido de Invitación",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/api/invitations/{{user_id}}/invitation_1743612345678.html"
          }
        }
      ]
    }
  ]
}
```

---

## 📊 Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/i/:slug` | Obtiene invitación pública por slug |
| `GET` | `/api/users` | Lista todos los usuarios |
| `GET` | `/api/user/:id` | Obtiene usuario por ID |
| `POST` | `/api/user/:id/consume-credit` | Consume un crédito de iteración |
| `POST` | `/api/invitations` | Crea nueva invitación |
| `GET` | `/api/invitations/:userId` | Lista invitaciones de usuario |
| `GET` | `/api/invitations/:userId/:filename` | Obtiene contenido HTML |

---

## 📝 Notas Adicionales

### Flujo de Integración con Landing Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE INTEGRACIÓN                                      │
└─────────────────────────────────────────────────────────────────────────────┘

1. Usuario hace login en Landing Page (Laravel)
         ↓
2. Landing obtiene token del sistema principal
         ↓
3. Usuario accede a "Mis Invitaciones"
         ↓
4. Landing hace request a /api/user/:id con el token:
   GET http://localhost:3001/api/user/2
   Headers: { Authorization: Bearer {token} }
         ↓
5. API de Invitaciones:
   a. Extrae token del header
   b. Valida token contra API principal (Laravel)
   c. Obtiene/crea usuario en DB local (SQLite)
   d. Retorna datos + invitaciones
         ↓
6. Landing muestra:
   - Total de invitaciones creadas
   - Créditos de iteración restantes
   - Lista de invitaciones con URLs públicas
   - Links para editar/ver cada invitación
```

### Ejemplo de Integración en Landing Page (Laravel/Blade)

```php
// Controller
public function misInvitaciones(Request $request)
{
    $user = $request->user();
    $token = $user->current_access_token->token;
    
    // Llamar a la API de Invitaciones
    $response = Http::withToken($token)
        ->get('http://localhost:3001/api/user/' . $user->id);
    
    if ($response->successful()) {
        $userData = $response->json();
        
        return view('invitaciones.mis-invitaciones', [
            'invitations' => $userData['invitations'],
            'invitations_count' => $userData['invitations_count'],
            'invitations_remaining' => $userData['invitations_remaining'],
            'iteration_credits' => $userData['iteration_credits']
        ]);
    }
    
    return redirect()->back()->with('error', 'Error al obtener invitaciones');
}
```

```blade
{{-- View --}}
<div class="invitaciones-container">
    <h1>Mis Invitaciones</h1>
    
    <div class="stats">
        <p>Invitaciones creadas: {{ $invitations_count }} / 20</p>
        <p>Créditos de iteración: {{ $iteration_credits }}</p>
    </div>
    
    <div class="invitaciones-list">
        @foreach($invitations as $inv)
            <div class="invitacion-card">
                <h3>{{ $inv['event_type'] }}</h3>
                <p>Creada: {{ $inv['created_at'] }}</p>
                <a href="{{ $inv['publicUrl'] }}" target="_blank">
                    Ver invitación
                </a>
            </div>
        @endforeach
    </div>
</div>
```

### Límites del Sistema

| Recurso | Límite |
|---------|--------|
| Invitaciones por usuario | 20 |
| Créditos de iteración iniciales | 10 |
| Tamaño máximo de request | 50 MB |

### Generación de Slugs

Los slugs se generan automáticamente con el formato:

```
{tipo-evento}-{id-corto}
```

**Ejemplos:**

| eventType | Slug generado |
|-----------|---------------|
| `Boda` | `boda-k2m3` |
| `XV Años` | `xv-aos-x7y9` |
| `Bautizo` | `bautizo-m4n2` |

**Proceso de generación:**

1. Se convierte el tipo de evento a minúsculas
2. Se eliminan acentos y caracteres especiales
3. Se reemplazan espacios por guiones
4. Se agrega un ID corto de 4 caracteres (timestamp en base36)

### Sincronización de Datos

El sistema sincroniza automáticamente:

- Contador de invitaciones basado en archivos reales
- Slugs para invitaciones existentes sin slug
- Campos faltantes en usuarios

---

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas sobre la API:

1. Verifica que el servidor esté corriendo en `http://localhost:3001`
2. Revisa los logs del servidor para mensajes de error
3. Consulta los códigos de estado HTTP en esta documentación

---

**Última actualización:** Abril 2026  
**Versión de la API:** 1.0.0
