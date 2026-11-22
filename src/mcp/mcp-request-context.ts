import { AsyncLocalStorage } from 'async_hooks';
import { McpCaller } from './mcp-auth.guard';

/**
 * Per-request context shared between the MCP controller and the tool
 * implementations.
 *
 * The MCP SDK's tool callbacks do not receive the HTTP request, but the
 * rate limiter and the audit log both need to know *who* is calling.
 * `AsyncLocalStorage` carries that context across the async call chain
 * without threading it through every tool signature.
 */
export interface McpRequestContext {
  caller: McpCaller;
}

export const mcpRequestContext = new AsyncLocalStorage<McpRequestContext>();

/**
 * Run `fn` with `context` as the ambient MCP request context.
 */
export function runWithMcpContext<T>(
  context: McpRequestContext,
  fn: () => T,
): T {
  return mcpRequestContext.run(context, fn);
}

/**
 * The current caller, or `undefined` outside a request.
 */
export function currentMcpCaller(): McpCaller | undefined {
  return mcpRequestContext.getStore()?.caller;
}
