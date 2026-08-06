import { VibeTradingService } from './vibe-trading.service';

describe('VibeTradingService', () => {
  const client = {
    createRemoteSession: jest.fn(),
    sendMessage: jest.fn(),
    getMessages: jest.fn(),
    cancelRemoteSession: jest.fn(),
    deleteRemoteSession: jest.fn(),
  };
  const svc = new VibeTradingService(client as any);

  it('should expose agentType vibe-trading', () => {
    expect(svc.agentType).toBe('vibe-trading');
  });

  it('should delegate createRemoteSession', async () => {
    client.createRemoteSession.mockResolvedValue({ remoteSessionId: 'r1' });
    await expect(svc.createRemoteSession()).resolves.toEqual({
      remoteSessionId: 'r1',
    });
  });
});
