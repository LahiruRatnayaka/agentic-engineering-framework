# EASA — Easy Agent System Architecture

> A minimal, type-safe TypeScript framework for building LLM-powered agent systems.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)

## Overview

EASA provides the fundamental building blocks for creating AI agents that can **reason**, **use tools**, **persist knowledge**, and **emit observable events** — all with a clean, composable API. It ships zero LLM dependencies: you bring your own provider.

### Key Features

- **Reasoning Loop** — JSON-controlled iteration where the LLM decides when it's done
- **Tool System** — Hybrid approach: compact tool index sent every call, full schema injected on demand
- **Memory** — Pluggable persistence via KNL (Knowledge Notation Language) flat files or custom backends
- **Event Emission** — OTEL-aligned lifecycle events for observability and debugging
- **Dual Output** — ESM + CJS with full TypeScript declarations
- **Zero LLM Lock-in** — Implement the `LlmProvider` interface for any backend
- **Modular** — Pick only the packages you need: core, provider, tool, memory, observability

## Packages

| Package | Description |
| --- | --- |
| [`@agentic-eng/core`](./packages/core) | Shared types, enums, and error classes |
| [`@agentic-eng/provider`](./packages/provider) | Interface-only contracts (LLM, Memory, Observability) |
| [`@agentic-eng/tool`](./packages/tool) | Tool interface and `ToolRegistry` |
| [`@agentic-eng/memory`](./packages/memory) | Memory implementations (`FlatFileMemory`) |
| [`@agentic-eng/observability`](./packages/observability) | Observability implementations (`ConsoleObserver`, `NoopObserver`) |
| [`@agentic-eng/agent`](./packages/agent) | Core `Agent` class and reasoning loop (re-exports from the above) |
| ~~`@agentic-eng/easa`~~ | **Deprecated** — will be removed after 15 April 2026 |

## Installation

```bash
# All-in-one (agent re-exports core types, provider interfaces, and tool registry)
npm install @agentic-eng/agent

# Optional: concrete implementations
npm install @agentic-eng/memory          # FlatFileMemory
npm install @agentic-eng/observability    # ConsoleObserver, NoopObserver

# Or pick individual packages for maximum control
npm install @agentic-eng/core @agentic-eng/provider @agentic-eng/tool
```

## Quick Start

### 1. Implement an LLM Provider

```typescript
import type { LlmProvider, Message, ChatResponse, ChatChunk } from '@agentic-eng/agent';

const myProvider: LlmProvider = {
  async chat(messages: Message[]): Promise<ChatResponse> {
    // Call your LLM (OpenAI, Anthropic, local model, etc.)
    const response = await callYourLLM(messages);
    return { message: { role: 'assistant', content: response.text } };
  },

  async *chatStream(messages: Message[]): AsyncIterable<ChatChunk> {
    // Streaming implementation
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
  systemPrompt: 'You are a helpful travel planning assistant.',
});
```

### 3. Invoke

```typescript
// Simple prompt — resolves in 1 iteration
const result = await agent.invoke('Hello!');
console.log(result.content);

// Complex prompt — may take multiple iterations
const plan = await agent.invoke('Plan a 10-day trip to Thailand');
console.log(plan.content);
console.log(`Completed in ${plan.trace.totalIterations} iterations`);
```

## How the Reasoning Loop Works

The agent instructs the LLM to respond with structured JSON at every step:

```json
{
  "action": "done | continue | tool_call",
  "reasoning": "Internal chain-of-thought",
  "content": "Output for the user",
  "tool_call": { "name": "tool_name", "input": { ... } },
  "memory": { "label": "Title", "content": "Knowledge to persist", "tags": ["tag1"] }
}
```

| Action | Behavior |
| --- | --- |
| `done` | Return final answer to caller |
| `continue` | Feed intermediate output back, next iteration |
| `tool_call` | Execute tool, feed result back, next iteration |

The loop runs up to `maxIterations` (default: 5). Simple questions resolve in 1 step. Complex tasks iterate with the LLM deciding when it's done.

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

## Tools

Tools are defined via the `Tool` interface and managed by a `ToolRegistry`. Both custom tools and MCP-sourced tools share the same interface.

### Defining a Tool

```typescript
import type { Tool } from '@agentic-eng/agent';

const calculator: Tool = {
  definition: {
    name: 'calculator',
    description: 'Evaluates arithmetic expressions.',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression' },
      },
      required: ['expression'],
    },
  },
  async execute(input) {
    const result = evaluate(input.expression as string);
    return { toolName: 'calculator', success: true, output: String(result) };
  },
};
```

### Registering Tools

```typescript
import { ToolRegistry } from '@agentic-eng/agent';

const tools = new ToolRegistry();
tools.register(calculator, weatherTool, searchTool);

const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  tools,
});
```

### Hybrid Schema Injection

To save tokens, the agent uses a **two-tier** approach:

1. **Every LLM call**: Only tool names + descriptions are sent (~10 tokens per tool)
2. **When a tool is needed**: The full JSON Schema for that specific tool is injected so the LLM can construct accurate inputs

This scales well even with 50+ tools registered.

## Memory

The agent can persist knowledge across invocations. The LLM decides *when* to store information.

### Using the Built-in Flat File Provider

```typescript
import { FlatFileMemory } from '@agentic-eng/memory';

const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  memory: new FlatFileMemory({ directory: './agent-memory' }),
});
```

