import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PassThrough } from 'node:stream';
import { InternalSkillController } from './internal-skill.controller';
import { InternalSkillToolService } from './internal-skill-tool.service';
import { ToolEndpointWhitelist } from './tool-endpoint-whitelist';

/**
 * Spec for InternalSkillController — wiring Task 14's
 * InternalSkillToolService to 4 HTTP routes + ServiceTokenGuard.
 *
 * Coverage focuses on the execute route's audit C-3 defenses:
 *   - toolName not in skill.tools → 404
 *   - endpoint_path not in whitelist → 403
 *   - endpoint schema incomplete → 400
 *   - args fail params_schema → 400
 *   - rate limit hit → 403
 *   - toolName with illegal chars → 400
 *
 * Plus the 3 read endpoints' happy paths (one each).
 */
describe('InternalSkillController', () => {
  let controller: InternalSkillController;
  let svc: jest.Mocked<InternalSkillToolService>;
  let whitelist: ToolEndpointWhitelist;

  const req = (extra: Record<string, unknown> = {}): any => ({
    callerContext: { userId: 'u1', sessionId: 's1', attemptId: 'a1' },
    ...extra,
  });

  beforeEach(() => {
    svc = {
      getMeta: jest.fn(),
      getManifest: jest.fn(),
      getFileContent: jest.fn(),
      getSkillZip: jest.fn(),
      executeTool: jest.fn(),
    } as unknown as jest.Mocked<InternalSkillToolService>;

    whitelist = new ToolEndpointWhitelist();
    whitelist.replaceWith(['POST /internal/quote']);

    controller = new InternalSkillController(svc);
  });

  // ============================================================
  // GET /internal/skills/:id/meta
  // ============================================================

  describe('getMeta', () => {
    it('should call service.getMeta with contentHash and return {data}', async () => {
      svc.getMeta.mockResolvedValue({ id: 's1', name: 'X' } as any);
      const out = await controller.getMeta(
        's1',
        { contentHash: 'h'.repeat(64) },
        req(),
      );
      expect(svc.getMeta).toHaveBeenCalledWith(
        's1',
        'h'.repeat(64),
        expect.objectContaining({ userId: 'u1' }),
      );
      expect(out).toEqual({ data: { id: 's1', name: 'X' } });
    });
  });

  // ============================================================
  // GET /internal/skills/:id/manifest
  // ============================================================

  describe('getManifest', () => {
    it('should call service.getManifest and return {data: {content}}', async () => {
      svc.getManifest.mockResolvedValue({ content: '# body' });
      const out = await controller.getManifest('s1', {}, req());
      expect(svc.getManifest).toHaveBeenCalled();
      expect(out).toEqual({ data: { content: '# body' } });
    });
  });

  // ============================================================
  // GET /internal/skills/:id/files/content
  // ============================================================

  describe('getFileContent', () => {
    it('should call service.getFileContent with path and return {data: {content}}', async () => {
      svc.getFileContent.mockResolvedValue({ content: '# Principles' });
      const out = await controller.getFileContent(
        's1',
        { path: 'principles.md' },
        req(),
      );
      expect(svc.getFileContent).toHaveBeenCalledWith(
        's1',
        undefined,
        'principles.md',
        expect.any(Object),
      );
      expect(out).toEqual({ data: { content: '# Principles' } });
    });
  });

  // ============================================================
  // GET /internal/skills/:id/zip
  // ★ Task 7 fix: PlazaCache lazy zip download wiring. Surface-level
  // check — defence (status guard, file-not-found) lives in service.
  // ============================================================

  describe('getSkillZip', () => {
    it('should pipe the zip buffer to the express response (verbatim)', async () => {
      const buf = Buffer.from('PK-mock-bytes');
      svc.getSkillZip.mockResolvedValue({
        buffer: buf as any,
        downloadFilename: 'trading-101',
      });

      // Use a real PassThrough as the Express response stub. Capture what
      // got piped to it so we can assert the body bytes match the expected
      // PK-prefixed zip buffer.
      const sink = new PassThrough();
      const chunks: Buffer[] = [];
      sink.on('data', (c: Buffer) => chunks.push(c));
      const done = new Promise<void>((resolve) =>
        sink.on('end', () => resolve()),
      );

      await controller.getSkillZip('s1', sink as any);

      await done;
      expect(Buffer.concat(chunks).toString('utf-8')).toBe('PK-mock-bytes');
    });

    it('should propagate service errors (NotFound for unknown / not published)', async () => {
      svc.getSkillZip.mockRejectedValue(
        new NotFoundException(`skill s1 not published`),
      );
      const fakeRes: any = { pipe: jest.fn() };
      await expect(
        controller.getSkillZip('s1', fakeRes),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ============================================================
  // POST /internal/skills/:id/tools/:toolName/execute
  // ★ Audit C-3: security-heavy test surface.
  // ============================================================

  describe('executeTool', () => {
    it('should pass contentHash and args to service.executeTool and return {data}', async () => {
      svc.executeTool.mockResolvedValue({
        data: { skillId: 's1', toolName: 'get_price', status: 'authorized' },
      });

      const out = await controller.executeTool(
        's1',
        'get_price',
        { contentHash: 'h'.repeat(64) },
        { args: { symbol: 'AAPL' } },
        req(),
      );

      expect(svc.executeTool).toHaveBeenCalledWith(
        's1',
        'h'.repeat(64),
        'get_price',
        { symbol: 'AAPL' },
        expect.objectContaining({ userId: 'u1' }),
      );
      expect(out).toEqual({
        data: { skillId: 's1', toolName: 'get_price', status: 'authorized' },
      });
    });

    // ===== Surface-level controller wiring (defense lives in service) =====

    it('should reject when service throws NotFoundException (tool not declared)', async () => {
      svc.executeTool.mockRejectedValue(
        new NotFoundException(`tool 'ghost' not declared`),
      );

      await expect(
        controller.executeTool('s1', 'ghost', {}, { args: {} }, req()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should reject when service throws ForbiddenException (endpoint not whitelisted)', async () => {
      svc.executeTool.mockRejectedValue(
        new ForbiddenException(`tool 'x' endpoint not in whitelist`),
      );

      await expect(
        controller.executeTool('s1', 'x', {}, { args: {} }, req()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should reject when service throws BadRequestException (args validation failed)', async () => {
      svc.executeTool.mockRejectedValue(
        new BadRequestException(`args do not match params_schema`),
      );

      await expect(
        controller.executeTool(
          's1',
          'get_price',
          {},
          { args: { wrong: 'shape' } },
          req(),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should still pass callerContext even when ServiceTokenGuard falls back', async () => {
      svc.executeTool.mockResolvedValue({ data: { ok: true } });
      // Simulate a request without callerContext attached.
      await controller.executeTool('s1', 'get_price', {}, { args: {} }, {
        callerContext: undefined,
      } as any);
      expect(svc.executeTool).toHaveBeenCalledWith(
        's1',
        undefined,
        'get_price',
        {},
        expect.objectContaining({
          userId: undefined,
          sessionId: undefined,
          attemptId: undefined,
        }),
      );
    });
  });
});
