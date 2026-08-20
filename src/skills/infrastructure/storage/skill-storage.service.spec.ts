import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Readable } from 'node:stream';
import { SkillStorageService } from './skill-storage.service';

describe('SkillStorageService', () => {
  let svc: SkillStorageService;
  let sent: any[];
  let headResult: 'ok' | 'notfound' | 'throw';

  function makeConfigStub(): ConfigService {
    const skillConfig = {
      ossBucket: 'test-bucket',
      serviceToken: 'dev',
      qiniu: {
        accessKey: 'AKIA',
        secretKey: 'secret',
        bucket: 'test-bucket',
        domain: 'https://cdn.example.com',
        s3Endpoint: 's3.example.com',
        s3Region: 'us-east-1',
      },
    };
    const lookup = (key: string): unknown => {
      if (key === 'skill') return skillConfig;
      return undefined;
    };
    return {
      get: lookup,
      getOrThrow: (key: string) => {
        const v = lookup(key);
        if (v === undefined) throw new Error(`missing config: ${key}`);
        return v;
      },
    } as unknown as ConfigService;
  }

  beforeEach(() => {
    sent = [];
    headResult = 'notfound';
    svc = new SkillStorageService(makeConfigStub());
    // Replace the internal S3Client with a stub
    (svc as any).s3 = {
      send: jest.fn((cmd: any) => {
        sent.push(cmd);
        if (cmd.constructor.name === 'HeadObjectCommand') {
          if (headResult === 'throw') {
            const err: any = new Error('boom');
            err.name = 'InternalError';
            return Promise.reject(err);
          }
          if (headResult === 'notfound') {
            const err: any = new Error('NotFound');
            err.$metadata = { httpStatusCode: 404 };
            err.name = 'NotFound';
            return Promise.reject(err);
          }
          return Promise.resolve({});
        }
        return Promise.resolve({});
      }),
    };
  });

  it('should compute sha256 hash and upload with content-addressed key', async () => {
    const blob = Buffer.from('PK\x03\x04hello-world');
    const result = await svc.upload('skill-1', blob);

    // sha256 of 'PK\x03\x04hello-world'
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.key).toBe(`skills/skill-1/${result.hash}.zip`);

    const put = sent.find((c) => c.constructor.name === 'PutObjectCommand');
    expect(put).toBeDefined();
    expect(put.input.Bucket).toBe('test-bucket');
    expect(put.input.Key).toBe(result.key);
    expect(put.input.Body).toBe(blob);
    expect(put.input.ContentType).toBe('application/zip');
  });

  it('should produce the same hash (but skill-scoped keys) for identical zip content', async () => {
    const blob = Buffer.from('identical-content');
    const a = await svc.upload('s1', blob);
    const b = await svc.upload('s2', blob);
    expect(a.hash).toBe(b.hash);
    // keys are namespaced by skillId so identical zips under different skills live at different paths
    expect(a.key).not.toBe(b.key);
    expect(a.key).toContain(a.hash);
    expect(b.key).toContain(b.hash);
  });

  it('should return false from existsByHash when head returns 404', async () => {
    headResult = 'notfound';
    await expect(svc.existsByHash('abc123')).resolves.toBe(false);
  });

  it('should return true from existsByHash when head succeeds', async () => {
    headResult = 'ok';
    await expect(svc.existsByHash('abc123')).resolves.toBe(true);
  });

  it('should rethrow non-404 errors from existsByHash', async () => {
    headResult = 'throw';
    await expect(svc.existsByHash('abc')).rejects.toThrow('boom');
  });

  it('should not throw on delete failure (best-effort)', async () => {
    (svc as any).s3.send = jest.fn(() => {
      return Promise.reject(new Error('boom'));
    });
    await expect(svc.delete('skills/x/y.zip')).resolves.toBeUndefined();
  });

  describe('getObject timeouts and caps', () => {
    // 200ms idle timeout / 15MB cap 让测试跑得快,生产默认是 15s / 50MB
    const TEST_IDLE_MS = 200;
    const TEST_MAX_BYTES = 15 * 1024 * 1024;

    let timedSvc: SkillStorageService;

    beforeEach(() => {
      timedSvc = new SkillStorageService(
        makeConfigStub(),
        TEST_IDLE_MS,
        TEST_MAX_BYTES,
      );
    });

    function stubBody(body: Readable) {
      (timedSvc as any).s3 = {
        send: jest.fn(() => Promise.resolve({ Body: body })),
      };
    }

    it('should reject when stream stalls longer than the idle read timeout', async () => {
      // 永远不 push 数据的流:模拟七牛云 TCP 连上了但不吐字节的挂死场景
      const stalled = new Readable({ read() {} });
      stubBody(stalled);

      const started = Date.now();
      await expect(timedSvc.getObject('skills/x/y.zip')).rejects.toThrow(
        /idle read timeout after 200ms/,
      );
      const elapsed = Date.now() - started;

      // 关键:必须是「因超时而快速失败」,而不是永久挂起
      expect(elapsed).toBeGreaterThanOrEqual(TEST_IDLE_MS - 50);
      expect(elapsed).toBeLessThan(2000);
      // 连接必须被销毁,否则 socket 泄漏
      expect(stalled.destroyed).toBe(true);
    });

    it('should reject and destroy the stream when the size cap is exceeded', async () => {
      // 20MB 总量 > 15MB cap,应该在第二个 chunk 处中断
      const big = new Readable({
        read() {
          this.push(Buffer.alloc(10 * 1024 * 1024));
        },
      });
      stubBody(big);

      await expect(timedSvc.getObject('skills/x/y.zip')).rejects.toThrow(
        `skill zip exceeds ${TEST_MAX_BYTES} bytes`,
      );
      expect(big.destroyed).toBe(true);
    });

    it('should honor an explicit maxBytes argument over the default cap', async () => {
      const body = Readable.from([Buffer.alloc(1024)]);
      stubBody(body);

      // 1KB 数据,但 cap 设成 512B → 必须拒绝
      await expect(timedSvc.getObject('skills/x/y.zip', 512)).rejects.toThrow(
        'skill zip exceeds 512 bytes',
      );
    });

    it('should return the buffer and log success timing with bytes + ms', async () => {
      const logSpy = jest.spyOn((timedSvc as any).logger, 'log');
      stubBody(Readable.from([Buffer.from('hello')]));

      const result = await timedSvc.getObject('skills/x/y.zip');

      expect(result).toEqual(Buffer.from('hello'));
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /getObject ok key=skills\/x\/y\.zip bytes=5 ms=\d+/,
        ),
      );
    });

    it('should log and rethrow when the S3 send itself fails', async () => {
      const warnSpy = jest.spyOn((timedSvc as any).logger, 'warn');
      (timedSvc as any).s3 = {
        send: jest.fn(() => Promise.reject(new Error('connect ETIMEDOUT'))),
      };

      await expect(timedSvc.getObject('skills/x/y.zip')).rejects.toThrow(
        'connect ETIMEDOUT',
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringMatching(/getObject send-failed key=.*connect ETIMEDOUT/),
      );
    });
  });

  // ★ 2026-08-20 回归:验证 SkillStorageService 可以在 NestJS DI 容器中
  // 正确实例化。af53822 commit 之前会让 Nest 报 UnknownDependenciesException
  // (原始类型参数无法解析),加了 @Optional() 后必须能正常 compile()。
  it('should be resolvable through NestJS DI without UnknownDependenciesException', async () => {
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: SkillStorageService,
          useFactory: (cfg: ConfigService) => new SkillStorageService(cfg),
          inject: [ConfigService],
        },
        {
          provide: ConfigService,
          useValue: makeConfigStub(),
        },
      ],
    }).compile();
    const resolved = module.get(SkillStorageService);
    expect(resolved).toBeInstanceOf(SkillStorageService);
    // 默认值应该通过 ?? fallback 应用
    expect((resolved as any).idleReadTimeoutMs).toBe(15_000);
    expect((resolved as any).maxZipBytes).toBe(50 * 1024 * 1024);
    await module.close();
  });
});