Memory is stored as [KNL](https://github.com/knl-lang/knl) DATA blocks:

```
<<<
KNL[DATA][1.0]:::
ID[knl:data:easa.memory:assistant:1710532800000:v1.0]:::
NS[easa.memory]:::
LABEL["Thailand capital"]:::
TAGS[geography,thailand]:::
ITEM["Bangkok is the capital of Thailand."] [DESC:"Thailand capital"]
>>>
```

### Custom Memory Backend

Implement the `MemoryProvider` interface:

```typescript
import type { MemoryProvider, MemoryEntry } from '@agentic-eng/agent';

const vectorMemory: MemoryProvider = {
  async store(agentName: string, entry: MemoryEntry) {
    // Store in your vector DB, Redis, Postgres, etc.
  },
  async retrieve(agentName: string): Promise<MemoryEntry[]> {
    // Retrieve relevant memories
  },
};
```

## Event Emission (Observability)

Every lifecycle point emits a structured event, designed for future OTEL integration.

### Console Logging

```typescript
import { ConsoleObserver } from '@agentic-eng/observability';

const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  observability: new ConsoleObserver(),
});
```

Output:

```
[EASA] 14:23:05.123Z ▶ INVOKE  agent="assistant" prompt="What is 42 × 17?"
[EASA] 14:23:05.124Z ↻ ITER    iteration=1/5
[EASA] 14:23:05.125Z → LLM     messages=3
[EASA] 14:23:05.830Z ← LLM     tokens=142
[EASA] 14:23:05.831Z ⚙ TOOL    tool="calculator"
[EASA] 14:23:05.832Z ⚙ TOOL✓   tool="calculator" success=true
[EASA] 14:23:05.833Z ✓ ITER    iteration=1 action="tool_call"
[EASA] 14:23:06.200Z ← LLM     tokens=89
[EASA] 14:23:06.201Z ✓ ITER    iteration=2 action="done"
[EASA] 14:23:06.202Z ■ INVOKE  agent="assistant" iterations=2 completed=true
```

### Custom Observer

Implement the `ObservabilityProvider` interface for OTEL, Datadog, or any backend:

```typescript
import type { ObservabilityProvider, AgentEvent } from '@agentic-eng/provider';

const otelObserver: ObservabilityProvider = {
  emit(event: AgentEvent) {
    // Map to OTEL spans, send to collector, etc.
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

All errors extend `EasaError` for easy catching:

```typescript
import {
  EasaError,
  ProviderError,
  AgentConfigError,
  MaxIterationsError,
  ReasoningParseError,
  ToolExecutionError,
} from '@agentic-eng/agent';

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

## Full Example

```typescript
import { Agent, ToolRegistry } from '@agentic-eng/agent';
import type { Tool, LlmProvider } from '@agentic-eng/agent';
import { FlatFileMemory } from '@agentic-eng/memory';
import { ConsoleObserver } from '@agentic-eng/observability';

// 1. Provider
const provider: LlmProvider = { /* your implementation */ };

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
  memory: new FlatFileMemory({ directory: './memory' }),
  observability: new ConsoleObserver(),
  maxIterations: 10,
});

// 4. Use
const result = await agent.invoke('What should I pack for Bangkok next week?');
console.log(result.content);
```

## Architecture

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
│  │     Reasoning Loop          │   │ Event Emitter  │  │
│  │                             │──▶│ (Console/OTEL) │  │
│  │  done → return answer       │   └────────────────┘  │
│  │  continue → next iteration  │                        │
│  │  tool_call → execute tool   │                        │
│  └─────────────────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
easa/
├── packages/
│   ├── core/                    # @agentic-eng/core — types + errors
│   ├── provider/                # @agentic-eng/provider — interfaces only
│   ├── tool/                    # @agentic-eng/tool — Tool + ToolRegistry
│   ├── memory/                  # @agentic-eng/memory — FlatFileMemory
│   ├── observability/           # @agentic-eng/observability — ConsoleObserver
│   ├── agent/                   # @agentic-eng/agent — Agent class + reasoning loop
│   │   └── src/
│   │       ├── agent.ts         # Agent class + reasoning loop
│   │       ├── index.ts         # Public API (re-exports from above packages)
│   │       └── agent.test.ts    # 48 tests
│   └── easa/                    # @agentic-eng/easa (DEPRECATED)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── pnpm-workspace.yaml
```

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 9

### Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages (ESM + CJS + DTS)
pnpm test             # Run tests (48 tests)
pnpm test:watch       # Watch mode
pnpm lint             # Lint
pnpm format           # Format
```

## Roadmap

- [ ] **Memory retrieval** — Inject relevant memories into LLM context automatically
- [ ] **MCP client** — First-class support for connecting to MCP tool servers
- [ ] **OTEL exporter** — Real OpenTelemetry span export (`@agentic-eng/telemetry`)
- [ ] **Provider packages** — Pre-built providers for OpenAI, Anthropic, etc.
- [ ] **Multi-agent** — Agent-to-agent communication and delegation
- [ ] **Streaming reasoning** — Reasoning loop with streamed LLM responses

## Contributing

Contributions are welcome! Please open an issue or submit a PR.

## Feedback & Contact

Have questions, feedback, or ideas? Reach out:

- **Email:** [lahirunimantha@outlook.com](mailto:lahirunimantha@outlook.com)
- **LinkedIn:** [Lahiru Nimantha](https://www.linkedin.com/in/lahirunimantha/)

## License

[MIT](./LICENSE)
