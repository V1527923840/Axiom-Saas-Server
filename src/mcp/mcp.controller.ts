import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AllConfigType } from '../config/config.type';
import { McpService } from './mcp.service';
import { McpAuthGuard, McpRequest } from './mcp-auth.guard';
import { runWithMcpContext } from './mcp-request-context';
import { McpRateLimiterService } from './mcp-rate-limiter.service';

/**
 * MCP endpoint (Streamable HTTP transport).
 *
 * ## Why this is a raw controller instead of a normal REST controller
 *
 * The MCP protocol is JSON-RPC 2.0 over HTTP, not the REST envelope this
 * project uses elsewhere:
 *
 * - Responses must be raw JSON-RPC payloads, so the global
 *   `TransformResponseInterceptor` (which wraps everything in `{data, meta}`)
 *   must not touch them.
 * - The request body is a JSON-RPC message, so the global `ValidationPipe`
 *   must not try to validate it against a DTO.
 * - `StreamableHTTPServerTransport` writes the response itself, so the
 *   handler must own the raw `Response` object.
 *
 * Both are handled by using `@Res()` (which disables Nest's response
 * pipeline) and by not binding a body DTO.
 *
 * ## Stateless mode
 *
 * `sessionIdGenerator: undefined` puts the transport in stateless mode: no
 * session id is issued, and every request is handled by a fresh
 * `McpServer` + transport pair. This is the right fit here because:
 *
 * - The tools are pure reads, so there is no per-session state to keep.
 * - The server may run behind a load balancer or restart without breaking
 *   in-flight clients.
 * - Clients such as WorkBuddy can connect without an initialize handshake
 *   that has to survive a deploy.
 */
@Controller({ path: 'mcp', version: '1' })
@UseGuards(McpAuthGuard)
export class McpController {
  constructor(
    private readonly mcpService: McpService,
    private readonly rateLimiter: McpRateLimiterService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handlePost(
    @Req() request: McpRequest,
    @Res() response: Response,
  ): Promise<void> {
    if (!this.isEnabled()) {
      // The endpoint is disabled — answer with a JSON-RPC error rather
      // than a REST 404 body, so an MCP client gets a protocol-level
      // explanation instead of a confusing parse failure.
      response.status(HttpStatus.NOT_FOUND).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'MCP endpoint is disabled (set MCP_ENABLED=true to enable).',
        },
        id: null,
      });
      return;
    }
    await this.dispatch(request, response);
  }

  /** Whether the MCP endpoint is switched on. */
  private isEnabled(): boolean {
    return this.configService.get('mcp.enabled', { infer: true }) ?? false;
  }

  /**
   * GET on a stateless Streamable HTTP endpoint opens the server→client
   * SSE stream. This server never pushes unsolicited messages, so the
   * endpoint is not supported — answer with the JSON-RPC "method not
   * allowed" error the spec expects.
   */
  @Get()
  @HttpCode(HttpStatus.METHOD_NOT_ALLOWED)
  handleGet(@Res() response: Response): void {
    response.status(HttpStatus.METHOD_NOT_ALLOWED).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: this.isEnabled()
          ? 'Method not allowed. This MCP server is stateless; use POST.'
          : 'MCP endpoint is disabled (set MCP_ENABLED=true to enable).',
      },
      id: null,
    });
  }

  private async dispatch(
    request: McpRequest,
    response: Response,
  ): Promise<void> {
    const server = new McpServer({
      name: 'axiom-intelligence-mcp',
      version: '1.0.0',
    });

    this.mcpService.registerTools(server);

    const transport = new StreamableHTTPServerTransport({
      // Stateless mode — see the class comment above.
      sessionIdGenerator: undefined,
    });

    // The auth guard has already resolved the caller. Bind it to the
    // async context so the tool callbacks (which never see the HTTP
    // request) can attribute the call for rate limiting and auditing.
    const caller = request.mcpCaller ?? {
      id: 'unknown',
      kind: 'api-key' as const,
    };

    try {
      await server.connect(transport);
      await runWithMcpContext({ caller }, () =>
        transport.handleRequest(request, response, request.body),
      );
    } catch (error) {
      console.error('[McpController] request failed:', error);
      if (!response.headersSent) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    } finally {
      // Tear the per-request pair down once the response is flushed, so
      // long-lived processes do not accumulate transports.
      response.on('close', () => {
        void transport.close();
        void server.close();
      });
    }
  }
}
