# API Invitaciones - Endpoints para Landing Page

**Base URL (localhost):** `http://localhost:3001`  
**Base URL (Stage):** *Pendiente*

---

## Autenticación

Todos los endpoints requieren header:

```
Authorization: Bearer {token}
```

El token se valida contra: `GET http://mgo04coc00044soosok84ggc.217.216.43.10.sslip.io/api/user`

---

## GET /api/user/:id

Obtiene datos del usuario con sus invitaciones.

### Request

```
GET /api/user/:id
Authorization: Bearer {token}
Accept: application/json
```

### Parámetros

| Nombre | Ubicación | Tipo | Descripción |
|--------|-----------|------|-------------|
| id | path | string | ID del usuario |

### Response 200

```json
{
  "user_id": "2",
  "invitations_count": 5,
  "iteration_credits": 8,
  "invitations_remaining": 15,
  "max_invitations": 20,
  "max_iteration_credits": 10,
  "created_at": "2026-04-03 12:00:00",
  "invitations": [
    {
      "filename": "invitacion-boda-abc123.html",
      "slug": "boda-abc123",
      "publicUrl": "http://localhost:3001/i/boda-abc123",
      "event_type": "Boda Tradicional",
      "created_at": "2026-04-03 14:30:00",
      "size": 45678
    }
  ]
}
```

### Errores

| Código | Body |
|--------|------|
| 401 | `{"error": "No autenticado", "code": "NO_TOKEN"}` |
| 401 | `{"error": "Token inválido o expirado", "code": "INVALID_TOKEN"}` |
| 403 | `{"error": "No autorizado para ver este usuario"}` |
| 404 | `{"error": "Usuario no encontrado"}` |

---

## GET /i/:slug

Obtiene invitación pública (sin autenticación).

### Request

```
GET /i/:slug
```

### Parámetros

| Nombre | Ubicación | Tipo | Descripción |
|--------|-----------|------|-------------|
| slug | path | string | Identificador único de la invitación |

### Response 200

Documento HTML completo.

### Errores

| Código | Body |
|--------|------|
| 404 | HTML con mensaje "Invitación no encontrada" |

---

## Ejemplo Laravel

```php
public function misInvitaciones(Request $request)
{
    $token = $request->user()->current_access_token->token;
    
    $response = Http::withToken($token)
        ->get("http://localhost:3001/api/user/{$request->user()->id}");
    
    if ($response->successful()) {
        return view('invitaciones.index', $response->json());
    }
    
    return back()->with('error', $response->json('error'));
}
```
