import { Injectable } from '@nestjs/common';

/**
 * ToolEndpointWhitelist — SSRF / path-traversal defense for skill tool
 * execution (per audit C-3 in execution guide §5.3).
 *
 * Skills declare declarative tools in their `tools` jsonb array. Each
 * tool has an `endpoint_path` that points to an INTERNAL Saas route the
 * tool executor should forward to. To prevent:
 *   - SSRF (calling arbitrary external URLs from a server-side tool call)
 *   - path traversal (escalating to /admin, /auth, etc.)
 *   - forward injection (substituting attacker-controlled paths into
 *     the URL builder)
 *
 * every `endpoint_path` MUST be registered here at boot. The
 * `executeTool` flow refuses any tool whose endpoint_path is not in
 * this set.
 *
 * Populating the whitelist:
 *   This file starts EMPTY — every internal tool endpoint must be
 *   explicitly registered (typically by an admin migration or a startup
 *   scan). New tool endpoints are added by appending to the `PATHS`
 *   array below. Endpoints MUST match exactly (no globs); wildcards
 *   are intentionally not supported because they trivially defeat the
 *   defense.
 *
 * ★ Route format: `'METHOD /path'` (e.g. `'POST /internal/quote'`).
 *   The path MUST start with `/` and contain no `..` or `://`.
 */
export const PATHS: ReadonlyArray<string> = Object.freeze([
  // E2E test endpoint (2026-08-18 dev only — remove before merge to prod)
  'GET /internal/test/quote',
]);

/**
 * Provider class. Exposed as a NestJS Injectable so consumers can
 * DI-inject the whitelist (and tests can override it). Reads from
 * the frozen `PATHS` array above; the array is the single source
 * of truth.
 */
@Injectable()
export class ToolEndpointWhitelist {
  private readonly set: Set<string>;

  constructor() {
    this.set = new Set<string>(PATHS);
  }

  /**
   * Returns true iff `endpointPath` (formatted as `'METHOD /path'`)
   * is registered.
   */
  has(endpointPath: string): boolean {
    return this.set.has(endpointPath);
  }

  /**
   * Test/dev helper — allows tests to swap in an alternative
   * whitelist. Production code MUST NOT call this.
   */
  replaceWith(paths: string[]): void {
    this.set.clear();
    for (const p of paths) this.set.add(p);
  }

  /** Snapshot for diagnostics. */
  list(): string[] {
    return [...this.set];
  }
}
