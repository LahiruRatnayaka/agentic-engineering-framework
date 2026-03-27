# @agentic-eng/provider

> Interface-only contracts for LLM, Memory, and Observability providers in [EASA](https://github.com/easa-framework/easa) — Easy Agent System Architecture.

[![npm](https://img.shields.io/npm/v/@agentic-eng/provider)](https://www.npmjs.com/package/@agentic-eng/provider)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)

---

## Part of the EASA Framework

EASA is a minimal, type-safe TypeScript framework for building LLM-powered agent systems. It provides building blocks for agents that can **reason**, **use tools**, **persist knowledge**, and **emit observable events** — with zero LLM lock-in.

| Package | Description |
| --- | --- |
| [`@agentic-eng/agent`](https://www.npmjs.com/package/@agentic-eng/agent) | `Agent` class and reasoning loop — **start here** |
| [`@agentic-eng/core`](https://www.npmjs.com/package/@agentic-eng/core) | Shared types, enums, and error classes |
| **`@agentic-eng/provider`** (this package) | Interface-only contracts (`LlmProvider`, `MemoryProvider`, `ObservabilityProvider`) |
| [`@agentic-eng/tool`](https://www.npmjs.com/package/@agentic-eng/tool) | `Tool` interface and `ToolRegistry` |
| [`@agentic-eng/memory`](https://www.npmjs.com/package/@agentic-eng/memory) | Memory implementations (`FlatFileMemory`) |
| [`@agentic-eng/observability`](https://www.npmjs.com/package/@agentic-eng/observability) | Observability implementations (`ConsoleObserver`, `NoopObserver`) |

> **Most users don't need to install this package directly.** It is automatically included as a dependency of [`@agentic-eng/agent`](https://www.npmjs.com/package/@agentic-eng/agent), which re-exports all provider interfaces. Install `@agentic-eng/provider` directly only if you are building a standalone implementation package.

---

## What This Package Does

`@agentic-eng/provider` defines the **interface contracts** that connect the EASA agent to external systems. It contains **no concrete implementations** — only TypeScript interfaces.

There are three provider interfaces:

| Interface | Purpose | Concrete implementations |
| --- | --- | --- |
| `LlmProvider` | Connect any LLM backend | You implement this (OpenAI, Anthropic, etc.) |
| `MemoryProvider` | Persist agent knowledge | [`FlatFileMemory`](https://www.npmjs.com/package/@agentic-eng/memory) or your own |
| `ObservabilityProvider` | Receive lifecycle events | [`ConsoleObserver`](https://www.npmjs.com/package/@agentic-eng/observability) or your own |

This separation lets you swap implementations without touching agent code.

---

## Installation

```bash
npm install @agentic-eng/provider
```

Or, if you're using `@agentic-eng/agent`, all interfaces are already re-exported:

```bash
npm install @agentic-eng/agent    # includes provider interfaces automatically
```

---

## `LlmProvider`

The core interface — connect any LLM backend to EASA. You **must** implement this to use the agent.

```typescript
import type { LlmProvider, Message, ChatOptions, ChatResponse, ChatChunk } from '@agentic-eng/provider';

const myProvider: LlmProvider = {
  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    // Call OpenAI, Anthropic, local model, etc.
    const response = await callYourLLM(messages);
    return { message: { role: 'assistant', content: response.text } };
  },

  async *chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<ChatChunk> {
    for await (const chunk of streamYourLLM(messages)) {
      yield { delta: chunk.text, done: chunk.finished };
    }
  },
};
```

Then pass it to the agent:

```typescript
import { Agent } from '@agentic-eng/agent';

const agent = new Agent({ name: 'assistant', provider: myProvider });
```

---

## `MemoryProvider`

Optional — lets the agent persist knowledge across invocations. The LLM decides *when* to store information.

```typescript
import type { MemoryProvider, MemoryEntry } from '@agentic-eng/provider';

class PostgresMemory implements MemoryProvider {
  async store(agentName: string, entry: MemoryEntry): Promise<void> {
    // INSERT INTO memories ...
  }
  async retrieve(agentName: string): Promise<MemoryEntry[]> {
    // SELECT FROM memories WHERE agent_name = ...
  }
}
```

EASA ships a built-in implementation in [`@agentic-eng/memory`](https://www.npmjs.com/package/@agentic-eng/memory) — `FlatFileMemory` persists knowledge as KNL DATA blocks in flat files.

---

## `ObservabilityProvider`

Optional — receives structured lifecycle events from the agent for logging, monitoring, or tracing.

```typescript
import type { ObservabilityProvider, AgentEvent } from '@agentic-eng/provider';

class OtelObserver implements ObservabilityProvider {
  emit(event: AgentEvent): void {
    tracer.startSpan(event.type, { attributes: event.data });
  }
}
```

EASA ships built-in implementations in [`@agentic-eng/observability`](https://www.npmjs.com/package/@agentic-eng/observability):
- **`ConsoleObserver`** — formatted console logging for development
- **`NoopObserver`** — silently discards events (used internally as default)

---

## How It Fits Together

```
@agentic-eng/core (types + errors)
    ↑
@agentic-eng/provider (interfaces: LlmProvider, MemoryProvider, ObservabilityProvider)  ← you are here
    ↑
@agentic-eng/tool (Tool interface + ToolRegistry)
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
