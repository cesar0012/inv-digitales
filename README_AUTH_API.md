# API Auth (Laravel Sanctum) — Endpoints de `AuthController`

Este documento describe únicamente los endpoints que viven en `AuthController` (y el flujo SSO por **token exchange** para el Editor).

## Base URL
- **Producción (ejemplo):** `https://api.invitacionesmodernas.com/api`
- **Local:** `http://localhost:8000/api`

## Autenticación
- La API usa **Laravel Sanctum** con **Bearer Tokens**.
- En endpoints protegidos enviar header:
  - `Authorization: Bearer <access_token>`

---

## 1) Login
**POST** `/login`

**Body**
```json
{ "email": "user@mail.com", "password": "secret" }
```

**200 OK (ejemplo)**
```json
{
  "token": "151|...",
  "user": {
    "id": 2,
    "name": "...",
    "email": "...",
    "role_name": "admin"
  }
}
```

**Notas**
- Si las credenciales son incorrectas: `422` con mensaje en `email`.

---

## 2) Registro
**POST** `/register`

**Body**
```json
{
  "name": "Nombre",
  "email": "user@mail.com",
  "password": "secret123",
  "password_confirmation": "secret123",
  "phone": "4471113830"
}
```

**201 Created (ejemplo)**
```json
{
  "token": "151|...",
  "user": { "id": 2, "name": "...", "email": "...", "role_name": "user" },
  "role": { "id": 2, "role_name": "user" }
}
```

---

## 3) Obtener usuario autenticado
**GET** `/user`

**Auth:** `Authorization: Bearer <token>`

**200 OK**
- Devuelve el usuario (incluye `role_name`).

**401**
- `{ "message": "No autenticado" }`

---

## 4) Logout
**POST** `/logout`

**Auth:** `Authorization: Bearer <token>`

**200 OK**
```json
{ "message": "Sesión cerrada" }
```

---

## 5) Actualizar perfil
**PUT** `/user`

**Auth:** `Authorization: Bearer <token>`

**Body (parcial)**
```json
{ "name": "Nuevo Nombre", "phone": "4471113830" }
```

**200 OK**
```json
{ "message": "Usuario actualizado correctamente", "user": { "id": 2, "name": "..." } }
```

---

## 6) Cambiar contraseña
**PUT** `/user/password`

**Auth:** `Authorization: Bearer <token>`

**Body**
```json
{
  "current_password": "actual",
  "password": "nueva_password_123",
  "password_confirmation": "nueva_password_123"
}
```

**200 OK**
```json
{ "message": "Contraseña actualizada correctamente" }
```

**422**
- Si `current_password` no coincide.

---

## 7) Solicitar enlace de recuperación
**POST** `/forgot-password`

**Body**
```json
{ "email": "user@mail.com" }
```

**200 OK**
```json
{ "message": "Enlace de restablecimiento enviado" }
```

---

## 8) Restablecer contraseña (con token)
**POST** `/reset-password`

**Body**
```json
{
  "token": "...",
  "email": "user@mail.com",
  "password": "nueva_password_123",
  "password_confirmation": "nueva_password_123"
}
```

**200 OK**
```json
{ "message": "Contraseña actualizada correctamente" }
```

**Nota:** también existe **GET** `/reset-password/{token}` (ruta de redirección) que envía al frontend a `/reset-password?token=...&email=...`.

---

# SSO (Editor) — Token Exchange (`/issue` + `/consume-token`)

## Objetivo de seguridad
Evitar que el **access_token real** viaje en URL (historial del navegador, logs de servidores, analytics, referers, etc.).

En su lugar:
- El Dashboard genera un **código de un solo uso** y de **vida corta**.
- El Editor intercambia ese código por un **token propio del Editor**.

