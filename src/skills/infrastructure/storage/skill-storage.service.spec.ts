import { ConfigService } from '@nestjs/config';
import { SkillStorageService } from './skill-storage.service';

describe('SkillStorageService', () => {
  let svc: SkillStorageService;
  let sent: any[];
  let headResult: 'ok' | 'notfound' | 'throw';

  function makeConfigStub(): ConfigService {
    const lookup = (key: string): string | undefined => {
      switch (key) {
        case 'skill.ossBucket':
          return 'test-bucket';
        case 'file.awsS3Region':
          return 'us-east-1';
        case 'file.accessKeyId':
          return 'AKIA';
        case 'file.secretAccessKey':
          return 'secret';
        case 'file.minioEndpoint':
          return undefined;
        default:
          return undefined;
      }
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
});
