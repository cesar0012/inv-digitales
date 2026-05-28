# Service API - Documentacion v2

API de servicio para consultar los datos de usuarios del generador de invitaciones.

**Base URL:** `https://generador.invitacionesmodernas.com` (produccion)

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

| Status | Mensaje de error | Descripcion |
|--------|-------------------|-------------|
| 401 | `Authorization header requerido` | No se envio el header Authorization |
| 401 | `Token de servicio invalido` | El token no coincide con API_SERVICE_TOKEN |
| 503 | `API_SERVICE_TOKEN no configurado en el servidor` | La variable de entorno no esta definida |

---

## Endpoints

### 1. Listar todos los usuarios

Devuelve un listado con todos los usuarios registrados, sus planes (con creditos disponibles) y la invitacion activa de cada plan.

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
          "iteration_available": 15,
          "active_invitation": {
            "filename": "boda-maria-y-carlos.html",
            "slug": "boda-maria-y-carlos-a1b2",
            "public_url": "https://generador.invitacionesmodernas.com/i/boda-maria-y-carlos-a1b2",
            "event_type": "Boda",
            "event_domain": null,
            "event_date": "2025-06-15",
            "event_time": "16:00"
          }
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
          "iteration_available": 6,
          "active_invitation": null
        }
      ]
    }
  ],
  "total": 1
}
```

#### Campos de la respuesta

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `users` | array | Lista de usuarios |
| `total` | integer | Total de usuarios registrados |

#### Objeto User (en lista)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `user_id` | string | ID del usuario (corresponde al `id` de Laravel) |
| `name` | string | Nombre completo del usuario |
| `created_at` | string | Fecha de registro |
| `invitation_count` | integer | Total de invitaciones creadas |
| `plans` | array[PlanSummary] | Planes del usuario con creditos y invitacion activa |

#### Objeto PlanSummary (en lista)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `purchase_id` | integer | ID de la compra en Laravel |
| `plan_slug` | string | Identificador del plan |
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
| `active_invitation` | object\|null | Invitacion activa del plan (ver ActiveInvitation), o `null` si no tiene |

#### Objeto ActiveInvitation

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `filename` | string | Nombre del archivo HTML en el servidor |
| `slug` | string | Slug unico para URL publica |
| `public_url` | string | URL publica completa de la invitacion |
| `event_type` | string | Tipo de evento (Boda, XV Años, etc.) |
| `event_domain` | string\|null | Dominio personalizado |
| `event_date` | string\|null | Fecha del evento |
| `event_time` | string\|null | Hora del evento |

#### Response `401 Unauthorized`

```json
{
  "error": "Token de servicio invalido"
}
```

---

### 2. Obtener detalle de un usuario

Devuelve el detalle completo de un usuario: datos, planes con creditos disponibles e invitacion activa, mas el listado completo de todas sus invitaciones con URLs publicas.

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
      "active_invitation": {
        "filename": "boda-maria-y-carlos.html",
        "slug": "boda-maria-y-carlos-a1b2",
        "public_url": "https://generador.invitacionesmodernas.com/i/boda-maria-y-carlos-a1b2",
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
      "active_invitation": null
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
      "is_active": 1,
      "created_at": "2025-03-10T14:30:00.000Z"
    },
    {
      "filename": "xv-anita-l7m2.html",
      "slug": "xv-anita-l7m2",
      "public_url": "https://generador.invitacionesmodernas.com/i/xv-anita-l7m2",
      "event_type": "XV Años",
      "event_domain": null,
      "event_date": "2025-08-20",
      "event_time": "19:00",
      "purchase_id": 58,
      "plan_slug": "basic",
      "is_active": 0,
      "created_at": "2025-04-05T10:15:00.000Z"
    }
  ]
}
```

#### Campos de la respuesta

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `user_id` | string | ID del usuario |
| `name` | string | Nombre completo del usuario |
| `created_at` | string | Fecha de registro |
| `plans` | array[PlanDetail] | Planes del usuario con creditos, invitacion activa e indicador |
| `invitations` | array[Invitation] | Todas las invitaciones del usuario ordenadas por fecha (mas reciente primero) |

#### Objeto PlanDetail (en detalle)

Incluye todos los campos de PlanSummary mas:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | integer | ID interno del registro en `user_plans` |
| `has_invitation` | boolean | Si el plan tiene una invitacion activa asociada |
| `active_invitation` | object\|null | Datos de la invitacion activa del plan (ver ActiveInvitation), o `null` |

