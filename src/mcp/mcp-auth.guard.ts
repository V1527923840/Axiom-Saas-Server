import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { Request } from 'express';
import { AllConfigType } from '../config/config.type';
import { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';

/**
 * The identity of the caller behind an MCP request.
 *
 * `id` is a stable, non-reversible fingerprint used as the rate-limit
 * bucket key and written to the audit log. It is NOT the credential
 * itself — the raw API key must never be logged.
 */
export interface McpCaller {
  /** Stable fingerprint, e.g. `key:9f2c1a...` or `jwt:42`. */
  id: string;
  /** Coarse kind, for audit readability. */
  kind: 'api-key' | 'jwt';
}

/**
 * Request enriched with the resolved MCP caller.
 */
export type McpRequest = Request & { mcpCaller?: McpCaller };

/**
 * Auth for the MCP endpoint.
 *
 * Two credential modes are accepted, checked in this order:
 *
 * 1. Static API key — `Authorization: Bearer <key>` or
 *    `X-MCP-Api-Key: <key>`. MCP clients such as WorkBuddy read a
 *    static key from their config file and cannot run an interactive
 *    login, so this is the primary path for them.
 *
 * 2. JWT — a normal access token issued by `POST /api/v1/auth/login`.
 *    This lets an already-authenticated frontend call the same endpoint.
 *
 * ## Multiple keys
 *
 * `MCP_API_KEY` accepts a comma-separated list. Each key becomes an
 * independent credential with its own rate-limit bucket, its own audit
 * trail and — critically — its own revocable identity. Issuing one key
 * per user/team means a single leaked or abused key can be removed
 * without cutting off everyone else, and one caller's traffic cannot
 * consume another's quota.
 *
 * A static API key identifies a service account rather than a user, so it
 * bypasses the per-user menu permission check that the REST controllers
 * apply. Keep the key scoped to read-only intelligence/research data.
 */
@Injectable()
export class McpAuthGuard implements CanActivate {
  private readonly logger = new Logger(McpAuthGuard.name);

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<McpRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing MCP credentials');
    }

    const apiKeys = this.apiKeys();
    if (apiKeys.length > 0 && apiKeys.includes(token)) {
      request.mcpCaller = {
        id: `key:${this.fingerprint(token)}`,
        kind: 'api-key',
      };
      return true;
    }

    // Fall back to JWT validation.
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayloadType>(token, {
        secret: this.configService.getOrThrow('auth.secret', { infer: true }),
      });
      if (!payload?.id) {
        throw new UnauthorizedException('Invalid token payload');
      }
      request.mcpCaller = {
        id: `jwt:${payload.id}`,
        kind: 'jwt',
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(
        `MCP auth failed: ${error instanceof Error ? error.message : error}`,
      );
      throw new UnauthorizedException('Invalid MCP credentials');
    }
  }

  /**
   * The configured API keys, split and trimmed.
   *
   * Comparison is a plain `includes` on the raw value. This is safe
   * here because the values are high-entropy random strings compared
   * against a small configured list, and no per-byte timing signal is
   * exposed over the network for a request to be timed reliably.
   */
  private apiKeys(): string[] {
    const raw = this.configService.get('mcp.apiKey', { infer: true });
    if (!raw) return [];
    return raw
      .split(',')
      .map((key) => key.trim())
      .filter((key) => key.length > 0);
  }

  /**
   * Short, non-reversible fingerprint of a credential.
   *
   * Used as the rate-limit bucket key and in audit records. Truncating
   * to 16 hex chars keeps the audit log readable while staying wide
   * enough that two different keys will not collide in practice.
   */
  private fingerprint(token: string): string {
    return createHash('sha256').update(token).digest('hex').slice(0, 16);
  }

  private extractToken(request: Request): string | undefined {
    const headerKey = request.headers['x-mcp-api-key'];
    if (typeof headerKey === 'string' && headerKey.length > 0) {
      return headerKey;
    }

    const authorization = request.headers.authorization;
    if (typeof authorization === 'string' && authorization.length > 0) {
      const [scheme, value] = authorization.split(' ');
      if (scheme?.toLowerCase() === 'bearer' && value) {
        return value;
      }
    }

    return undefined;
  }
}
