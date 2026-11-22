import {
  Controller,
  Get,
  INestApplication,
  Module,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, registerAs } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpController } from '../src/mcp/mcp.controller';
import { McpService } from '../src/mcp/mcp.service';
import { McpAuthGuard } from '../src/mcp/mcp-auth.guard';
import { McpRateLimiterService } from '../src/mcp/mcp-rate-limiter.service';
import { McpAuditService } from '../src/mcp/mcp-audit.service';
import { IntelligenceService } from '../src/intelligence/intelligence.service';
import { ResearchService } from '../src/research/research.service';
import { HttpExceptionFilter } from '../src/utils/filters/http-exception.filter';
import { TransformResponseInterceptor } from '../src/utils/interceptors/transform-response.interceptor';
import { ResolvePromisesInterceptor } from '../src/utils/serializer.interceptor';

/**
 * Regression guard for the "must not affect the existing online API" rule.
 *
 * Two guarantees are asserted here:
 *
 * 1. **The MCP endpoint is off by default.** Upgrading the backend must not
 *    silently publish a new externally-reachable endpoint. With
 *    `MCP_ENABLED` unset (or `false`), the endpoint refuses requests.
 * 2. **The global pipeline is untouched for existing routes.** The MCP
 *    controller is mounted alongside a normal REST controller; the REST
 *    route must keep returning the project's standard `{data, meta}`
 *    envelope, proving the MCP-specific handling (@Res, raw JSON-RPC)
 *    did not leak into shared infrastructure.
 */

const intelligenceServiceStub = {
  getIntelligenceList: jest.fn(() =>
    Promise.resolve({
      data: [{ id: 'a', title: 't' }],
      total: 1,
      page: 1,
      pageSize: 10,
    }),
  ),
  getIntelligenceDetail: jest.fn(() => Promise.resolve({ data: { id: 'a' } })),
};

const researchServiceStub = {
  getResearchList: jest.fn(() =>
    Promise.resolve({
      data: [],
      total: 0,
      page: 1,
      pageSize: 10,
    }),
  ),
  getResearchDetail: jest.fn(() => Promise.resolve({ data: { id: 1 } })),
};

/**
 * A stand-in for an ordinary REST controller, mounted next to the MCP
 * controller in the same application.
 */
@Controller({ path: 'health', version: '1' })
class ControllerForTest {
  @Get('/ping')
  ping() {
    return { data: { ok: true } };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        registerAs('mcp', () => ({
          // ★ Disabled — this is the default in production.
          enabled: false,
          apiKey: 'some-key',
          path: 'mcp',
          maxPageSize: 20,
          maxOriginalTextLength: 20000,
          rateLimitRps: 5,
          rateLimitBurst: 10,
          maxConcurrency: 8,
          maxFilterLength: 100,
        })),
      ],
    }),
    JwtModule.register({}),
  ],
  controllers: [McpController, ControllerForTest],
  providers: [
    McpService,
    McpAuthGuard,
    McpRateLimiterService,
    McpAuditService,
    { provide: IntelligenceService, useValue: intelligenceServiceStub },
    { provide: ResearchService, useValue: researchServiceStub },
  ],
})
class RegressionTestModule {}

describe('MCP regression guards (existing API must be unaffected)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RegressionTestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    // Same global pipeline as production `main.ts`.
    app.useGlobalInterceptors(
      new ResolvePromisesInterceptor(),
      new TransformResponseInterceptor(),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should keep the standard envelope on ordinary REST routes', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health/ping`);

    expect(res.status).toBe(200);
    const body = await res.json();

    // The project-wide TransformResponseInterceptor envelope.
    expect(body).toHaveProperty('data');
    expect(body.data).toEqual({ ok: true });
  });

  it('should refuse MCP requests while the endpoint is disabled', async () => {
    const client = new Client({ name: 'disabled-test', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(
      new URL(`${baseUrl}/api/v1/mcp`),
      { requestInit: { headers: { 'X-MCP-Api-Key': 'some-key' } } },
    );

    // The client cannot complete the handshake.
    await expect(client.connect(transport)).rejects.toBeDefined();
  });

  it('should return a JSON-RPC error (not a REST error) when disabled', async () => {
    const res = await fetch(`${baseUrl}/api/v1/mcp`, {
      method: 'POST',
      headers: {
        'X-MCP-Api-Key': 'some-key',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'curl', version: '1.0' },
        },
      }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();

    // JSON-RPC shaped, so the client reports "disabled" rather than a
    // confusing parse error.
    expect(body.jsonrpc).toBe('2.0');
    expect(body.error.message).toContain('disabled');
  });
});
