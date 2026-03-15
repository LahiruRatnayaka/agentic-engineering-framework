import { describe, it, expect, vi } from 'vitest';

import { Agent } from './agent';
import type { AgentConfig } from './agent';
import { AgentConfigError, MaxIterationsError, ProviderError, ReasoningParseError } from './errors';
import type { MemoryProvider } from './memory';
import type { LLMProvider } from './provider';
import type { Tool } from './tool';
import { ToolRegistry } from './tool';
import type { ChatChunk, ChatResponse, LLMReasoningResponse, Message } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a JSON string matching the LLMReasoningResponse format.
 */
function reasoningJson(overrides?: Partial<LLMReasoningResponse>): string {
  const defaults: LLMReasoningResponse = {
    action: 'done',
    reasoning: 'Simple question, answering directly.',
    content: 'Hello! I am doing well, thank you.',
    ...overrides,
  };
  return JSON.stringify(defaults);
}

/**
 * Creates a mock LLM provider that returns structured reasoning JSON.
 */
function createMockProvider(overrides?: Partial<LLMProvider>): LLMProvider {
  return {
    chat: vi.fn(async (_messages: Message[]): Promise<ChatResponse> => ({
      message: { role: 'assistant', content: reasoningJson() },
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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

  describe('invoke — reasoning loop', () => {
    it('should resolve in 1 iteration when LLM returns action=done', async () => {
      const provider = createMockProvider();
      const agent = new Agent(createAgentConfig({ provider }));

      const result = await agent.invoke('Hello!');

      expect(result.content).toBe('Hello! I am doing well, thank you.');
      expect(result.trace.completed).toBe(true);
      expect(result.trace.totalIterations).toBe(1);
      expect(result.trace.iterations).toHaveLength(1);
      expect(result.trace.iterations[0]!.response.action).toBe('done');
      expect(provider.chat).toHaveBeenCalledOnce();
    });

    it('should iterate when LLM returns action=continue, then done', async () => {
      let callCount = 0;
      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => {
          callCount++;
          if (callCount === 1) {
            return {
              message: {
                role: 'assistant',
                content: reasoningJson({
                  action: 'continue',
                  reasoning: 'Need to research flight options.',
                  content: 'Looking up flights to Thailand...',
                }),
              },
            };
          }
          return {
            message: {
              role: 'assistant',
              content: reasoningJson({
                action: 'done',
                reasoning: 'Found good options.',
                content: 'Here is your 10-day Thailand itinerary.',
              }),
            },
          };
        }),
      });

      const agent = new Agent(createAgentConfig({ provider }));
      const result = await agent.invoke('Plan my trip to Thailand');

      expect(result.content).toBe('Here is your 10-day Thailand itinerary.');
      expect(result.trace.completed).toBe(true);
      expect(result.trace.totalIterations).toBe(2);
      expect(result.trace.iterations[0]!.response.action).toBe('continue');
      expect(result.trace.iterations[1]!.response.action).toBe('done');
    });

    it('should throw MaxIterationsError when loop exceeds limit', async () => {
      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => ({
          message: {
            role: 'assistant',
            content: reasoningJson({
              action: 'continue',
              reasoning: 'Still working...',
              content: 'Intermediate result.',
            }),
          },
        })),
      });

      const agent = new Agent(createAgentConfig({ provider, maxIterations: 3 }));

      await expect(agent.invoke('Complex task')).rejects.toThrow(MaxIterationsError);
      expect(provider.chat).toHaveBeenCalledTimes(3);
    });

    it('should respect per-call maxIterations override', async () => {
      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => ({
          message: {
            role: 'assistant',
            content: reasoningJson({ action: 'continue', content: 'Working...' }),
          },
        })),
      });

      const agent = new Agent(createAgentConfig({ provider, maxIterations: 10 }));

      await expect(agent.invoke('Task', { maxIterations: 2 })).rejects.toThrow(
        MaxIterationsError,
      );
      expect(provider.chat).toHaveBeenCalledTimes(2);
    });

    it('should prepend reasoning system prompt and custom system prompt', async () => {
      const provider = createMockProvider();
      const agent = new Agent(
        createAgentConfig({ provider, systemPrompt: 'You are a travel planner.' }),
      );

      await agent.invoke('Hi');

      const callArgs = vi.mocked(provider.chat).mock.calls[0]!;
      const messages = callArgs[0];
      // First message: reasoning framework prompt
      expect(messages[0]!.role).toBe('system');
      expect(messages[0]!.content).toContain('You MUST respond with valid JSON');
      // Second message: user's custom system prompt
      expect(messages[1]).toEqual({ role: 'system', content: 'You are a travel planner.' });
      // Third message: the user prompt
      expect(messages[2]).toEqual({ role: 'user', content: 'Hi' });
    });

    it('should maintain conversation history across invocations', async () => {
      const provider = createMockProvider();
      const agent = new Agent(createAgentConfig({ provider }));

      await agent.invoke('First message');
      await agent.invoke('Second message');

      const messages = agent.getMessages();
      // Each invoke: user msg + assistant content = 2 messages. Two invokes = 4.
      expect(messages).toHaveLength(4);
      expect(messages[0]!.role).toBe('user');
      expect(messages[0]!.content).toBe('First message');
      expect(messages[1]!.role).toBe('assistant');
      expect(messages[2]!.role).toBe('user');
      expect(messages[2]!.content).toBe('Second message');
      expect(messages[3]!.role).toBe('assistant');
    });

    it('should merge default options with per-call options', async () => {
      const provider = createMockProvider();
      const agent = new Agent(
        createAgentConfig({ provider, defaultOptions: { temperature: 0.5, maxTokens: 100 } }),
      );

      await agent.invoke('Hi', { temperature: 0.9 });

      const callArgs = vi.mocked(provider.chat).mock.calls[0]!;
      expect(callArgs[1]).toEqual({ temperature: 0.9, maxTokens: 100 });
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

    it('should throw ReasoningParseError for invalid JSON responses', async () => {
      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => ({
          message: { role: 'assistant', content: 'Not valid JSON at all' },
        })),
      });
      const agent = new Agent(createAgentConfig({ provider }));

      await expect(agent.invoke('Hi')).rejects.toThrow(ReasoningParseError);
    });

    it('should throw ReasoningParseError when JSON is missing required fields', async () => {
      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => ({
          message: { role: 'assistant', content: '{"foo": "bar"}' },
        })),
      });
      const agent = new Agent(createAgentConfig({ provider }));

      await expect(agent.invoke('Hi')).rejects.toThrow(
        'LLM response JSON is missing required fields',
      );
    });

    it('should handle JSON wrapped in code fences', async () => {
      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => ({
          message: {
            role: 'assistant',
            content: '```json\n' + reasoningJson({ content: 'Fenced response' }) + '\n```',
          },
        })),
      });
      const agent = new Agent(createAgentConfig({ provider }));

      const result = await agent.invoke('Hi');
      expect(result.content).toBe('Fenced response');
    });
  });

  describe('invoke — memory integration', () => {
    it('should call memory.store when LLM includes a memory entry', async () => {
      const memoryProvider: MemoryProvider = {
        store: vi.fn(async () => {}),
        retrieve: vi.fn(async () => []),
      };

      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => ({
          message: {
            role: 'assistant',
            content: reasoningJson({
              content: 'Bangkok is the capital of Thailand.',
              memory: {
                label: 'Thailand capital',
                content: 'Bangkok is the capital of Thailand.',
                tags: ['geography', 'thailand'],
              },
            }),
          },
        })),
      });

      const agent = new Agent(createAgentConfig({ provider, memory: memoryProvider }));
      await agent.invoke('What is the capital of Thailand?');

      expect(memoryProvider.store).toHaveBeenCalledOnce();
      expect(memoryProvider.store).toHaveBeenCalledWith('test-agent', {
        label: 'Thailand capital',
        content: 'Bangkok is the capital of Thailand.',
        tags: ['geography', 'thailand'],
      });
    });

    it('should not call memory.store when no memory provider is configured', async () => {
      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => ({
          message: {
            role: 'assistant',
            content: reasoningJson({
              content: 'Answer',
              memory: { label: 'test', content: 'data' },
            }),
          },
        })),
      });

      const agent = new Agent(createAgentConfig({ provider }));
      // Should not throw even though LLM returned memory
      const result = await agent.invoke('Hi');
      expect(result.content).toBe('Answer');
    });

    it('should ignore invalid memory entries gracefully', async () => {
      const memoryProvider: MemoryProvider = {
        store: vi.fn(async () => {}),
        retrieve: vi.fn(async () => []),
      };

      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => ({
          message: {
            role: 'assistant',
            content: JSON.stringify({
              action: 'done',
              reasoning: 'test',
              content: 'Answer',
              memory: { label: 123 }, // invalid: label should be string
            }),
          },
        })),
      });

      const agent = new Agent(createAgentConfig({ provider, memory: memoryProvider }));
      const result = await agent.invoke('Hi');

      expect(result.content).toBe('Answer');
      expect(memoryProvider.store).not.toHaveBeenCalled();
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

  describe('invoke — tool integration', () => {
    function createCalculatorTool(): Tool {
      return {
        definition: {
          name: 'calculator',
          description: 'Performs basic arithmetic operations.',
          inputSchema: {
            type: 'object',
            properties: {
              expression: { type: 'string', description: 'Math expression to evaluate' },
            },
            required: ['expression'],
          },
        },
        execute: vi.fn(async (input) => ({
          toolName: 'calculator',
          success: true,
          output: String(eval(input['expression'] as string)),
        })),
      };
    }

    function createWeatherTool(): Tool {
      return {
        definition: {
          name: 'weather',
          description: 'Gets current weather for a city.',
          inputSchema: {
            type: 'object',
            properties: {
              city: { type: 'string', description: 'City name' },
            },
            required: ['city'],
          },
        },
        execute: vi.fn(async (input) => ({
          toolName: 'weather',
          success: true,
          output: `Weather in ${input['city']}: 25°C, sunny`,
        })),
      };
    }

    it('should include compact tool index in system prompt when tools are registered', async () => {
      const tools = new ToolRegistry();
      tools.register(createCalculatorTool(), createWeatherTool());

      const provider = createMockProvider();
      const agent = new Agent(createAgentConfig({ provider, tools }));

      await agent.invoke('Hello');

      const callArgs = vi.mocked(provider.chat).mock.calls[0]!;
      const systemPrompt = callArgs[0][0]!.content;
      expect(systemPrompt).toContain('calculator: Performs basic arithmetic');
      expect(systemPrompt).toContain('weather: Gets current weather');
      expect(systemPrompt).toContain('tool_call');
    });

    it('should not include tool_call in system prompt when no tools registered', async () => {
      const provider = createMockProvider();
      const agent = new Agent(createAgentConfig({ provider }));

      await agent.invoke('Hello');

      const callArgs = vi.mocked(provider.chat).mock.calls[0]!;
      const systemPrompt = callArgs[0][0]!.content;
      expect(systemPrompt).not.toContain('tool_call');
    });

    it('should execute a tool when LLM returns action=tool_call with input', async () => {
      const calculator = createCalculatorTool();
      const tools = new ToolRegistry();
      tools.register(calculator);

      let callCount = 0;
      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => {
          callCount++;
          if (callCount === 1) {
            return {
              message: {
                role: 'assistant',
                content: reasoningJson({
                  action: 'tool_call',
                  reasoning: 'Need to calculate 42 * 17.',
                  content: 'Let me calculate that.',
                  tool_call: { name: 'calculator', input: { expression: '42 * 17' } },
                }),
              },
            };
          }
          return {
            message: {
              role: 'assistant',
              content: reasoningJson({
                action: 'done',
                content: '42 × 17 = 714',
              }),
            },
          };
        }),
      });

      const agent = new Agent(createAgentConfig({ provider, tools }));
      const result = await agent.invoke('What is 42 * 17?');

      expect(calculator.execute).toHaveBeenCalledOnce();
      expect(calculator.execute).toHaveBeenCalledWith({ expression: '42 * 17' });
      expect(result.content).toBe('42 × 17 = 714');
      expect(result.trace.totalIterations).toBe(2);
    });

    it('should inject full schema when LLM requests tool with empty input', async () => {
      const calculator = createCalculatorTool();
      const tools = new ToolRegistry();
      tools.register(calculator);

      let callCount = 0;
      const provider = createMockProvider({
        chat: vi.fn(async (messages: Message[]): Promise<ChatResponse> => {
          callCount++;
          if (callCount === 1) {
            // LLM requests calculator but with empty input
            return {
              message: {
                role: 'assistant',
                content: reasoningJson({
                  action: 'tool_call',
                  reasoning: 'Need calculator.',
                  content: 'Using calculator.',
                  tool_call: { name: 'calculator', input: {} },
                }),
              },
            };
          }
          if (callCount === 2) {
            // Should have received full schema — check that it appears somewhere in messages
            const schemaMsg = messages.find((m) => m.content.includes('inputSchema'));
            expect(schemaMsg).toBeDefined();
            expect(schemaMsg!.content).toContain('calculator');
            return {
              message: {
                role: 'assistant',
                content: reasoningJson({
                  action: 'tool_call',
                  reasoning: 'Now I have the schema.',
                  content: 'Calculating.',
                  tool_call: { name: 'calculator', input: { expression: '2 + 2' } },
                }),
              },
            };
          }
          return {
            message: {
              role: 'assistant',
              content: reasoningJson({ action: 'done', content: '2 + 2 = 4' }),
            },
          };
        }),
      });

      const agent = new Agent(createAgentConfig({ provider, tools, maxIterations: 5 }));
      const result = await agent.invoke('What is 2+2?');

      expect(result.content).toBe('2 + 2 = 4');
      expect(calculator.execute).toHaveBeenCalledOnce();
    });

    it('should handle tool not found gracefully', async () => {
      const tools = new ToolRegistry();
      tools.register(createCalculatorTool());

      let callCount = 0;
      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => {
          callCount++;
          if (callCount === 1) {
            return {
              message: {
                role: 'assistant',
                content: reasoningJson({
                  action: 'tool_call',
                  reasoning: 'Need web search.',
                  content: 'Searching...',
                  tool_call: { name: 'web_search', input: { query: 'hello' } },
                }),
              },
            };
          }
          return {
            message: {
              role: 'assistant',
              content: reasoningJson({
                action: 'done',
                content: 'I could not search the web, but here is my best answer.',
              }),
            },
          };
        }),
      });

      const agent = new Agent(createAgentConfig({ provider, tools }));
      const result = await agent.invoke('Search for hello');

      expect(result.content).toBe('I could not search the web, but here is my best answer.');
    });

    it('should handle tool execution errors gracefully', async () => {
      const failingTool: Tool = {
        definition: {
          name: 'failing_tool',
          description: 'A tool that always fails.',
          inputSchema: { type: 'object', properties: {} },
        },
        execute: vi.fn(async () => {
          throw new Error('Tool crashed!');
        }),
      };

      const tools = new ToolRegistry();
      tools.register(failingTool);

      let callCount = 0;
      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => {
          callCount++;
          if (callCount === 1) {
            return {
              message: {
                role: 'assistant',
                content: reasoningJson({
                  action: 'tool_call',
                  reasoning: 'Using failing tool.',
                  content: 'Running tool.',
                  tool_call: { name: 'failing_tool', input: { any: 'thing' } },
                }),
              },
            };
          }
          return {
            message: {
              role: 'assistant',
              content: reasoningJson({
                action: 'done',
                content: 'The tool failed, but I can still answer.',
              }),
            },
          };
        }),
      });

      const agent = new Agent(createAgentConfig({ provider, tools }));
      const result = await agent.invoke('Use the tool');

      expect(failingTool.execute).toHaveBeenCalledOnce();
      expect(result.content).toBe('The tool failed, but I can still answer.');

      // Verify the error was fed back to the LLM
      const secondCallMessages = vi.mocked(provider.chat).mock.calls[1]![0];
      const toolResultMsg = secondCallMessages.find((m) => m.content.includes('Tool crashed'));
      expect(toolResultMsg).toBeDefined();
    });

    it('should feed tool result back to LLM as context', async () => {
      const weather = createWeatherTool();
      const tools = new ToolRegistry();
      tools.register(weather);

      let callCount = 0;
      const provider = createMockProvider({
        chat: vi.fn(async (): Promise<ChatResponse> => {
          callCount++;
          if (callCount === 1) {
            return {
              message: {
                role: 'assistant',
                content: reasoningJson({
                  action: 'tool_call',
                  reasoning: 'Need weather data.',
                  content: 'Checking weather.',
                  tool_call: { name: 'weather', input: { city: 'Bangkok' } },
                }),
              },
            };
          }
          return {
            message: {
              role: 'assistant',
              content: reasoningJson({
                action: 'done',
                content: 'Bangkok is 25°C and sunny!',
              }),
            },
          };
        }),
      });

      const agent = new Agent(createAgentConfig({ provider, tools }));
      const result = await agent.invoke('What is the weather in Bangkok?');

      expect(result.content).toBe('Bangkok is 25°C and sunny!');

      // Verify tool result was passed to LLM
      const secondCallMessages = vi.mocked(provider.chat).mock.calls[1]![0];
      const toolResultMsg = secondCallMessages.find((m) =>
        m.content.includes('Weather in Bangkok'),
      );
      expect(toolResultMsg).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// ToolRegistry unit tests
// ---------------------------------------------------------------------------

describe('ToolRegistry', () => {
  function makeTool(name: string, desc: string): Tool {
    return {
      definition: {
        name,
        description: desc,
        inputSchema: {
          type: 'object',
          properties: {
            arg: { type: 'string', description: 'An argument' },
          },
          required: ['arg'],
        },
      },
      execute: vi.fn(async () => ({
        toolName: name,
        success: true,
        output: 'ok',
      })),
    };
  }

  it('should register and retrieve tools', () => {
    const registry = new ToolRegistry();
    const tool = makeTool('test', 'A test tool');
    registry.register(tool);

    expect(registry.has('test')).toBe(true);
    expect(registry.get('test')).toBe(tool);
    expect(registry.size).toBe(1);
  });

  it('should return undefined for unregistered tools', () => {
    const registry = new ToolRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('should register multiple tools at once', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('a', 'Tool A'), makeTool('b', 'Tool B'));
    expect(registry.size).toBe(2);
  });

  it('should return all definitions', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('a', 'Tool A'), makeTool('b', 'Tool B'));

    const defs = registry.getDefinitions();
    expect(defs).toHaveLength(2);
    expect(defs.map((d) => d.name).sort()).toEqual(['a', 'b']);
  });

  it('should return compact index', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool('calc', 'Calculator'), makeTool('search', 'Web search'));

    const index = registry.getCompactIndex();
    expect(index).toContain('- calc: Calculator');
    expect(index).toContain('- search: Web search');
  });

  it('should return empty string for compact index with no tools', () => {
    const registry = new ToolRegistry();
    expect(registry.getCompactIndex()).toBe('');
  });

  it('should return full schema as JSON string', () => {
    const registry = new ToolRegistry();
    const tool = makeTool('test', 'A test');
    registry.register(tool);

    const schema = registry.getFullSchema('test');
    expect(schema).toBeDefined();

    const parsed = JSON.parse(schema!);
    expect(parsed.name).toBe('test');
    expect(parsed.description).toBe('A test');
    expect(parsed.inputSchema).toBeDefined();
    expect(parsed.inputSchema.properties.arg).toBeDefined();
  });

  it('should return undefined for full schema of unregistered tool', () => {
    const registry = new ToolRegistry();
    expect(registry.getFullSchema('nonexistent')).toBeUndefined();
  });
});
