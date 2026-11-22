import { Injectable, Logger } from '@nestjs/common';
import { McpCaller } from './mcp-auth.guard';

/**
 * One audited MCP tool call.
 */
export interface McpAuditEntry {
  callerId: string;
  callerKind: McpCaller['kind'];
  tool: string;
  /** Outcome of the call. */
  status: 'ok' | 'error' | 'rate_limited';
  /** Wall-clock duration of the tool body in milliseconds. */
  durationMs: number;
  /**
   * Compact, non-sensitive summary of the arguments — the filter values
   * that were actually applied, never the raw credential.
   */
  args?: Record<string, unknown>;
  /** Error message when `status !== 'ok'`. */
  error?: string;
}

/**
 * Structured audit trail for MCP tool calls.
 *
 * ## Why
 *
 * When several teams share the endpoint, "someone is hammering the
 * database" is not actionable on its own. The audit log answers:
 *
 * - **Who** — via the caller fingerprint (per credential, not per person).
 * - **What** — which tool, with which filters.
 * - **How much** — call count and duration, so an abusive pattern is
 *   visible before it becomes an incident.
 *
 * ## Deliberate limits
 *
 * - Only the caller fingerprint is stored — never the raw API key.
 * - Argument summaries are truncated, so a log line stays small and
 *   does not become a copy of the data being queried.
 * - The log is emitted through the Nest logger, so it lands wherever
 *   the deployment already ships logs (stdout / file / journald) and
 *   needs no new infrastructure. If you later want it in Postgres, this
 *   service is the single seam to swap.
 */
@Injectable()
export class McpAuditService {
  private readonly logger = new Logger(McpAuditService.name);

  /** Rolling counters for a quick "who is doing what" summary. */
  private readonly counters = new Map<
    string,
    { calls: number; errors: number; totalMs: number }
  >();

  record(entry: McpAuditEntry): void {
    const key = `${entry.callerId}::${entry.tool}`;
    const counter = this.counters.get(key) ?? {
      calls: 0,
      errors: 0,
      totalMs: 0,
    };
    counter.calls += 1;
    counter.totalMs += entry.durationMs;
    if (entry.status !== 'ok') counter.errors += 1;
    this.counters.set(key, counter);

    const level =
      entry.status === 'rate_limited'
        ? 'warn'
        : entry.status === 'error'
          ? 'error'
          : 'log';

    this.logger[level](
      `[mcp] ${entry.callerId} ${entry.tool} ${entry.status} ` +
        `${entry.durationMs}ms` +
        (entry.args ? ` args=${JSON.stringify(entry.args)}` : '') +
        (entry.error ? ` error=${entry.error}` : ''),
    );
  }

  /**
   * Snapshot of the per-caller/tool counters.
   *
   * Exposed for a future admin endpoint and used by the tests to assert
   * that attribution actually works.
   */
  snapshot(): Record<
    string,
    { calls: number; errors: number; averageMs: number }
  > {
    const result: Record<
      string,
      { calls: number; errors: number; averageMs: number }
    > = {};
    for (const [key, counter] of this.counters) {
      result[key] = {
        calls: counter.calls,
        errors: counter.errors,
        averageMs:
          counter.calls === 0 ? 0 : Math.round(counter.totalMs / counter.calls),
      };
    }
    return result;
  }
}
