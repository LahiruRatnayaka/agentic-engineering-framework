# @agentic-eng/agent

> The core agent class and reasoning loop for [EASA](https://github.com/easa-framework/easa) — Easy Agent System Architecture.

[![npm](https://img.shields.io/npm/v/@agentic-eng/agent)](https://www.npmjs.com/package/@agentic-eng/agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)

> **Beta** — API may change before 1.0. Feedback welcome!

---

## What is EASA?

EASA (Easy Agent System Architecture) is a minimal, type-safe TypeScript framework for building LLM-powered agent systems. It provides the building blocks for agents that can **reason**, **use tools**, **persist knowledge**, and **emit observable events** — all with a clean, composable API and **zero LLM lock-in**.

### How It Works

```
┌─────────────────────────────────────────────────────────┐
│                        Agent                            │
│                                                         │
│  ┌──────────┐  ┌─────────────┐  ┌───────────────────┐  │
│  │ LLM      │  │ Tool        │  │ Memory            │  │
│  │ Provider  │  │ Registry    │  │ Provider          │  │
│  │ (custom)  │  │             │  │                   │  │
│  └─────┬────┘  │ ┌─────────┐ │  │ ┌───────────────┐ │  │
│        │       │ │ Tool 1  │ │  │ │ FlatFile (KNL)│ │  │
│        │       │ │ Tool 2  │ │  │ │ or Custom     │ │  │
│        │       │ │ Tool N  │ │  │ └───────────────┘ │  │
│        │       │ └─────────┘ │  └───────────────────┘  │
│        │       └─────────────┘                          │
│        ▼                                                │
│  ┌─────────────────────────────┐   ┌────────────────┐  │
│  │     Reasoning Loop          │   │ Observability  │  │
│  │                             │──▶│ (Console/OTEL) │  │
│  │  done → return answer       │   └────────────────┘  │
│  │  continue → next iteration  │                        │
│  │  tool_call → execute tool   │                        │
│  └─────────────────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

The agent runs a **JSON-controlled reasoning loop** where the LLM decides at each step whether to return a final answer (`done`), continue thinking (`continue`), or call a tool (`tool_call`). Simple questions resolve in 1 iteration. Complex tasks iterate up to `maxIterations` (default: 5).

### EASA Package Ecosystem

EASA is modular — install only what you need:

| Package | Description |
| --- | --- |
| **`@agentic-eng/agent`** (this package) | `Agent` class, reasoning loop, and re-exports from core packages |
| [`@agentic-eng/core`](https://www.npmjs.com/package/@agentic-eng/core) | Shared types, enums, and error classes |
| [`@agentic-eng/provider`](https://www.npmjs.com/package/@agentic-eng/provider) | Interface-only contracts (`LlmProvider`, `MemoryProvider`, `ObservabilityProvider`) |
| [`@agentic-eng/tool`](https://www.npmjs.com/package/@agentic-eng/tool) | `Tool` interface and `ToolRegistry` |
| [`@agentic-eng/memory`](https://www.npmjs.com/package/@agentic-eng/memory) | Memory implementations (`FlatFileMemory`) |
| [`@agentic-eng/observability`](https://www.npmjs.com/package/@agentic-eng/observability) | Observability implementations (`ConsoleObserver`, `NoopObserver`) |

**This package** (`@agentic-eng/agent`) is the main entry point. It re-exports all types from `core`, all interfaces from `provider`, and the `ToolRegistry` from `tool` — so for most users, this is the only required install. Memory and observability implementations are optional add-ons.

---

## Installation

```bash
npm install @agentic-eng/agent

# Optional — add concrete implementations as needed:
npm install @agentic-eng/memory          # FlatFileMemory (KNL-based persistence)
npm install @agentic-eng/observability    # ConsoleObserver, NoopObserver
```

---

## Quick Start

### 1. Implement an LLM Provider

EASA ships zero LLM dependencies — you bring your own backend (OpenAI, Anthropic, local models, etc.):

```typescript
import type { LlmProvider, Message, ChatResponse, ChatChunk } from '@agentic-eng/agent';

const myProvider: LlmProvider = {
  async chat(messages: Message[]): Promise<ChatResponse> {
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
console.log(result.content);               // "Bangkok is the capital of Thailand."
console.log(result.trace.totalIterations);  // 1
```

---

## Reasoning Loop

At every step, the LLM responds with structured JSON:

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

```
User: "What is 42 × 17?"
│
├─ Iteration 1: LLM → action="tool_call" tool="calculator" input={expression:"42*17"}
│   → Execute calculator → "714"
│   → Feed result back to LLM
│
├─ Iteration 2: LLM → action="done" content="42 × 17 = 714"
│   → Return to user
```

---

## Adding Tools

Tools let the agent interact with external systems. Define tools with the `Tool` interface and group them in a `ToolRegistry` (both re-exported from `@agentic-eng/tool`):

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
1. **Every LLM call** — only tool names + descriptions are sent (~10 tokens per tool)
2. **When a tool is needed** — the full JSON Schema for that specific tool is injected on demand

This scales well even with 50+ tools registered. See [`@agentic-eng/tool`](https://www.npmjs.com/package/@agentic-eng/tool) for the full `ToolRegistry` API.

---

## Adding Memory

Memory lets the agent persist knowledge across invocations. The LLM decides *when* to store information. Install the optional memory package:

```bash
npm install @agentic-eng/memory
```

```typescript
import { FlatFileMemory } from '@agentic-eng/memory';

const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  memory: new FlatFileMemory({ directory: './agent-memory' }),
});
```

Memories are stored as [KNL](https://github.com/knl-lang/knl) DATA blocks. You can also implement your own backend (vector DB, Redis, Postgres, etc.) — see [`@agentic-eng/memory`](https://www.npmjs.com/package/@agentic-eng/memory) for details, or implement the `MemoryProvider` interface from [`@agentic-eng/provider`](https://www.npmjs.com/package/@agentic-eng/provider) directly.

---

## Adding Observability

Every lifecycle point emits a structured event, designed for OTEL integration. Install the optional observability package:

```bash
npm install @agentic-eng/observability
```

```typescript
import { ConsoleObserver } from '@agentic-eng/observability';

const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  observability: new ConsoleObserver(),
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

You can also implement your own observer for OTEL, Datadog, etc. — see [`@agentic-eng/observability`](https://www.npmjs.com/package/@agentic-eng/observability) for details, or implement the `ObservabilityProvider` interface from [`@agentic-eng/provider`](https://www.npmjs.com/package/@agentic-eng/provider) directly.

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

---

## Streaming

For conversational responses without the reasoning loop:

```typescript
for await (const chunk of agent.invokeStream('Tell me a story.')) {
  process.stdout.write(chunk.delta);
}
```

---

## Error Handling

All errors extend `EasaError` for easy catching:

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

---

## API Reference

### `AgentConfig`

```typescript
interface AgentConfig {
  name: string;                       // Required — unique agent name
  provider: LlmProvider;              // Required — your LLM backend
  description?: string;               // What this agent does
  systemPrompt?: string;              // Custom system prompt
  defaultOptions?: ChatOptions;       // Default LLM options (temperature, maxTokens, etc.)
  maxIterations?: number;             // Max reasoning iterations (default: 5)
  memory?: MemoryProvider;            // Knowledge persistence (@agentic-eng/memory)
  tools?: ToolRegistry;               // Available tools (@agentic-eng/tool)
  observability?: ObservabilityProvider; // Event observer (@agentic-eng/observability)
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

---

## Full Example

```typescript
import { Agent, ToolRegistry } from '@agentic-eng/agent';
import type { Tool, LlmProvider } from '@agentic-eng/agent';
import { FlatFileMemory } from '@agentic-eng/memory';
import { ConsoleObserver } from '@agentic-eng/observability';

// 1. Provider — bring your own LLM
const provider: LlmProvider = { /* your implementation */ };

// 2. Tools — give the agent capabilities
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

// 3. Agent — compose everything together
const agent = new Agent({
  name: 'travel-assistant',
  provider,
  systemPrompt: 'You are a helpful travel planning assistant.',
  tools,
  memory: new FlatFileMemory({ directory: './memory' }),
  observability: new ConsoleObserver(),
  maxIterations: 10,
});

// 4. Use
const result = await agent.invoke('What should I pack for Bangkok next week?');
console.log(result.content);
```

---

## Related Packages

| Package | What it provides |
| --- | --- |
| [`@agentic-eng/core`](https://www.npmjs.com/package/@agentic-eng/core) | Types and error classes (auto-included) |
| [`@agentic-eng/provider`](https://www.npmjs.com/package/@agentic-eng/provider) | `LlmProvider`, `MemoryProvider`, `ObservabilityProvider` interfaces (auto-included) |
| [`@agentic-eng/tool`](https://www.npmjs.com/package/@agentic-eng/tool) | `Tool` interface and `ToolRegistry` (auto-included) |
| [`@agentic-eng/memory`](https://www.npmjs.com/package/@agentic-eng/memory) | `FlatFileMemory` — optional, install separately |
| [`@agentic-eng/observability`](https://www.npmjs.com/package/@agentic-eng/observability) | `ConsoleObserver`, `NoopObserver` — optional, install separately |

---

## Feedback & Contact

Have questions, feedback, or ideas? We'd love to hear from you:

- **GitHub Issues:** [easa-framework/easa](https://github.com/easa-framework/easa/issues)
- **Email:** [lahirunimantha@outlook.com](mailto:lahirunimantha@outlook.com)
- **LinkedIn:** [Lahiru Nimantha](https://www.linkedin.com/in/lahirunimantha/)

## License

[MIT](../../LICENSE)