## Resumen del flujo
1. **Dashboard** autentica normalmente (email/pass o social) → obtiene `access_token`.
2. Usuario hace clic en **“Abrir Editor”**.
3. Dashboard llama a **POST** `/issue` con `Authorization: Bearer <access_token>`.
4. API responde un **`code`** (1 uso) con `expires_in` (p.ej. 60s).
5. Dashboard redirige al Editor: `https://editor.tudominio.com/sso/consume?code=<code>`.
6. **Editor** toma el `code` desde la URL y llama a **POST** `/consume-token` con body `{ "code": "..." }`.
7. API devuelve un **nuevo token** para el Editor + datos del usuario.
8. Editor guarda su sesión y usa `Authorization: Bearer <editor_token>` para consumir endpoints protegidos (por ejemplo `/user`).

**Importante:** el endpoint es `/consume-token` (no `/consume`) y el campo del body es `code` (no `token`).

---

## 9) Emitir código SSO de un solo uso
**POST** `/issue`

**Auth:** `Authorization: Bearer <access_token>`

**200 OK**
```json
{
  "code": "<string-aleatoria>",
  "expires_in": 60
}
```

### Lógica interna (importante)
- Genera un `code` aleatorio y guarda **solo el hash SHA-256** en BD (`code_hash`).
- El registro tiene:
  - `user_id`
  - `expires_at` (TTL)
  - `used_at` (inicialmente `null`)
  - `purpose = editor`
- TTL configurable con `SSO_CODE_TTL_SECONDS` (default `60`).
  - Tiene límites de seguridad: mínimo `15s`, máximo `300s`.

### ¿Por qué es seguro aunque el `code` vaya en la URL?
- Porque **NO es el token real**, y además:
  - expira rápido,
  - es de un solo uso,
  - y el servidor no guarda el valor plano, solo el hash.

---

## 10) Consumir código SSO y obtener token del Editor
**POST** `/consume-token`

**Auth:** No requerido

**Body**
```json
{ "code": "<code>" }
```

**200 OK (ejemplo)**
```json
{
  "token": "156|...",
  "user": {
    "id": 2,
    "name": "Josué Alvarez Rodriguez",
    "email": "arj1931126@gmail.com",
    "role_name": "user"
  }
}
```

### Lógica interna (importante)
- Calcula `sha256(code)` y busca un registro en `sso_codes` que:
  - coincida con `code_hash`,
  - `used_at` sea `null`,
  - `expires_at` sea mayor a `now()`.
- El consumo es **atómico** para evitar reuso por condiciones de carrera:
  - se ejecuta en `DB::transaction()`
  - con `lockForUpdate()`
  - y al encontrarlo marca `used_at = now()`.
- Si no existe (expirado, ya usado o inválido) responde:
  - **401** `{ "message": "Código inválido o expirado" }`
- Si el usuario ya no existe:
  - **404** `{ "message": "Usuario no encontrado" }`
- Si todo bien, crea un token Sanctum para el Editor:
  - nombre: `editor`
  - abilities: `["editor"]`

---

## 11) Obtener más información del usuario (opcional)
Una vez que el Editor ya tiene `token` (el token emitido en `/consume-token`), puede llamar:
- **GET** `/user` con `Authorization: Bearer <editor_token>`

Esto sirve para refrescar/validar sesión y obtener el mismo payload estandarizado de usuario.

---

## Recomendaciones para la implementación del Editor (César)
- Leer `code` desde la URL y **consumirlo inmediatamente** (ideal: al montar la pantalla `/sso/consume`).
- Guardar el `editor_token` en una sesión del Editor:
  - Preferible: cookie **httpOnly** del dominio del Editor.
  - Alternativa: almacenamiento local + estrategia de refresh (si se implementa más adelante).
- En requests posteriores al API, enviar siempre `Authorization: Bearer <editor_token>`.

---

## Si necesitas más datos en la respuesta
Ahorita `/issue` devuelve `{ code, expires_in }` y `/consume-token` devuelve `{ token, user }`.

Si el Editor necesita más contexto, opciones comunes:
- En `/consume-token`: incluir `abilities`, `token_type`, o `issued_at`.
- Incluir `role` completo y/o `preferences` del usuario.
- (Si aplica) incluir `event_id` o contexto del recurso que se va a editar (para aterrizar directo al evento).

Dime qué campos necesitas César y lo ajusto de forma segura (sin exponer el token real en URL).
