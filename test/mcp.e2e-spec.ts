import { INestApplication, Module, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, registerAs } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { McpRateLimiterService } from '../src/mcp/mcp-rate-limiter.service';
import { McpAuditService } from '../src/mcp/mcp-audit.service';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpController } from '../src/mcp/mcp.controller';
import { McpService } from '../src/mcp/mcp.service';
import { IntelligenceService } from '../src/intelligence/intelligence.service';
import { ResearchService } from '../src/research/research.service';

/**
 * End-to-end check of the MCP endpoint.
 *
 * Boots a real Nest application with the MCP controller and service,
 * stubbing the two domain services (so no database is required), then
 * drives the endpoint with the official MCP client over Streamable HTTP
 * — the same transport WorkBuddy uses. This exercises the real tool
 * registry, the real JSON-RPC handshake and the real tool-call path.
 */

const INTELLIGENCE_ITEM = {
  id: '11111111-1111-4111-8111-111111111111',
  title: '海光信息算力订单超预期',
  author: '张三',
  groupName: '某某产业研究群',
  summary: '服务器出货量环比增长 30%',
  postDate: new Date('2026-05-01'),
  createdAt: new Date('2026-05-01'),
  categoryL1: 'INDUSTRY',
  categoryL2: 'INDUSTRY_NEWS',
  swIndustryTag: ['计算机'],
  stockMapping: { mentionedStocks: [{ name: '海光信息' }] },
  coreView: { statement: '算力需求持续强劲' },
  pyramidVersion: 'v2.0',
  classificationMethod: 'llm',
  originalTextRaw: '原文内容片段',
};

const INTELLIGENCE_DETAIL = {
  ...INTELLIGENCE_ITEM,
  originalText: '完整原文：算力订单超预期，环比增长 30%。',
  originalTextRaw: '原始文本内容',
  rawFacts: { facts: ['出货增长 30%'] },
  inductionGroups: { groups: ['需求端', '供给端'] },
  baseView: { view: '基础层观点' },
  midView: { view: '中层观点' },
  coreView: { view: '核心观点' },
  pyramidJudgement: { judgement: '看多' },
  pyramidVersion: 'v2.0',
  expectationGap: { gap: '超预期' },
  imageUrls: [],
};

const RESEARCH_ITEM = {
  id: 42,
  version: 'v1',
  documentName: '半导体行业深度报告',
  keyThesis: '国产替代加速',
  createdAt: new Date('2026-05-02'),
  categoryL1: 'INDUSTRY',
  categoryL2: 'RESEARCH',
  swIndustryTag: [{ name: '半导体' }],
  mentionedStocks: [{ name: '中芯国际' }],
  coreView: { statement: '产能利用率回升' },
  pyramidVersion: 'v2.0',
};

const RESEARCH_DETAIL = {
  ...RESEARCH_ITEM,
  rawFacts: { facts: ['国产替代加速'] },
  inductionGroups: { groups: ['供给', '需求'] },
  baseView: { view: '基础层观点' },
  midView: { view: '中层观点' },
  coreView: { view: '核心观点' },
  pyramidJudgement: { judgement: '推荐' },
  pyramidVersion: 'v2.0',
  ossUrl: 'https://oss.example.com/report.pdf',
};

const apiKey = 'test-mcp-api-key';

/**
 * Test-only assembly of the MCP surface. The real `McpModule` pulls in
 * the business modules, which require a live TypeORM connection; here the
 * domain services are replaced with stubs instead.
 */
@Module({
  imports: [
    // The MCP service reads its limits from config (page size, text
    // truncation). Provide them directly so the test needs no .env file.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        registerAs('mcp', () => ({
          enabled: true,
          apiKey,
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
    // The real guard is used here (not a stub) so the API-key path is
    // genuinely exercised. It needs JwtModule for the JWT fallback.
    JwtModule.register({}),
  ],
  controllers: [McpController],
  providers: [
    McpService,
    McpRateLimiterService,
    McpAuditService,
    {
      provide: IntelligenceService,
      useValue: {
        getIntelligenceList: jest.fn(() =>
          Promise.resolve({
            data: [INTELLIGENCE_ITEM],
            total: 1,
            page: 1,
            pageSize: 10,
          }),
        ),
        getIntelligenceDetail: jest.fn((id: string) =>
          Promise.resolve({
            data: id === INTELLIGENCE_ITEM.id ? INTELLIGENCE_DETAIL : undefined,
          }),
        ),
      },
    },
    {
      provide: ResearchService,
      useValue: {
        getResearchList: jest.fn(() =>
          Promise.resolve({
            data: [RESEARCH_ITEM],
            total: 1,
            page: 1,
            pageSize: 10,
          }),
        ),
        getResearchDetail: jest.fn((id: number) =>
          Promise.resolve({
            data: id === RESEARCH_ITEM.id ? RESEARCH_DETAIL : undefined,
          }),
        ),
      },
    },
  ],
})
class TestMcpModule {}

