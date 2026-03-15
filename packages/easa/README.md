# @agentic-eng/easa

> EASA — Easy Agent System Architecture: A minimal, type-safe TypeScript framework for building LLM-powered agent systems.

[![npm](https://img.shields.io/npm/v/@agentic-eng/easa)](https://www.npmjs.com/package/@agentic-eng/easa)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> **Beta** — API may change before 1.0. Feedback welcome!

This is the **umbrella package** that re-exports everything from all EASA packages in a single import. For granular, tree-shakeable imports, use [`@agentic-eng/agent`](https://www.npmjs.com/package/@agentic-eng/agent) directly.

## Installation

```bash
npm install @agentic-eng/easa
# or
pnpm add @agentic-eng/easa
```

## Quick Start

```typescript
import { Agent, ToolRegistry, FlatFileMemoryProvider, ConsoleEventEmitter } from '@agentic-eng/easa';
import type { LLMProvider, Tool } from '@agentic-eng/easa';

// 1. Bring your own LLM
const provider: LLMProvider = {
  async chat(messages) {
    const res = await callYourLLM(messages);
    return { message: { role: 'assistant', content: res.text } };
  },
  async *chatStream(messages) {
    for await (const chunk of streamYourLLM(messages)) {
      yield { delta: chunk.text, done: chunk.finished };
    }
  },
};

// 2. Define tools
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

const tools = new ToolRegistry();
tools.register(calculator);

// 3. Create an agent
const agent = new Agent({
  name: 'assistant',
  provider,
  systemPrompt: 'You are a helpful assistant.',
  tools,
  memory: new FlatFileMemoryProvider('./memory'),
  emitter: new ConsoleEventEmitter(),
  maxIterations: 10,
});

// 4. Use it
const result = await agent.invoke('What is 42 × 17?');
console.log(result.content);
console.log(`Done in ${result.trace.totalIterations} iteration(s)`);

// Or stream
for await (const chunk of agent.invokeStream('Tell me a story.')) {
  process.stdout.write(chunk.delta);
}
```

## What's Included

Everything from `@agentic-eng/agent` is re-exported:

| Export | Description |
| --- | --- |
| `Agent` | Core agent class with reasoning loop |
| `ToolRegistry` | Tool management (custom + MCP) |
| `FlatFileMemoryProvider` | File-based memory using KNL format |
| `ConsoleEventEmitter` | Pretty-printed console event logger |
| `NoopEventEmitter` | Silent emitter (default) |
| `LLMProvider` | Interface — implement for your LLM backend |
| `Tool` | Interface — implement for custom tools |
| `MemoryProvider` | Interface — implement for custom storage |
| `AgentEventEmitter` | Interface — implement for custom observability |
| Error classes | `EasaError`, `ProviderError`, `AgentConfigError`, `MaxIterationsError`, `ReasoningParseError`, `ToolExecutionError` |

## Key Features

- **Reasoning Loop** — JSON-controlled iteration: the LLM decides when it's done
- **Tool System** — Hybrid approach: compact index every call, full schema on demand
- **Memory** — Pluggable persistence (built-in KNL flat files or custom backends)
- **Event Emission** — OTEL-aligned lifecycle events at every execution point
- **Streaming** — Single-pass streaming via `invokeStream()`
- **Zero LLM Lock-in** — Bring any LLM backend via the `LLMProvider` interface
- **Dual Output** — ESM + CJS with full TypeScript declarations

## Documentation

Full documentation with detailed examples for each feature is available in the [`@agentic-eng/agent` README](https://www.npmjs.com/package/@agentic-eng/agent).

## Granular Packages

| Package | Description |
| --- | --- |
| [`@agentic-eng/agent`](https://www.npmjs.com/package/@agentic-eng/agent) | Core agent, reasoning loop, tools, memory, events |

## License

[MIT](../../LICENSE)
