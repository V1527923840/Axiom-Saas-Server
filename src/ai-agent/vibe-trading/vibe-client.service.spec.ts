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

  it('should forward the caller userId as X-User-Id when creating a session', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ session_id: 'r1' }),
    });

    await svc.createRemoteSession(13);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://vibe.local/sessions',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-User-Id': '13' }),
      }),
    );
  });

  it('should include user_id in the create body so vibe can pin the owner', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ session_id: 'r1' }),
    });

    await svc.createRemoteSession(13);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toMatchObject({ user_id: 13 });
  });

  it('should omit user identity entirely when no userId is supplied', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ session_id: 'r1' }),
    });

    await svc.createRemoteSession();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers).not.toHaveProperty('X-User-Id');
    expect(JSON.parse(init.body)).not.toHaveProperty('user_id');
  });

  it('should stringify a numeric-string userId for the header', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ session_id: 'r1' }),
    });

    await svc.createRemoteSession('13');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['X-User-Id']).toBe('13');
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
      [], // ★ Skill Plaza: empty skills (no plaza injection)
      42, // ★ User-scope: forwarded so vibe can apply per-user skill injection
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://vibe.local/sessions/r1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
        body: JSON.stringify({
          content: 'hello',
          skills: [],
          _saas_user_id: 42,
        }),
      }),
    );
    expect(r).toEqual({ messageId: 'm1', attemptId: 'a1' });
  });

  // ★ Skill Plaza: when caller passes skills, they must be forwarded
  // verbatim in the body so VibeTrading can inject LoadSkill*Tool into
  // the agent ToolRegistry.
  it('should forward resolved skills in POST body (Skill Plaza injection)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message_id: 'm1', attempt_id: 'a1' }),
    });

    await svc.submitMessage(
      'r1',
      'hi',
      new AbortController().signal,
      [{ id: 'skill-A' }, { id: 'skill-B' }],
      42,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://vibe.local/sessions/r1/messages',
      expect.objectContaining({
        body: JSON.stringify({
          content: 'hi',
          skills: [{ id: 'skill-A' }, { id: 'skill-B' }],
          _saas_user_id: 42,
        }),
      }),
    );
  });

  // ★ User-scope: when caller passes userId, it must be forwarded both as the
  // X-User-Id header (String() normalized; matches vibe `sessions_routes.py:633`
  // Header alias and the Vibe→SaaS internal API convention in
  // `skill_internal_api.py:77`) and the _saas_user_id body field so vibe can
  // apply user-scoped skill injection.
  it('should forward X-User-Id header and _saas_user_id body field', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message_id: 'm1', attempt_id: 'a1' }),
    });

    await svc.submitMessage(
      'r1',
      'hi',
      new AbortController().signal,
      [],
      42, // number — verifies String() normalization in header
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://vibe.local/sessions/r1/messages',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tk',
          'X-User-Id': '42',
        }),
        body: JSON.stringify({
          content: 'hi',
          skills: [],
          _saas_user_id: 42,
        }),
      }),
    );
  });

  it('should throw HttpException when submitMessage receives non-ok response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({}),
    });

    await expect(
      svc.submitMessage('r1', 'hi', new AbortController().signal, [], 42),
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

  // ---------------- new methods (upload, goal, swarm) ----------------

  describe('new methods', () => {
    // ---------------- uploadFile ----------------

    it('should POST /upload as multipart/form-data and return {status, file_path, filename}', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: 'ok',
            file_path: '/uploads/abc.pdf',
            filename: 'abc.pdf',
          }),
      });

      const buf = Buffer.from('pdf-bytes');
      const r = await svc.uploadFile(buf, 'abc.pdf', 'application/pdf');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://vibe.local/upload',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer tk',
          }),
          body: expect.any(FormData),
        }),
      );
      // We must NOT set Content-Type manually here — fetch auto-generates
      // the proper `multipart/form-data; boundary=...` header when body is FormData.
      // A manually-set Content-Type (without the boundary parameter) breaks
      // upstream multipart parsing.
      const callArgs = fetchMock.mock.calls[0][1];
      expect(callArgs.headers['Content-Type']).toBeUndefined();
      expect(r).toEqual({
        status: 'ok',
        file_path: '/uploads/abc.pdf',
        filename: 'abc.pdf',
      });
    });

    // ---------------- createGoal ----------------

    it('should POST /sessions/:id/goal with goal body and return vibe response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ goal_id: 'g1', status: 'active' }),
      });

      const body = {
        objective: 'reach 20% portfolio growth',
        criteria: ['sharpe > 1.5'],
        risk_tier: 'medium',
      };
      const r = await svc.createGoal('r1', body);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://vibe.local/sessions/r1/goal',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer tk',
          }),
          body: JSON.stringify(body),
        }),
      );
      expect(r).toEqual({ goal_id: 'g1', status: 'active' });
    });

    // ---------------- getGoal ----------------

    it('should GET /sessions/:id/goal and return vibe response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ goal_id: 'g1', status: 'active' }),
      });

      const r = await svc.getGoal('r1');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://vibe.local/sessions/r1/goal',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
        }),
      );
      expect(r).toEqual({ goal_id: 'g1', status: 'active' });
    });

    it('should return null when getGoal receives 404', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      });

      await expect(svc.getGoal('r1')).resolves.toBeNull();
    });

    // ---------------- updateGoal ----------------

    it('should PATCH /sessions/:id/goal with update body and return vibe response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ goal_id: 'g1', status: 'updated' }),
      });

      const body = {
        goal_id: 'g1',
        expected_goal_id: 'g1',
        ui_summary: 'new summary',
      };
      const r = await svc.updateGoal('r1', body);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://vibe.local/sessions/r1/goal',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
          body: JSON.stringify(body),
        }),
      );
      expect(r).toEqual({ goal_id: 'g1', status: 'updated' });
    });

    // ---------------- addGoalEvidence ----------------

    it('should POST /sessions/:id/goal/evidence with body and return vibe response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'accepted' }),
      });

      const body = { goal_id: 'g1', evidence: 'metric improvement' };
      const r = await svc.addGoalEvidence('r1', body);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://vibe.local/sessions/r1/goal/evidence',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
          body: JSON.stringify(body),
        }),
      );
      expect(r).toEqual({ status: 'accepted' });
    });

    // ---------------- updateGoalStatus ----------------

    it('should PATCH /sessions/:id/goal/status with status body and return vibe response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'achieved' }),
      });

      const body = {
        goal_id: 'g1',
        expected_goal_id: 'g1',
        status: 'achieved',
        recap: 'goal met',
      };
      const r = await svc.updateGoalStatus('r1', body);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://vibe.local/sessions/r1/goal/status',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
          body: JSON.stringify(body),
        }),
      );
      expect(r).toEqual({ status: 'achieved' });
    });

    // ---------------- listSwarmPresets ----------------

    it('should GET /swarm/presets and return vibe response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            presets: [{ name: 'momentum', label: 'Momentum' }],
          }),
      });

      const r = await svc.listSwarmPresets();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://vibe.local/swarm/presets',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
        }),
      );
      expect(r).toEqual({ presets: [{ name: 'momentum', label: 'Momentum' }] });
    });

    // ---------------- createSwarmRun ----------------

    it('should POST /swarm/runs with preset_name and user_vars, returning {id,status,preset_name}', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'run-1',
            status: 'queued',
            preset_name: 'momentum',
          }),
      });

      const r = await svc.createSwarmRun('momentum', { universe: 'US' });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://vibe.local/swarm/runs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
          body: JSON.stringify({
            preset_name: 'momentum',
            user_vars: { universe: 'US' },
          }),
        }),
      );
      expect(r).toEqual({
        id: 'run-1',
        status: 'queued',
        preset_name: 'momentum',
      });
    });

    // ---------------- listSwarmRuns ----------------

    it('should GET /swarm/runs with limit query param and return vibe response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ runs: [{ id: 'run-1' }] }),
      });

      const r = await svc.listSwarmRuns(25);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://vibe.local/swarm/runs?limit=25',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
        }),
      );
      expect(r).toEqual({ runs: [{ id: 'run-1' }] });
    });

    // ---------------- getSwarmRun ----------------

    it('should GET /swarm/runs/:id and return vibe response', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'run-1',
            status: 'queued',
            preset_name: 'momentum',
          }),
      });

      const r = await svc.getSwarmRun('run-1');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://vibe.local/swarm/runs/run-1',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
        }),
      );
      expect(r).toEqual({
        id: 'run-1',
        status: 'queued',
        preset_name: 'momentum',
      });
    });

    // ---------------- cancelSwarmRun ----------------

    it('should POST /swarm/runs/:id/cancel and return {status}', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'cancelled' }),
      });

      const r = await svc.cancelSwarmRun('run-1');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://vibe.local/swarm/runs/run-1/cancel',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
        }),
      );
      expect(r).toEqual({ status: 'cancelled' });
    });

    // ---------------- retrySwarmRun ----------------

    it('should POST /swarm/runs/:id/retry and return {id,status,preset_name}', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'run-2',
            status: 'queued',
            preset_name: 'momentum',
          }),
      });

      const r = await svc.retrySwarmRun('run-1');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://vibe.local/swarm/runs/run-1/retry',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer tk' }),
        }),
      );
      expect(r).toEqual({
        id: 'run-2',
        status: 'queued',
        preset_name: 'momentum',
      });
    });
  });

  // ---------------- X-User-Id on every session-scoped call ----------------
  //
  // Regression (2026-10-21): vibe's session-ownership gate rejects any
  // request that omits `X-User-Id` with 403 "missing X-User-Id for session
  // ... (owner=N)". Only `submitMessage` forwarded the caller identity, so
  // the other session-scoped calls (GET messages, cancel, delete, upload,
  // the 5 goal routes, the event stream) were all rejected → the SaaS
  // surfaced them as 502 "Vibe get messages failed: 403".
  //
  // The vibe log's `owner_user_id: "13"` confirmed the owner WAS pinned
  // correctly — the identity just never reached the read paths.

  const SESSION_SCOPED_CALLS: Array<{
    name: string;
    invoke: (id: number | string) => Promise<unknown>;
    method: string;
    urlPart: string;
  }> = [
    {
      name: 'getMessages',
      method: 'GET',
      urlPart: '/sessions/r1/messages',
      invoke: (id) => svc.getMessages('r1', undefined, id),
    },
    {
      name: 'cancelRemoteSession',
      method: 'POST',
      urlPart: '/sessions/r1/cancel',
      invoke: (id) => svc.cancelRemoteSession('r1', id),
    },
    {
      name: 'deleteRemoteSession',
      method: 'DELETE',
      urlPart: '/sessions/r1',
      invoke: (id) => svc.deleteRemoteSession('r1', id),
    },
    {
      name: 'createGoal',
      method: 'POST',
      urlPart: '/sessions/r1/goal',
      invoke: (id) => svc.createGoal('r1', { objective: 'o' }, id),
    },
    {
      name: 'getGoal',
      method: 'GET',
      urlPart: '/sessions/r1/goal',
      invoke: (id) => svc.getGoal('r1', id),
    },
    {
      name: 'updateGoal',
      method: 'PATCH',
      urlPart: '/sessions/r1/goal',
      invoke: (id) =>
        svc.updateGoal(
          'r1',
          { goal_id: 'g1', expected_goal_id: 'g1', objective: 'o' },
          id,
        ),
    },
    {
      name: 'addGoalEvidence',
      method: 'POST',
      urlPart: '/sessions/r1/goal/evidence',
      invoke: (id) =>
        svc.addGoalEvidence(
          'r1',
          { goal_id: 'g1', expected_goal_id: 'g1', text: 't' },
          id,
        ),
    },
    {
      name: 'updateGoalStatus',
      method: 'PATCH',
      urlPart: '/sessions/r1/goal/status',
      invoke: (id) =>
        svc.updateGoalStatus(
          'r1',
          {
            goal_id: 'g1',
            expected_goal_id: 'g1',
            status: 'complete',
          },
          id,
        ),
    },
  ];

  describe('X-User-Id propagation on session-scoped calls', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
    });

    it.each(SESSION_SCOPED_CALLS)(
      'should forward X-User-Id for $name',
      async ({ invoke, method, urlPart }) => {
        await invoke(13);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toContain(urlPart);
        // fetch() defaults to GET when `method` is omitted, so accept
        // either the explicit verb or an absent one for GET calls.
        if (init.method !== undefined) {
          expect(init.method).toBe(method);
        } else {
          expect(method).toBe('GET');
        }
        expect(init.headers['X-User-Id']).toBe('13');
      },
    );

    it('should forward X-User-Id for uploadFile', async () => {
      await svc.uploadFile(Buffer.from('x'), 'a.txt', 'text/plain', 13);

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers['X-User-Id']).toBe('13');
    });

    it('should forward X-User-Id for streamEvents', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        body: makeReadableStream(''),
      });

      // Drain the generator so the fetch actually happens.
      const events = svc.streamEvents('r1', new AbortController().signal, 13);
      await events.next();

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers['X-User-Id']).toBe('13');
    });

    it('should omit X-User-Id when no userId is supplied', async () => {
      await svc.getMessages('r1', undefined);

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers).not.toHaveProperty('X-User-Id');
    });
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
