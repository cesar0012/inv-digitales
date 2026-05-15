# Service API - Documentacion

API de servicio para que sistemas externos (Laravel) consulten los datos de usuarios del generador de invitaciones.

**Base URL:** `https://generador.invitacionesmodernas.com` (produccion) / `http://localhost:3001` (desarrollo)

---

## Autenticacion

Todos los endpoints requieren un token estatico enviado en el header `Authorization`:

```
Authorization: Bearer <API_SERVICE_TOKEN>
```

El token se configura en el servidor mediante la variable de entorno `API_SERVICE_TOKEN`.

| Header | Valor | Requerido |
|--------|-------|-----------|
| `Authorization` | `Bearer <token>` | Si |
| `Accept` | `application/json` | Recomendado |

### Errores de autenticacion

| Status | Codigo | Descripcion |
|--------|--------|-------------|
| 401 | `Authorization header requerido` | No se envio el header Authorization |
| 401 | `Token de servicio invalido` | El token no coincide con API_SERVICE_TOKEN |
| 503 | `API_SERVICE_TOKEN no configurado en el servidor` | La variable de entorno no esta definida |

---

## Endpoints

### 1. Listar todos los usuarios

Devuelve un listado con todos los usuarios registrados, sus planes y conteo de invitaciones.

```
GET /api/service/users
```

#### Ejemplo de request

```bash
curl -X GET \
  https://generador.invitacionesmodernas.com/api/service/users \
  -H "Authorization: Bearer inv_service_token_2026_secure" \
  -H "Accept: application/json"
```

#### Response `200 OK`

```json
{
  "users": [
    {
      "user_id": "135",
      "name": "Josue Alvarez Rodriguez",
      "created_at": "2025-01-15 10:30:00",
      "invitation_count": 3,
      "plans": [
        {
          "purchase_id": 42,
          "plan_slug": "premium",
          "plan_name": "Plan Premium",
          "invites_included": 1,
          "invites_used": 1,
          "invites_available": 0,
          "generation_credits": 10,
          "generation_used": 2,
          "generation_available": 8,
          "iteration_credits": 20,
          "iteration_used": 5,
          "iteration_available": 15
        },
        {
          "purchase_id": 58,
          "plan_slug": "basic",
          "plan_name": "Plan Basico",
          "invites_included": 1,
          "invites_used": 0,
          "invites_available": 1,
          "generation_credits": 3,
          "generation_used": 0,
          "generation_available": 3,
          "iteration_credits": 6,
          "iteration_used": 0,
          "iteration_available": 6
        }
      ]
    }
  ],
  "total": 1
}
```

#### Response `401 Unauthorized`

```json
{
  "error": "Token de servicio invalido"
}
```

---

### 2. Obtener detalle de un usuario

Devuelve el detalle completo de un usuario: datos, planes con creditos disponibles, e invitaciones con URLs publicas.

```
GET /api/service/users/:userId
```

#### Parametros

| Parametro | Tipo | Ubicacion | Descripcion |
|-----------|------|-----------|-------------|
| `userId` | string | path | ID del usuario (corresponde al `id` de Laravel) |

#### Ejemplo de request

```bash
curl -X GET \
  https://generador.invitacionesmodernas.com/api/service/users/135 \
  -H "Authorization: Bearer inv_service_token_2026_secure" \
  -H "Accept: application/json"
```

#### Response `200 OK`

```json
{
  "user_id": "135",
  "name": "Josue Alvarez Rodriguez",
  "created_at": "2025-01-15 10:30:00",
  "plans": [
    {
      "id": 7,
      "purchase_id": 42,
      "plan_slug": "premium",
      "plan_name": "Plan Premium",
      "invites_included": 1,
      "invites_used": 1,
      "generation_credits": 10,
      "generation_used": 2,
      "generation_available": 8,
      "iteration_credits": 20,
      "iteration_used": 5,
      "iteration_available": 15,
      "invites_available": 0,
      "has_invitation": true,
      "invitation": {
        "filename": "boda-maria-y-carlos.html",
        "slug": "boda-maria-y-carlos-a1b2",
        "event_type": "Boda",
        "event_domain": null,
        "event_date": "2025-06-15",
        "event_time": "16:00"
      }
    },
    {
      "id": 12,
      "purchase_id": 58,
      "plan_slug": "basic",
      "plan_name": "Plan Basico",
      "invites_included": 1,
      "invites_used": 0,
      "generation_credits": 3,
      "generation_used": 0,
      "generation_available": 3,
      "iteration_credits": 6,
      "iteration_used": 0,
      "iteration_available": 6,
      "invites_available": 1,
      "has_invitation": false,
      "invitation": null
    }
  ],
  "invitations": [
    {
      "filename": "boda-maria-y-carlos.html",
      "slug": "boda-maria-y-carlos-a1b2",
      "public_url": "https://generador.invitacionesmodernas.com/i/boda-maria-y-carlos-a1b2",
      "event_type": "Boda",
      "event_domain": null,
      "event_date": "2025-06-15",
      "event_time": "16:00",
      "purchase_id": 42,
      "plan_slug": "premium",
      "created_at": "2025-03-10T14:30:00.000Z"
    }
  ]
}
```