#### Objeto Invitation (en listado de detalle)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `filename` | string | Nombre del archivo HTML |
| `slug` | string | Slug unico para URL publica |
| `public_url` | string | URL publica completa de la invitacion |
| `event_type` | string | Tipo de evento (Boda, XV Años, Bautizo, etc.) |
| `event_domain` | string\|null | Dominio personalizado |
| `event_date` | string\|null | Fecha del evento |
| `event_time` | string\|null | Hora del evento |
| `purchase_id` | integer\|null | ID de compra asociada al plan |
| `plan_slug` | string\|null | Slug del plan asociado |
| `is_active` | integer | 1 si es la invitacion activa del plan, 0 si no |
| `created_at` | string | Fecha de creacion en formato ISO 8601 |

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

## Modelos de datos consolidados

### ActiveInvitation (invitacion activa de un plan)

Se devuelve dentro de cada plan en ambos endpoints. Representa la invitacion activa asociada a ese plan (o `null` si el usuario aun no ha creado una invitacion para ese plan).

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `filename` | string | Nombre del archivo HTML |
| `slug` | string | Slug unico para URL publica |
| `public_url` | string | URL publica completa |
| `event_type` | string | Tipo de evento |
| `event_domain` | string\|null | Dominio personalizado |
| `event_date` | string\|null | Fecha del evento |
| `event_time` | string\|null | Hora del evento |

### Planes disponibles (plan_config)

| plan_slug | plan_name | invites_included | generation_credits | iteration_credits |
|-----------|-----------|-----------------|-------------------|-------------------|
| `premium` | Plan Premium | 1 | 10 | 20 |
| `catalogo` | Plan Catalogo | 1 | 5 | 10 |
| `creativa` | Plan Creativa | 1 | 7 | 14 |
| `basic` | Plan Basico | 1 | 3 | 6 |
| `standard` | Plan Estandar | 1 | 5 | 10 |

---

## Diferencias entre endpoints

| Aspecto | `GET /api/service/users` | `GET /api/service/users/:userId` |
|---------|--------------------------|----------------------------------|
| Devuelve | Listado de todos los usuarios | Un solo usuario |
| Campo `id` en plan | No | Si (ID interno de `user_plans`) |
| Campo `has_invitation` en plan | No | Si |
| Campo `active_invitation` en plan | Si | Si |
| Seccion `invitations` separada | No | Si (listado completo con `is_active`) |

---

## Casos de uso comunes

### Saber si un usuario puede crear una invitacion

Verificar si alguno de sus planes tiene `invites_available > 0`:

```json
{
  "plans": [
    { "plan_slug": "premium", "invites_available": 0 },
    { "plan_slug": "basic", "invites_available": 1 }
  ]
}
```

En este ejemplo, el usuario puede crear 1 invitacion en el plan `basic`.

### Saber si un usuario puede iterar (regenerar) una invitacion

Verificar los `iteration_available` del plan que tiene la invitacion activa:

```json
{
  "plans": [
    {
      "plan_slug": "premium",
      "active_invitation": { "slug": "boda-k2m3" },
      "iteration_available": 15
    }
  ]
}
```

El usuario tiene 15 iteraciones disponibles para esa invitacion.

### Saber si un usuario puede generar una invitacion desde cero

Verificar los `generation_available` del plan:

```json
{
  "plans": [
    { "plan_slug": "basic", "generation_available": 3 }
  ]
}
```

3 generaciones disponibles.

### Obtener la URL publica de la invitacion activa

```json
{
  "plans": [
    {
      "plan_slug": "premium",
      "active_invitation": {
        "public_url": "https://generador.invitacionesmodernas.com/i/boda-maria-y-carlos-a1b2"
      }
    }
  ]
}
```

Si `active_invitation` es `null`, el usuario aun no ha creado una invitacion para ese plan.

### Listar todas las invitaciones de un usuario (incluyendo inactivas)

Usar `GET /api/service/users/:userId` y revisar la seccion `invitations`. Cada invitacion tiene `is_active` (1 o 0) para identificar cual es la activa dentro de su plan.

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

    public function canCreateInvitation(array $userData): bool
    {
        foreach ($userData['plans'] as $plan) {
            if ($plan['invites_available'] > 0) {
                return true;
            }
        }
        return false;
    }

    public function canIterate(array $userData, string $planSlug): bool
    {
        foreach ($userData['plans'] as $plan) {
            if ($plan['plan_slug'] === $planSlug && $plan['iteration_available'] > 0) {
                return true;
            }
        }
        return false;
    }

    public function getActiveInvitationUrl(array $userData, string $planSlug): ?string
    {
        foreach ($userData['plans'] as $plan) {
            if ($plan['plan_slug'] === $planSlug && $plan['active_invitation']) {
                return $plan['active_invitation']['public_url'];
            }
        }
        return null;
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

---

## Resumen rapido

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| `GET` | `/api/service/users` | Lista todos los usuarios con planes e invitaciones activas |
| `GET` | `/api/service/users/:userId` | Detalle de un usuario: planes, invitacion activa por plan, y listado completo de invitaciones |