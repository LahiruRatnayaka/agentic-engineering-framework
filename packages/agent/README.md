# @agentic-eng/agent

> Core agent primitives and runtime for [EASA](https://github.com/easa-framework/easa) — Easy Agent System Architecture.

[![npm](https://img.shields.io/npm/v/@agentic-eng/agent)](https://www.npmjs.com/package/@agentic-eng/agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> **Beta** — API may change before 1.0. Feedback welcome!

## Installation

```bash
npm install @agentic-eng/agent
# or
pnpm add @agentic-eng/agent
```

## Quick Start

### 1. Implement an LLM Provider

EASA ships zero LLM dependencies — you bring your own backend:

```typescript
import type { LLMProvider, Message, ChatResponse, ChatChunk } from '@agentic-eng/agent';

const myProvider: LLMProvider = {
  async chat(messages: Message[]): Promise<ChatResponse> {
    // Call OpenAI, Anthropic, local model, etc.
    const response = await callYourLLM(messages);
    return { message: { role: 'assistant', content: response.text } };
  },

  async *chatStream(messages: Message[]): AsyncIterable<ChatChunk> {
    for await (const chunk of streamYourLLM(messages)) {
      yield { delta: chunk.text, done: chunk.finished };
    }
  },
};
```

### 2. Create an Agent

```typescript
import { Agent } from '@agentic-eng/agent';

const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  systemPrompt: 'You are a helpful assistant.',
});
```

### 3. Invoke

```typescript
const result = await agent.invoke('What is the capital of Thailand?');
console.log(result.content);        // "Bangkok is the capital of Thailand."
console.log(result.trace.totalIterations); // 1
```

## Reasoning Loop

The agent uses a JSON-based reasoning loop. The LLM responds with structured JSON at every step:

```json
{
  "action": "done | continue | tool_call",
  "reasoning": "Internal chain-of-thought",
  "content": "Output for the user",
  "tool_call": { "name": "tool_name", "input": { ... } },
  "memory": { "label": "Title", "content": "Knowledge to persist" }
}
```

| Action | Behavior |
| --- | --- |
| `done` | Return final answer |
| `continue` | Next iteration with intermediate output fed back |
| `tool_call` | Execute tool, feed result back, next iteration |

Simple prompts resolve in 1 iteration. Complex tasks iterate (up to `maxIterations`, default 5) with the LLM deciding when it's done.

## Tools

```typescript
import { ToolRegistry } from '@agentic-eng/agent';
import type { Tool } from '@agentic-eng/agent';

const calculator: Tool = {
  definition: {
    name: 'calculator',
    description: 'Evaluates arithmetic expressions.',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression to evaluate' },
      },
      required: ['expression'],
    },
  },
  async execute(input) {
    const result = evaluate(input.expression as string);
    return { toolName: 'calculator', success: true, output: String(result) };
  },
};

const tools = new ToolRegistry();
tools.register(calculator);

const agent = new Agent({
  name: 'math-agent',
  provider: myProvider,
  tools,
});

const result = await agent.invoke('What is 42 × 17?');
// Agent calls calculator tool, gets 714, returns formatted answer
```

The agent uses a **hybrid schema approach** to save tokens:
1. Every LLM call sends only tool names + descriptions (~10 tokens each)
2. When a tool is needed, the full JSON Schema is injected on demand

## Memory

```typescript
import { FlatFileMemoryProvider } from '@agentic-eng/agent';

const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  memory: new FlatFileMemoryProvider('./agent-memory'),
});
```

The LLM decides when to persist knowledge. Memories are stored as [KNL](https://github.com/knl-lang/knl) DATA blocks. Implement `MemoryProvider` for custom backends (vector DB, Redis, Postgres, etc.):

```typescript
import type { MemoryProvider, MemoryEntry } from '@agentic-eng/agent';

const customMemory: MemoryProvider = {
  async store(agentName: string, entry: MemoryEntry) { /* ... */ },
  async retrieve(agentName: string): Promise<MemoryEntry[]> { /* ... */ },
};
```

## Event Emission (Observability)

OTEL-aligned lifecycle events for debugging and monitoring:

```typescript
import { ConsoleEventEmitter } from '@agentic-eng/agent';

const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  emitter: new ConsoleEventEmitter(),
});
```

Console output:

```
[EASA] 14:23:05.123Z ▶ INVOKE  agent="assistant" prompt="What is 42 × 17?"
[EASA] 14:23:05.124Z ↻ ITER    iteration=1/5
[EASA] 14:23:05.125Z → LLM     messages=3
[EASA] 14:23:05.830Z ← LLM     tokens=142
[EASA] 14:23:05.831Z ⚙ TOOL    tool="calculator"
[EASA] 14:23:05.832Z ⚙ TOOL✓   tool="calculator" success=true
[EASA] 14:23:06.201Z ✓ ITER    iteration=2 action="done"
[EASA] 14:23:06.202Z ■ INVOKE  agent="assistant" iterations=2 completed=true
```

Implement `AgentEventEmitter` for OTEL, Datadog, or any custom backend:

```typescript
import type { AgentEventEmitter, AgentEvent } from '@agentic-eng/agent';

const otelEmitter: AgentEventEmitter = {
  emit(event: AgentEvent) {
    tracer.startSpan(event.type, { attributes: event.data });
  },
};
```

### Event Types

| Event | When |
| --- | --- |
| `agent.invoke.start` / `end` | Invoke lifecycle |
| `agent.invoke_stream.start` / `end` | Stream lifecycle |
| `agent.iteration.start` / `end` | Each reasoning iteration |
| `llm.call.start` / `end` | Each LLM API call |
| `tool.call.start` / `end` | Tool execution |
| `tool.schema.inject` | Full schema injected for a tool |
| `tool.not_found` | LLM requested unknown tool |
| `memory.store` | Knowledge persisted |
| `agent.error` | Any error during execution |

## Streaming

For conversational responses without the reasoning loop:

```typescript
for await (const chunk of agent.invokeStream('Tell me a story.')) {
  process.stdout.write(chunk.delta);
}
```

## Error Handling

All errors extend `EasaError`:

```typescript
import { MaxIterationsError, ProviderError } from '@agentic-eng/agent';

try {
  await agent.invoke('Complex task');
} catch (error) {
  if (error instanceof MaxIterationsError) {
    console.log(`Gave up after ${error.iterationsCompleted} iterations`);
  } else if (error instanceof ProviderError) {
    console.log('LLM call failed:', error.cause);
  }
}
```

| Error | When |
| --- | --- |
| `AgentConfigError` | Invalid agent configuration |
| `ProviderError` | LLM provider call fails |
| `MaxIterationsError` | Reasoning loop exceeds limit |
| `ReasoningParseError` | LLM returns invalid JSON |
| `ToolExecutionError` | Tool execution fails |

## API Reference

### `AgentConfig`

```typescript
interface AgentConfig {
  name: string;                  // Required — unique agent name
  provider: LLMProvider;         // Required — your LLM backend
  description?: string;          // What this agent does
  systemPrompt?: string;         // Custom system prompt
  defaultOptions?: ChatOptions;  // Default LLM options (temperature, maxTokens, etc.)
  maxIterations?: number;        // Max reasoning iterations (default: 5)
  memory?: MemoryProvider;       // Knowledge persistence
  tools?: ToolRegistry;          // Available tools
  emitter?: AgentEventEmitter;   // Event emitter for observability
}
```

### `InvokeResult`

```typescript
interface InvokeResult {
  content: string;       // Final answer
  trace: ReasoningTrace; // Full reasoning trace (iterations, completed, totalIterations)
}
```

### `Agent` Methods

| Method | Returns | Description |
| --- | --- | --- |
| `invoke(prompt, options?)` | `Promise<InvokeResult>` | Run reasoning loop to completion |
| `invokeStream(prompt, options?)` | `AsyncIterable<ChatChunk>` | Stream a single-pass response |
| `getMessages()` | `Message[]` | Copy of conversation history |
| `clearHistory()` | `void` | Reset conversation |

## Full Example

```typescript
import {
  Agent,
  ToolRegistry,
  FlatFileMemoryProvider,
  ConsoleEventEmitter,
} from '@agentic-eng/agent';
import type { Tool, LLMProvider } from '@agentic-eng/agent';

// 1. Provider
const provider: LLMProvider = { /* your implementation */ };

// 2. Tools
const weatherTool: Tool = {
  definition: {
    name: 'weather',
    description: 'Gets current weather for a city.',
    inputSchema: {
      type: 'object',
      properties: { city: { type: 'string', description: 'City name' } },
      required: ['city'],
    },
  },
  async execute(input) {
    const data = await fetchWeather(input.city as string);
    return { toolName: 'weather', success: true, output: JSON.stringify(data) };
  },
};

const tools = new ToolRegistry();
tools.register(weatherTool);

// 3. Agent
const agent = new Agent({
  name: 'travel-assistant',
  provider,
  systemPrompt: 'You are a helpful travel planning assistant.',
  tools,
  memory: new FlatFileMemoryProvider('./memory'),
  emitter: new ConsoleEventEmitter(),
  maxIterations: 10,
});

// 4. Use
const result = await agent.invoke('What should I pack for Bangkok next week?');
console.log(result.content);
```

## License

[MIT](../../LICENSE)