#### Response `404 Not Found`

```json
{
  "error": "Usuario no encontrado"
}
```

#### Response `401 Unauthorized`

```json
{
  "error": "Token de servicio invalido"
}
```

---

## Modelos de datos

### Plan (en lista de usuarios)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `purchase_id` | integer | ID de la compra en Laravel (referencia a billing) |
| `plan_slug` | string | Identificador del plan (`basic`, `standard`, `premium`, `catalogo`, `creativa`) |
| `plan_name` | string | Nombre legible del plan |
| `invites_included` | integer | Invitaciones incluidas en el plan |
| `invites_used` | integer | Invitaciones ya utilizadas |
| `invites_available` | integer | Invitaciones disponibles restantes |
| `generation_credits` | integer | Creditos de generacion incluidos |
| `generation_used` | integer | Creditos de generacion utilizados |
| `generation_available` | integer | Creditos de generacion disponibles |
| `iteration_credits` | integer | Creditos de iteracion incluidos |
| `iteration_used` | integer | Creditos de iteracion utilizados |
| `iteration_available` | integer | Creditos de iteracion disponibles |

### Plan (en detalle de usuario)

Incluye todos los campos anteriores mas:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | integer | ID interno del registro en `user_plans` |
| `has_invitation` | boolean | Si el plan tiene una invitacion creada asociada |
| `invitation` | object/null | Datos de la invitacion asociada al plan (ver modelo Invitation) |

### Invitation (en detalle de usuario)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `filename` | string | Nombre del archivo HTML |
| `slug` | string | Slug unico para URL publica |
| `public_url` | string | URL publica completa de la invitacion |
| `event_type` | string | Tipo de evento (Boda, XV, Bautizo, etc.) |
| `event_domain` | string/null | Dominio personalizado |
| `event_date` | string/null | Fecha del evento |
| `event_time` | string/null | Hora del evento |
| `purchase_id` | integer/null | ID de compra asociada al plan |
| `plan_slug` | string/null | Slug del plan asociado |
| `created_at` | string | Fecha de creacion |

### Planes disponibles (plan_config)

| plan_slug | plan_name | invites_included | generation_credits | iteration_credits |
|-----------|-----------|-----------------|-------------------|-------------------|
| `premium` | Plan Premium | 1 | 10 | 20 |
| `catalogo` | Plan Catalogo | 1 | 5 | 10 |
| `creativa` | Plan Creativa | 1 | 7 | 14 |
| `basic` | Plan Basico | 1 | 3 | 6 |
| `standard` | Plan Estandar | 1 | 5 | 10 |

---

## Configuracion del servidor

La variable de entorno `API_SERVICE_TOKEN` debe estar configurada en el servidor. Si no esta definida, los endpoints devolveran status 503.

### Archivo .env.local

```
API_SERVICE_TOKEN=tu-token-secreto-aqui
```

### Consideraciones de seguridad

- El token es estatico y se comparte unicamente con el sistema que consume la API
- Si el token se compromete, basta con cambiar el valor de `API_SERVICE_TOKEN` y reiniciar el servidor
- Los endpoints de servicio NO requieren autenticacion de usuario ni de admin, solo el token de servicio
- Estos endpoints son de solo lectura, no modifican datos

---

## Ejemplo de integracion en Laravel

```php
// En un Service o Controller de Laravel

class InvitacionesService
{
    private string $baseUrl;
    private string $serviceToken;

    public function __construct()
    {
        $this->baseUrl = config('services.invitaciones.url');
        $this->serviceToken = config('services.invitaciones.token');
    }

    public function getAllUsers(): array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->serviceToken,
            'Accept' => 'application/json',
        ])->get("{$this->baseUrl}/api/service/users");

        return $response->json();
    }

    public function getUser(string $userId): ?array
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->serviceToken,
            'Accept' => 'application/json',
        ])->get("{$this->baseUrl}/api/service/users/{$userId}");

        if ($response->status() === 404) {
            return null;
        }

        return $response->json();
    }
}
```

### config/services.php

```php
'invitaciones' => [
    'url' => env('INVITACIONES_SERVICE_URL', 'https://generador.invitacionesmodernas.com'),
    'token' => env('INVITACIONES_SERVICE_TOKEN'),
],
```

### .env (Laravel)

```
INVITACIONES_SERVICE_URL=https://generador.invitacionesmodernas.com
INVITACIONES_SERVICE_TOKEN=inv_service_token_2026_secure
```