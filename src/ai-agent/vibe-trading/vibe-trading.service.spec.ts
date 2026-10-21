import { VibeTradingService } from './vibe-trading.service';

describe('VibeTradingService', () => {
  const client = {
    createRemoteSession: jest.fn(),
    submitMessage: jest.fn(),
    streamEvents: jest.fn(),
    getMessages: jest.fn(),
    cancelRemoteSession: jest.fn(),
    deleteRemoteSession: jest.fn(),
  };
  const svc = new VibeTradingService(client as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should expose agentType vibe-trading', () => {
    expect(svc.agentType).toBe('vibe-trading');
  });

  it('should delegate createRemoteSession', async () => {
    client.createRemoteSession.mockResolvedValue({ remoteSessionId: 'r1' });
    await expect(svc.createRemoteSession()).resolves.toEqual({
      remoteSessionId: 'r1',
    });
  });

  // ★ 2026-10-21: VibeTradingService is the adapter the registry
  // actually returns — VibeClientService is only its inner dependency.
  // Every method here must forward the caller's userId, because the vibe
  // upstream's session-ownership gate rejects any request that omits
  // `X-User-Id` with 403 "missing X-User-Id for session ... (owner=N)".
  //
  // The forwarding was added to VibeClientService but NOT to this
  // wrapper, so the identity was dropped on the floor and the SaaS UI
  // showed "Vibe get messages failed: 403" for every session.

  it('should forward userId to createRemoteSession', async () => {
    client.createRemoteSession.mockResolvedValue({ remoteSessionId: 'r1' });

    await svc.createRemoteSession(13);

    expect(client.createRemoteSession).toHaveBeenCalledWith(13);
  });

  it('should forward userId to getMessages', async () => {
    client.getMessages.mockResolvedValue([]);

    await svc.getMessages('r1', 'cur1', 13);

    expect(client.getMessages).toHaveBeenCalledWith('r1', 'cur1', 13);
  });

  it('should forward userId to cancelRemoteSession', async () => {
    await svc.cancelRemoteSession('r1', 13);

    expect(client.cancelRemoteSession).toHaveBeenCalledWith('r1', 13);
  });

  it('should forward userId to deleteRemoteSession', async () => {
    await svc.deleteRemoteSession('r1', 13);

    expect(client.deleteRemoteSession).toHaveBeenCalledWith('r1', 13);
  });

  it('should forward userId to streamEvents', async () => {
    async function* gen() {
      /* no events */
    }
    client.streamEvents.mockReturnValue(gen());

    for await (const ev of svc.streamEvents(
      'r1',
      new AbortController().signal,
      13,
    )) {
      void ev;
    }

    expect(client.streamEvents).toHaveBeenCalledWith(
      'r1',
      expect.any(AbortSignal),
      13,
    );
  });

  it('should omit userId when none is supplied', async () => {
    client.getMessages.mockResolvedValue([]);

    await svc.getMessages('r1');

    expect(client.getMessages).toHaveBeenCalledWith('r1', undefined, undefined);
  });
});
