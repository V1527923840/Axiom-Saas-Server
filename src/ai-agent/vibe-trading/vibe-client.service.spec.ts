import { HttpException } from '@nestjs/common';
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

  // ---------------- createRemoteSession ----------------

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

  // ---------------- submitMessage (sync POST) ----------------

  it('should POST /sessions/:id/messages and return {messageId, attemptId}', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message_id: 'm1', attempt_id: 'a1' }),
    });

    const r = await svc.submitMessage(
      'r1',
      'hello',
      new AbortController().signal,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://vibe.local/sessions/r1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
        body: JSON.stringify({ content: 'hello' }),
      }),
    );
    expect(r).toEqual({ messageId: 'm1', attemptId: 'a1' });
  });

  it('should throw HttpException when submitMessage receives non-ok response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({}),
    });

    await expect(
      svc.submitMessage('r1', 'hi', new AbortController().signal),
    ).rejects.toBeInstanceOf(HttpException);
  });

  // ---------------- streamEvents (long-lived SSE) ----------------

  it('should yield parsed SSE frames from /sessions/:id/events', async () => {
    const sseBody =
      'event: message.received\ndata: {"message_id":"m1"}\n\n' +
      'event: attempt.started\ndata: {"attempt_id":"a1"}\n\n' +
      'event: text_delta\ndata: {"attempt_id":"a1","delta":"Hel"}\n\n' +
      'event: text_delta\ndata: {"attempt_id":"a1","delta":"lo"}\n\n' +
      'event: attempt.completed\ndata: {"attempt_id":"a1","summary":"Hello"}\n\n';

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      body: makeReadableStream(sseBody),
    });

    const events: { event: string; data: any }[] = [];
    for await (const e of svc.streamEvents(
      'r1',
      new AbortController().signal,
    )) {
      events.push(e);
    }

    expect(fetchMock).toHaveBeenCalledWith(
      'http://vibe.local/sessions/r1/events',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tk',
          Accept: 'text/event-stream',
        }),
      }),
    );
    expect(events.map((e) => e.event)).toEqual([
      'message.received',
      'attempt.started',
      'text_delta',
      'text_delta',
      'attempt.completed',
    ]);
    expect(events[2].data.delta).toBe('Hel');
    expect(events[4].data.summary).toBe('Hello');
  });

  it('should throw HttpException when streamEvents receives non-ok response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      body: null,
    });

    const gen = svc.streamEvents('r1', new AbortController().signal);
    await expect(gen.next()).rejects.toBeInstanceOf(HttpException);
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
