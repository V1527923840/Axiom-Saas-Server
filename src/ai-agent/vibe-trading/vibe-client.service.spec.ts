import { VibeClientService } from './vibe-client.service';

describe('VibeClientService', () => {
  const cfg = {
    get: (k: string) =>
      ({
        'vibeTrading.baseUrl': 'http://vibe.local',
        'vibeTrading.apiToken': 'tk',
        'vibeTrading.timeoutMs': 5000,
      })[k],
  };

  let svc: VibeClientService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    svc = new VibeClientService(cfg as any);
  });

  it('should POST /sessions with auth header', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ session_id: 'r1' }),
    });
    const r = await svc.createRemoteSession();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://vibe.local/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
      }),
    );
    expect(r).toEqual({ remoteSessionId: 'r1' });
  });

  it('should submit message then poll until assistant reply appears', async () => {
    // Round 1 (initial fetch in sendMessage + initial getMessages): both empty
    // Round 2 (poll iteration): getMessages returns assistant reply
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            message_id: 'm1',
            attempt_id: 'a1',
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              message_id: 'm2',
              session_id: 'r1',
              role: 'assistant',
              content: 'Hello back',
              created_at: new Date().toISOString(),
            },
          ]),
      });

    const chunks: any[] = [];
    for await (const c of svc.sendMessage(
      'r1',
      'hello',
      new AbortController().signal,
    )) {
      chunks.push(c);
    }
    // Expected: submitted chunk, assistant reply chunk, done chunk
    expect(chunks.length).toBe(3);
    expect(chunks[0].type).toBe('message');
    expect(chunks[0].data.status).toBe('submitted');
    expect(chunks[1].type).toBe('message');
    expect(chunks[1].data.status).toBe('completed');
    expect(chunks[1].data.delta).toBe('Hello back');
    expect(chunks[2].type).toBe('done');
  });
});
