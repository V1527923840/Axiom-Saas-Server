# Admin Server - Technical Documentation

## Project Overview
NestJS-based admin server for SaaS platform with TypeORM, JWT authentication, and multi-database support.

## Module Architecture

### Core Modules
| Module | Description | Key Files |
|--------|-------------|-----------|
| `auth` | JWT authentication with refresh tokens, social login (Google, Facebook, Apple) | `auth.service.ts`, `strategies/jwt.strategy.ts` |
| `users` | User management with subscription fields | `users.service.ts`, `domain/user.ts` |
| `roles` | Role-based access control | `roles.service.ts`, `roles.guard.ts` |
| `files` | File upload (Local, S3, S3 Presigned) | `files.service.ts`, `infrastructure/uploader/` |
| `session` | User session management | `session.service.ts` |

### Business Modules
| Module | Description |
|--------|-------------|
| `plans` | Subscription plans management |
| `menus` | Menu structure with tree hierarchy |
| `bills` | Billing and consumption tracking |
| `subscriptions` | User subscription management |
| `statuses` | Status definitions |
| `content` | Content management |

## User Subscription Fields

The `User` entity includes these subscription-related fields:
```typescript
tier: string;                    // e.g., 'Lv0'
currentPlanId?: string | null;   // Associated plan UUID
pointsBalance?: number;          // User's points
chatQuotaUsed?: number;          // Chat quota consumed
chatQuotaTotal?: number;         // Total chat quota
subscriptionExpiredAt?: string | null;  // Subscription expiry
registeredAt?: string | null;     // Registration timestamp
lastLoginAt?: string | null;     // Last login timestamp
```

## Database Strategy

- **Relational**: PostgreSQL via TypeORM
- **Document**: MongoDB via Mongoose (optional)
- **Seeds**: Located in `src/database/seeds/relational/` and `src/database/seeds/document/`

## Auth Flow
1. JWT Access Token (short-lived, in auth header)
2. JWT Refresh Token (longer-lived, in httpOnly cookie)
3. Social login: Google, Facebook, Apple supported

## Key API Patterns
- Infinity pagination for list endpoints
- Soft delete with `deletedAt` field
- UUID primary keys for business entities
- Auto-increment IDs for relational entities

## Environment Variables
See `.env.example` for required configuration. Key vars:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` / `JWT_REFRESH_SECRET` - Token secrets
- `APP_PORT` - Server port (default: 3000)
