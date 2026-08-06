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

  it('should yield text_delta chunks then done on attempt.completed', async () => {
    const sseBody =
      'id: 1\nevent: message.received\ndata: {"message_id":"m2","role":"user"}\n\n' +
      'id: 2\nevent: attempt.started\ndata: {"attempt_id":"a1"}\n\n' +
      'id: 3\nevent: text_delta\ndata: {"attempt_id":"a1","delta":"Hel"}\n\n' +
      'id: 4\nevent: text_delta\ndata: {"attempt_id":"a1","delta":"lo"}\n\n' +
      'id: 5\nevent: attempt.completed\ndata: {"attempt_id":"a1","summary":"Hello","status":"completed"}\n\n';
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ message_id: 'm1', attempt_id: 'a1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: makeReadableStream(sseBody),
      });

    const chunks: any[] = [];
    for await (const c of svc.sendMessage(
      'r1',
      'hello',
      new AbortController().signal,
    )) {
      chunks.push(c);
    }
    // Expected order:
    //   submitted, message(He), message(lo), message(completed), done
    const types = chunks.map((c) => `${c.type}/${c.data.status ?? '-'}`);
    expect(types).toEqual([
      'message/submitted',
      'message/streaming',
      'message/streaming',
      'message/completed',
      'done/-',
    ]);
    // Delta accumulation
    expect(chunks[1].data.delta).toBe('Hel');
    expect(chunks[2].data.delta).toBe('lo');
    expect(chunks[3].data.fullReply).toBe('Hello');
  });

  it('should ignore events for other attempt_ids', async () => {
    const sseBody =
      'id: 1\nevent: text_delta\ndata: {"attempt_id":"other","delta":"skip"}\n\n' +
      'id: 2\nevent: attempt.completed\ndata: {"attempt_id":"a1","summary":"done"}\n\n';
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ message_id: 'm1', attempt_id: 'a1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: makeReadableStream(sseBody),
      });

    const chunks: any[] = [];
    for await (const c of svc.sendMessage(
      'r1',
      'hello',
      new AbortController().signal,
    )) {
      chunks.push(c);
    }
    // First text_delta is filtered (other attempt), then attempt.completed
    expect(chunks.map((c) => c.type)).toEqual([
      'message', // submitted
      'message', // completed with fullReply
      'done',
    ]);
  });
});

function makeReadableStream(text: string) {
  const encoder = new TextEncoder();
  return {
    getReader() {
      const u8 = encoder.encode(text);
      let consumed = false;
      return {
        read() {
          if (consumed)
            return Promise.resolve({ done: true, value: undefined });
          consumed = true;
          return Promise.resolve({ done: false, value: u8 });
        },
        releaseLock() {},
      };
    },
  };
}