describe('MCP endpoint (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestMcpModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    // The controller declares `version: '1'`, which requires URI versioning
    // to be enabled — same as `main.ts` does for the real application.
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    baseUrl = `http://127.0.0.1:${address.port}/api/v1/mcp`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const connect = async () => {
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl), {
      requestInit: {
        headers: { 'X-MCP-Api-Key': apiKey },
      },
    });
    await client.connect(transport);
    return client;
  };

  it('should list the four intelligence and research tools', async () => {
    const client = await connect();
    const { tools } = await client.listTools();

    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'get_intelligence_detail',
      'get_research_analysis_detail',
      'search_intelligence',
      'search_research_analysis',
    ]);

    await client.close();
  });

  it('should expose search arguments on search_intelligence', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const search = tools.find((t) => t.name === 'search_intelligence');

    expect(search?.description).toBeDefined();
    expect(search?.inputSchema.properties).toHaveProperty('keyword');
    expect(search?.inputSchema.properties).toHaveProperty('company');
    expect(search?.inputSchema.properties).toHaveProperty('dateFrom');

    await client.close();
  });

  it('should search intelligence and return a compact list', async () => {
    const client = await connect();
    const result: any = await client.callTool({
      name: 'search_intelligence',
      arguments: { keyword: '算力' },
    });

    expect(result.isError).toBeFalsy();
    const payload = JSON.parse(result.content[0].text);
    expect(payload.total).toBe(1);
    expect(payload.items[0].title).toBe('海光信息算力订单超预期');
    // The list tool must not leak the heavy raw text.
    expect(payload.items[0].originalText).toBeUndefined();
    expect(payload.items[0].originalTextRaw).toBeUndefined();

    await client.close();
  });

  it('should return the full pyramid structure on detail', async () => {
    const client = await connect();
    const result: any = await client.callTool({
      name: 'get_intelligence_detail',
      arguments: { id: INTELLIGENCE_ITEM.id },
    });

    expect(result.isError).toBeFalsy();
    const payload = JSON.parse(result.content[0].text);
    expect(payload.pyramid.coreView).toEqual({ view: '核心观点' });
    expect(payload.pyramid.pyramidJudgement).toEqual({ judgement: '看多' });
    expect(payload.pyramid.rawFacts).toBeDefined();
    expect(payload.originalText).toContain('算力订单超预期');

    await client.close();
  });

  it('should omit the original text when includeOriginalText is false', async () => {
    const client = await connect();
    const result: any = await client.callTool({
      name: 'get_intelligence_detail',
      arguments: { id: INTELLIGENCE_ITEM.id, includeOriginalText: false },
    });

    const payload = JSON.parse(result.content[0].text);
    expect(payload.originalText).toBeUndefined();
    expect(payload.pyramid.coreView).toBeDefined();

    await client.close();
  });

  it('should search and read research analyses', async () => {
    const client = await connect();

    const list: any = await client.callTool({
      name: 'search_research_analysis',
      arguments: { keyword: '半导体' },
    });
    const listPayload = JSON.parse(list.content[0].text);
    expect(listPayload.items[0].documentName).toBe('半导体行业深度报告');

    const detail: any = await client.callTool({
      name: 'get_research_analysis_detail',
      arguments: { id: 42 },
    });
    const detailPayload = JSON.parse(detail.content[0].text);
    expect(detailPayload.pyramid.pyramidJudgement).toEqual({
      judgement: '推荐',
    });
    expect(detailPayload.ossUrl).toBe('https://oss.example.com/report.pdf');

    await client.close();
  });

  it('should report a readable error instead of failing the call', async () => {
    const client = await connect();
    const result: any = await client.callTool({
      name: 'get_research_analysis_detail',
      arguments: { id: 999999 },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('failed');

    await client.close();
  });

  it('should reject an over-long keyword before querying the database', async () => {
    const client = await connect();
    const result: any = await client.callTool({
      name: 'search_intelligence',
      arguments: { keyword: 'x'.repeat(500) },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('too long');

    await client.close();
  });
});
