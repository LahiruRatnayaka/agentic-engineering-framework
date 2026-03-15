import { describe, it, expect, vi } from 'vitest';

import { Agent } from './agent';
import type { AgentConfig } from './agent';
import { AgentConfigError, ProviderError } from './errors';
import type { LLMProvider } from './provider';
import type { ChatChunk, ChatResponse, Message } from './types';

/**
 * Creates a mock LLM provider for testing.
 */
function createMockProvider(overrides?: Partial<LLMProvider>): LLMProvider {
  return {
    chat: vi.fn(async (_messages: Message[]): Promise<ChatResponse> => ({
      message: { role: 'assistant', content: 'Hello from mock!' },
    })),
    chatStream: vi.fn(async function* (_messages: Message[]): AsyncIterable<ChatChunk> {
      yield { delta: 'Hello ', done: false };
      yield { delta: 'from ', done: false };
      yield { delta: 'stream!', done: true };
    }),
    ...overrides,
  };
}

function createAgentConfig(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    name: 'test-agent',
    provider: createMockProvider(),
    ...overrides,
  };
}

describe('Agent', () => {
  describe('constructor', () => {
    it('should create an agent with name and provider', () => {
      const agent = new Agent(createAgentConfig());
      expect(agent.name).toBe('test-agent');
    });

    it('should create an agent with name, description, and provider', () => {
      const agent = new Agent(createAgentConfig({ description: 'A test agent' }));
      expect(agent.name).toBe('test-agent');
      expect(agent.description).toBe('A test agent');
    });

    it('should throw AgentConfigError if name is empty', () => {
      expect(() => new Agent(createAgentConfig({ name: '' }))).toThrow(AgentConfigError);
      expect(() => new Agent(createAgentConfig({ name: '' }))).toThrow(
        'Agent name is required and cannot be empty.',
      );
    });

    it('should throw AgentConfigError if name is whitespace only', () => {
      expect(() => new Agent(createAgentConfig({ name: '   ' }))).toThrow(AgentConfigError);
    });

    it('should throw AgentConfigError if provider is missing', () => {
      expect(
        () => new Agent({ name: 'test', provider: undefined as unknown as LLMProvider }),
      ).toThrow('Agent requires an LLM provider.');
    });
  });

  describe('invoke', () => {
    it('should call provider.chat and return content', async () => {
      const provider = createMockProvider();
      const agent = new Agent(createAgentConfig({ provider }));

      const result = await agent.invoke('Hello!');

      expect(result.content).toBe('Hello from mock!');
      expect(result.response.message.role).toBe('assistant');
      expect(provider.chat).toHaveBeenCalledOnce();
    });

    it('should prepend system prompt to messages', async () => {
      const provider = createMockProvider();
      const agent = new Agent(
        createAgentConfig({ provider, systemPrompt: 'You are helpful.' }),
      );

      await agent.invoke('Hi');

      const callArgs = vi.mocked(provider.chat).mock.calls[0];
      const messages = callArgs![0];
      expect(messages[0]).toEqual({ role: 'system', content: 'You are helpful.' });
      expect(messages[1]).toEqual({ role: 'user', content: 'Hi' });
    });

    it('should maintain conversation history across invocations', async () => {
      const provider = createMockProvider();
      const agent = new Agent(createAgentConfig({ provider }));

      await agent.invoke('First message');
      await agent.invoke('Second message');

      const messages = agent.getMessages();
      expect(messages).toHaveLength(4);
      expect(messages[0]).toEqual({ role: 'user', content: 'First message' });
      expect(messages[1]).toEqual({ role: 'assistant', content: 'Hello from mock!' });
      expect(messages[2]).toEqual({ role: 'user', content: 'Second message' });
      expect(messages[3]).toEqual({ role: 'assistant', content: 'Hello from mock!' });
    });

    it('should merge default options with per-call options', async () => {
      const provider = createMockProvider();
      const agent = new Agent(
        createAgentConfig({ provider, defaultOptions: { temperature: 0.5, maxTokens: 100 } }),
      );

      await agent.invoke('Hi', { temperature: 0.9 });

      const callArgs = vi.mocked(provider.chat).mock.calls[0];
      expect(callArgs![1]).toEqual({ temperature: 0.9, maxTokens: 100 });
    });

    it('should wrap provider errors in ProviderError', async () => {
      const provider = createMockProvider({
        chat: vi.fn(async () => {
          throw new Error('Network error');
        }),
      });
      const agent = new Agent(createAgentConfig({ provider }));

      await expect(agent.invoke('Hi')).rejects.toThrow(ProviderError);
      await expect(agent.invoke('Hi')).rejects.toThrow('LLM provider chat call failed.');
    });
  });

  describe('invokeStream', () => {
    it('should yield chunks from provider.chatStream', async () => {
      const agent = new Agent(createAgentConfig());

      const chunks: ChatChunk[] = [];
      for await (const chunk of agent.invokeStream('Hello!')) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]!.delta).toBe('Hello ');
      expect(chunks[1]!.delta).toBe('from ');
      expect(chunks[2]!.delta).toBe('stream!');
    });

    it('should append full assembled message to history after stream completes', async () => {
      const agent = new Agent(createAgentConfig());

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of agent.invokeStream('Hello!')) {
        // consume stream
      }

      const messages = agent.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({ role: 'user', content: 'Hello!' });
      expect(messages[1]).toEqual({ role: 'assistant', content: 'Hello from stream!' });
    });

    it('should wrap provider stream errors in ProviderError', async () => {
      const provider = createMockProvider({
        chatStream: vi.fn(async function* () {
          yield { delta: 'partial', done: false };
          throw new Error('Stream broke');
        }),
      });
      const agent = new Agent(createAgentConfig({ provider }));

      const chunks: ChatChunk[] = [];
      await expect(async () => {
        for await (const chunk of agent.invokeStream('Hi')) {
          chunks.push(chunk);
        }
      }).rejects.toThrow(ProviderError);

      expect(chunks).toHaveLength(1);
    });
  });

  describe('conversation management', () => {
    it('getMessages should return a copy, not the internal array', async () => {
      const agent = new Agent(createAgentConfig());
      await agent.invoke('Hello');

      const messages = agent.getMessages();
      messages.push({ role: 'user', content: 'injected' });

      expect(agent.getMessages()).toHaveLength(2);
    });

    it('clearHistory should reset conversation', async () => {
      const agent = new Agent(createAgentConfig());
      await agent.invoke('Hello');
      expect(agent.getMessages()).toHaveLength(2);

      agent.clearHistory();
      expect(agent.getMessages()).toHaveLength(0);
    });
  });
});
