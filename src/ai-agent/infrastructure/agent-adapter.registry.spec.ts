import { AgentAdapterRegistry } from './agent-adapter.registry';
import { AgentAdapter } from '../interfaces/agent-adapter.interface';

describe('AgentAdapterRegistry', () => {
  const a: AgentAdapter = {
    agentType: 'a',
    createRemoteSession: jest.fn(),
    sendMessage: jest.fn(),
    getMessages: jest.fn(),
    cancelRemoteSession: jest.fn(),
    deleteRemoteSession: jest.fn(),
  } as any;
  const b: AgentAdapter = {
    agentType: 'b',
    createRemoteSession: jest.fn(),
    sendMessage: jest.fn(),
    getMessages: jest.fn(),
    cancelRemoteSession: jest.fn(),
    deleteRemoteSession: jest.fn(),
  } as any;

  it('should list agent types', () => {
    const r = new AgentAdapterRegistry([a, b]);
    expect(r.listAgentTypes()).toEqual(['a', 'b']);
  });

  it('should get adapter by type', () => {
    const r = new AgentAdapterRegistry([a, b]);
    expect(r.get('b')).toBe(b);
  });

  it('should throw on unknown type', () => {
    const r = new AgentAdapterRegistry([a]);
    expect(() => r.get('unknown')).toThrow(/unknown agent/i);
  });
});
