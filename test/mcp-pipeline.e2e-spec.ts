import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, registerAs } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ValidationPipe } from '@nestjs/common';
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
import { Module } from '@nestjs/common';

/**
 * Test-only assembly. The production `McpModule` imports the business
 * modules, which need a live TypeORM connection; here the domain
 * services are stubbed instead.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        registerAs('mcp', () => ({
          enabled: true,
          apiKey: 'pipeline-test-key',
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
  controllers: [McpController],
  providers: [
    McpService,
    McpAuthGuard,
    McpRateLimiterService,
    McpAuditService,
    {
      provide: IntelligenceService,
      useValue: {
        getIntelligenceList: jest.fn(() =>
          Promise.resolve({
            data: [],
            total: 0,
            page: 1,
            pageSize: 10,
          }),
        ),
        getIntelligenceDetail: jest.fn(() =>
          Promise.resolve({ data: undefined }),
        ),
      },
    },
    {
      provide: ResearchService,
      useValue: {
        getResearchList: jest.fn(() =>
          Promise.resolve({
            data: [],
            total: 0,
            page: 1,
            pageSize: 10,
          }),
        ),
        getResearchDetail: jest.fn(() => Promise.resolve({ data: undefined })),
      },
    },
  ],
})
class PipelineTestMcpModule {}

/**
 * Guards against the global pipeline (ValidationPipe, response
 * interceptors, exception filter) corrupting the MCP JSON-RPC responses.
 *
 * The e2e spec runs without the global pipes; production wires them up in
 * `main.ts`. This spec reproduces the production pipeline exactly and
 * asserts the MCP protocol still behaves.
 */
describe('MCP endpoint (global pipeline)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const apiKey = 'pipeline-test-key';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PipelineTestMcpModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // Mirror the production wiring from `main.ts`.
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    app.useGlobalInterceptors(
      new ResolvePromisesInterceptor(),
      new TransformResponseInterceptor(),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${address.port}/api/v1/mcp`;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('should still speak MCP when the global pipeline is active', async () => {
    const client = new Client({ name: 'pipeline-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl), {
      requestInit: { headers: { 'X-MCP-Api-Key': apiKey } },
    });

    await client.connect(transport);
    const { tools } = await client.listTools();

    expect(tools.length).toBe(4);
    // A REST-style envelope here would mean the interceptor leaked into
    // the MCP response.
    expect(tools.map((t) => t.name)).toContain('search_intelligence');

    await client.close();
  });

  it('should reject a request without credentials', async () => {
    const client = new Client({ name: 'no-auth-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl));

    await expect(client.connect(transport)).rejects.toBeDefined();
  });
});
