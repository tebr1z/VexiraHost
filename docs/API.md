# API Reference

Vexira Host REST API documentation. Base URL: `/api/v1`

> **Note:** This is an architecture scaffold. Endpoints listed below are planned — only the health check is currently implemented.

## Authentication

All authenticated endpoints require a Bearer token:

```
Authorization: Bearer <access_token>
```

### Token Flow

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/login` | POST | Public | Authenticate user |
| `/auth/register` | POST | Public | Register new account |
| `/auth/refresh` | POST | Public | Refresh access token |
| `/auth/logout` | POST | Required | Invalidate refresh token |
| `/auth/me` | GET | Required | Get current user profile |

## Response Format

### Success

```json
{
  "success": true,
  "data": {},
  "timestamp": "2026-06-30T10:00:00.000Z"
}
```

### Paginated Success

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "timestamp": "2026-06-30T10:00:00.000Z"
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": ["must be a valid email"]
    }
  },
  "timestamp": "2026-06-30T10:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Implemented Endpoints

### Health

```
GET /api/v1/health
```

**Auth:** Public

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "vexira-host-api"
  },
  "timestamp": "2026-06-30T10:00:00.000Z"
}
```

---

## Planned Endpoints

### Users

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/users` | GET | Admin, Staff | List users |
| `/users/:id` | GET | Admin, Staff, Owner | Get user |
| `/users/:id` | PATCH | Admin, Owner | Update user |
| `/users/:id` | DELETE | Admin | Delete user |

### Orders

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/orders` | GET | Customer+ | List orders |
| `/orders` | POST | Customer+ | Create order |
| `/orders/:id` | GET | Customer+ | Get order details |
| `/orders/:id/cancel` | POST | Customer+ | Cancel order |

### Domains

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/domains` | GET | Customer+ | List domains |
| `/domains/search` | GET | Public | Search domain availability |
| `/domains/register` | POST | Customer+ | Register domain |
| `/domains/:id/transfer` | POST | Customer+ | Transfer domain |
| `/domains/:id/dns` | GET/PUT | Customer+ | Manage DNS records |

### Hosting

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/hosting/plans` | GET | Public | List hosting plans |
| `/hosting` | GET | Customer+ | List hosting accounts |
| `/hosting/provision` | POST | Customer+ | Create hosting account |
| `/hosting/:id/panel-login` | GET | Customer+ | One-click panel SSO URL |
| `/hosting/:id` | GET | Customer+ | Get hosting details |
| `/hosting/:id/suspend` | POST | Admin, Staff | Suspend account (planned) |
| `/hosting/:id/unsuspend` | POST | Admin, Staff | Unsuspend account (planned) |

### Billing

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/billing/invoices` | GET | Customer+ | List invoices |
| `/billing/invoices/:id` | GET | Customer+ | Get invoice |
| `/billing/invoices/:id/pdf` | GET | Customer+ | Download invoice PDF |

### Payments

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/payments/methods` | GET | Customer+ | List payment methods |
| `/payments/methods` | POST | Customer+ | Add payment method |
| `/payments/charge` | POST | Customer+ | Process payment |

### Tickets

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/tickets` | GET | Customer+ | List tickets |
| `/tickets` | POST | Customer+ | Create ticket |
| `/tickets/:id` | GET | Customer+ | Get ticket |
| `/tickets/:id/reply` | POST | Customer+ | Reply to ticket |

### Servers

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/servers` | GET | Customer+ | List VPS/dedicated servers |
| `/servers/:id` | GET | Customer+ | Get server details |
| `/servers/:id/power` | POST | Customer+ | Power actions (start/stop/reboot) |

### Licenses

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/licenses` | GET | Customer+ | List software licenses |
| `/licenses/:id` | GET | Customer+ | Get license details |

### Admin

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/admin/dashboard` | GET | Admin, Staff | Admin dashboard stats |
| `/admin/users` | GET | Admin | Manage all users |
| `/admin/hosting/servers` | GET/POST | Admin | List / create WHM servers |
| `/admin/hosting/servers/:id` | GET/PATCH/DELETE | Admin | Manage hosting server |
| `/admin/hosting/servers/:id/test` | POST | Admin | Test WHM connection (mock) |
| `/admin/hosting/accounts` | GET | Admin, Staff | All customer hosting accounts |
| `/admin/settings` | GET/PUT | Admin | Platform settings (planned) |

### Audit

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/audit/logs` | GET | Admin | Query audit logs |

---

## GraphQL (Future)

GraphQL endpoint planned at `/graphql` — configuration scaffold exists but is not enabled.

## Rate Limiting (Future)

Rate limits will be applied per IP and per authenticated user. Headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1719756000
```

## Versioning

API is versioned via URL path: `/api/v1/`, `/api/v2/` (future).

Breaking changes require a new version. Previous versions maintained for 12 months after deprecation notice.
