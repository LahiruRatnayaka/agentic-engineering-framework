# @agentic-eng/observability

> Observability implementations for [EASA](https://github.com/easa-framework/easa) — Easy Agent System Architecture.

[![npm](https://img.shields.io/npm/v/@agentic-eng/observability)](https://www.npmjs.com/package/@agentic-eng/observability)
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
| [`@agentic-eng/tool`](https://www.npmjs.com/package/@agentic-eng/tool) | `Tool` interface and `ToolRegistry` |
| [`@agentic-eng/memory`](https://www.npmjs.com/package/@agentic-eng/memory) | Memory implementations (`FlatFileMemory`) |
| **`@agentic-eng/observability`** (this package) | Observability implementations (`ConsoleObserver`, `NoopObserver`) |

---

## What This Package Does

`@agentic-eng/observability` provides concrete implementations of the `ObservabilityProvider` interface from [`@agentic-eng/provider`](https://www.npmjs.com/package/@agentic-eng/provider). Observability lets you **monitor every lifecycle event** in the agent — from invoke start/end to individual LLM calls, tool executions, and memory stores.

Currently ships:

- **`ConsoleObserver`** — formatted console logging for development and debugging
- **`NoopObserver`** — silently discards all events (used internally as default when no observer is configured)

---

## Installation

```bash
npm install @agentic-eng/observability
```

> **Prerequisite:** You also need [`@agentic-eng/agent`](https://www.npmjs.com/package/@agentic-eng/agent) to use observability with an agent.

---

## Using ConsoleObserver with the Agent

```typescript
import { Agent } from '@agentic-eng/agent';
import { ConsoleObserver } from '@agentic-eng/observability';

const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  observability: new ConsoleObserver(),
});

await agent.invoke('What is 42 × 17?');
```

Console output:

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

You can customize the prefix:

```typescript
new ConsoleObserver({ prefix: '[MyApp]' });
```

---

## NoopObserver

Silently discards all events. This is what the agent uses internally when no `observability` option is provided:

```typescript
import { NoopObserver } from '@agentic-eng/observability';

// These two are equivalent:
const agent1 = new Agent({ name: 'a', provider });
const agent2 = new Agent({ name: 'a', provider, observability: new NoopObserver() });
```

---

## Event Types

The agent emits these structured events through the observer:

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

## Building a Custom Observer

Need OTEL, Datadog, or a custom logging backend? Implement the `ObservabilityProvider` interface from [`@agentic-eng/provider`](https://www.npmjs.com/package/@agentic-eng/provider):

```typescript
import type { ObservabilityProvider, AgentEvent } from '@agentic-eng/provider';

class OtelObserver implements ObservabilityProvider {
  emit(event: AgentEvent): void {
    const span = tracer.startSpan(event.type);
    span.setAttributes(event.data ?? {});
    span.end();
  }
}

// Use it the same way
const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  observability: new OtelObserver(),
});
```

---

## How It Fits Together

```
@agentic-eng/core (types + errors)
    ↑
@agentic-eng/provider (interfaces: LlmProvider, MemoryProvider, ObservabilityProvider)
    ↑
@agentic-eng/tool (Tool interface + ToolRegistry)
@agentic-eng/memory (FlatFileMemory — implements MemoryProvider)
@agentic-eng/observability (ConsoleObserver — implements ObservabilityProvider)  ← you are here
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
