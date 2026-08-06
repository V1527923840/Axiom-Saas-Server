import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('VibeTrading e2e (mocked upstream)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // mock global fetch so upstream calls do not hit the network
    (global as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ messages: [] }),
        });
      });

    const m = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = m.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should require JWT on GET /api/v1/ai-agent/agents', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/ai-agent/agents')
      .expect(401);
  });

  // Full happy-path flow (create session, send message, etc.) requires a
  // mocked JWT and is out of scope for this task — this spec covers route
  // registration and auth gating only.
});
