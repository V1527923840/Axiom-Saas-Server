export type McpConfig = {
  /**
   * Master switch. When false the MCP controller is not registered at all,
   * so the endpoint 404s and no MCP traffic is served.
   */
  enabled: boolean;

  /**
   * Static API key accepted in `Authorization: Bearer <key>` or
   * `X-MCP-Api-Key: <key>`. Used by MCP clients (e.g. WorkBuddy) that
   * cannot run a login flow. When empty, only JWT is accepted.
   */
  apiKey?: string;

  /**
   * Path (without the global prefix) where the MCP endpoint is mounted.
   * WorkBuddy config points at `${BACKEND_DOMAIN}/api/v1${path}`.
   */
  path: string;

  /**
   * Maximum number of items a single tool call may return.
   * Keeps MCP responses inside the client's context budget.
   */
  maxPageSize: number;

  /**
   * Maximum characters of the original-text field returned by the detail
   * tools. Longer content is truncated with an explicit marker.
   */
  maxOriginalTextLength: number;

  /**
   * Per-caller sustained tool-call rate (requests per second).
   *
   * A token bucket is used, so a caller may burst up to
   * `rateLimitBurst` calls before being throttled. The limit is applied
   * per credential, so one abusive client cannot exhaust the shared
   * budget of the other users.
   */
  rateLimitRps: number;

  /**
   * Token-bucket burst capacity — the number of calls a caller may make
   * back-to-back before the sustained rate limit kicks in.
   */
  rateLimitBurst: number;

  /**
   * Maximum number of MCP tool calls in flight across all callers.
   *
   * This bounds the load a caller can put on the database connection
   * pool even if their request rate is within the per-caller limit.
   */
  maxConcurrency: number;

  /**
   * Maximum length of the `keyword` / `company` filter.
   *
   * These filters are matched with `ILIKE '%value%'`, which cannot use a
   * b-tree index and degrades into a sequential scan over
   * `zsxq_posts`. Capping the input length bounds the work one call can
   * ask the database to do.
   */
  maxFilterLength: number;
};
