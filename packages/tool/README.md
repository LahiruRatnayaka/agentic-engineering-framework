# @agentic-eng/tool

> Tool interface and registry for [EASA](https://github.com/easa-framework/easa) — Easy Agent System Architecture.

[![npm](https://img.shields.io/npm/v/@agentic-eng/tool)](https://www.npmjs.com/package/@agentic-eng/tool)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)

---

## Part of the EASA Framework

EASA is a minimal, type-safe TypeScript framework for building LLM-powered agent systems. It provides building blocks for agents that can **reason**, **use tools**, **persist knowledge**, and **emit observable events** — with zero LLM lock-in.

| Package | Description |
| --- | --- |
| [`@agentic-eng/agent`](https://www.npmjs.com/package/@agentic-eng/agent) | `Agent` class and reasoning loop — **start here** |
| [`@agentic-eng/core`](https://www.npmjs.com/package/@agentic-eng/core) | Shared types, enums, and error classes |
| [`@agentic-eng/provider`](https://www.npmjs.com/package/@agentic-eng/provider) | Interface-only contracts (`LlmProvider`, `MemoryProvider`, `ObservabilityProvider`) |
| **`@agentic-eng/tool`** (this package) | `Tool` interface and `ToolRegistry` |
| [`@agentic-eng/memory`](https://www.npmjs.com/package/@agentic-eng/memory) | Memory implementations (`FlatFileMemory`) |
| [`@agentic-eng/observability`](https://www.npmjs.com/package/@agentic-eng/observability) | Observability implementations (`ConsoleObserver`, `NoopObserver`) |

> **Most users don't need to install this package directly.** It is automatically included as a dependency of [`@agentic-eng/agent`](https://www.npmjs.com/package/@agentic-eng/agent), which re-exports `Tool` and `ToolRegistry`. Install `@agentic-eng/tool` directly only if you are building a standalone tool library.

---

## What This Package Does

`@agentic-eng/tool` provides two things:

1. **`Tool` interface** — defines how to describe and execute a tool
2. **`ToolRegistry` class** — manages a collection of tools and provides them to the agent

When the agent's reasoning loop returns `action: "tool_call"`, it looks up the tool in the registry, executes it, and feeds the result back to the LLM for the next iteration. The agent uses a **hybrid schema approach** to save tokens:

- **Every LLM call** — only tool names + descriptions are sent (~10 tokens per tool)
- **When a tool is needed** — the full JSON Schema for that specific tool is injected on demand

This scales well even with 50+ tools registered.

---

## Installation

```bash
npm install @agentic-eng/tool
```

Or, if you're using `@agentic-eng/agent`, `Tool` and `ToolRegistry` are already re-exported:

```bash
npm install @agentic-eng/agent    # includes tool exports automatically
```

---

## Defining a Tool

Each tool has a `definition` (name, description, JSON Schema for inputs) and an `execute` function:

```typescript
import type { Tool } from '@agentic-eng/tool';

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
```

---

## Registering Tools and Using with the Agent

Group tools in a `ToolRegistry` and pass it to the agent:

```typescript
import { ToolRegistry } from '@agentic-eng/tool';
import { Agent } from '@agentic-eng/agent';

const tools = new ToolRegistry();
tools.register(calculator, weatherTool, searchTool);

const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  tools,
});

const result = await agent.invoke('What is 42 × 17?');
// Agent calls calculator tool → gets 714 → returns "42 × 17 = 714"
```

---

## ToolRegistry API

| Method | Returns | Description |
| --- | --- | --- |
| `register(...tools)` | `void` | Register one or more tools |
| `get(name)` | `Tool \| undefined` | Get a tool by name |
| `has(name)` | `boolean` | Check if a tool exists |
| `getDefinitions()` | `ToolDefinition[]` | All registered tool definitions |
| `getCompactIndex()` | `string` | Token-efficient name + description list (sent every LLM call) |
| `getFullSchema(name)` | `string \| undefined` | Full JSON schema for a specific tool (injected on demand) |
| `size` | `number` | Number of registered tools |

---

## How It Fits Together

```
@agentic-eng/core (types + errors)
    ↑
@agentic-eng/provider (interfaces: LlmProvider, MemoryProvider, ObservabilityProvider)
    ↑
@agentic-eng/tool (Tool interface + ToolRegistry)  ← you are here
@agentic-eng/memory (FlatFileMemory — implements MemoryProvider)
@agentic-eng/observability (ConsoleObserver — implements ObservabilityProvider)
    ↑
@agentic-eng/agent (Agent class — composes everything)
```

---

## Feedback & Contact

Have questions, feedback, or ideas? We'd love to hear from you:

- **GitHub Issues:** [easa-framework/easa](https://github.com/easa-framework/easa/issues)
- **Email:** [lahirunimantha@outlook.com](mailto:lahirunimantha@outlook.com)
- **LinkedIn:** [Lahiru Nimantha](https://www.linkedin.com/in/lahirunimantha/)

## License

[MIT](./LICENSE)
