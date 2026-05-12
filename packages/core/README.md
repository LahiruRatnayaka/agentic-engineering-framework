# @agentic-eng/core

> Shared types, enums, and error classes for the [Agentic Engineering Framework](https://github.com/easa-framework/easa).

[![npm](https://img.shields.io/npm/v/@agentic-eng/core)](https://www.npmjs.com/package/@agentic-eng/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)

---

## Part of the Agentic Engineering Framework

The Agentic Engineering Framework is a minimal, type-safe TypeScript framework for building LLM-powered agent systems. It provides building blocks for agents that can **reason**, **use tools**, **persist knowledge**, and **emit observable events** — with zero LLM lock-in.

| Package | Description |
| --- | --- |
| [`@agentic-eng/agent`](https://www.npmjs.com/package/@agentic-eng/agent) | `Agent` class and reasoning loop — **start here** |
| **`@agentic-eng/core`** (this package) | Shared types, enums, and error classes |
| [`@agentic-eng/provider`](https://www.npmjs.com/package/@agentic-eng/provider) | Interface-only contracts (`LlmProvider`, `MemoryProvider`, `ObservabilityProvider`) |
| [`@agentic-eng/tool`](https://www.npmjs.com/package/@agentic-eng/tool) | `Tool` interface and `ToolRegistry` |
| [`@agentic-eng/memory`](https://www.npmjs.com/package/@agentic-eng/memory) | Memory implementations (`FlatFileMemory`) |
| [`@agentic-eng/observability`](https://www.npmjs.com/package/@agentic-eng/observability) | Observability implementations (`ConsoleObserver`, `NoopObserver`) |

> **Most users don't need to install this package directly.** It is automatically included as a dependency of [`@agentic-eng/agent`](https://www.npmjs.com/package/@agentic-eng/agent), which re-exports all core types. Install `@agentic-eng/core` directly only if you are building a standalone provider or tool package that doesn't depend on `agent`.

---

## What This Package Does

`@agentic-eng/core` is the foundation layer of the Agentic Engineering Framework. It provides:

1. **All shared TypeScript types** used across every framework package
2. **All error classes** for structured error handling

Every other package depends on `core` — it is the single source of truth for the framework's type system.

---

## Installation

```bash
npm install @agentic-eng/core
```

Or, if you're using `@agentic-eng/agent`, all core types are already re-exported:

```bash
npm install @agentic-eng/agent    # includes core types automatically
```

---

## Types

All foundational types used across framework packages:

- **Message types** — `Role`, `Message`, `ChatOptions`, `Completion`, `CompletionChunk`, `TokenUsage`
- **Reasoning types** — `ReasoningAction`, `LLMReasoningResponse`, `IterationResult`, `ReasoningTrace`, `InvokeOptions`, `InvokeResult`
- **Tool types** — `ToolInputSchema`, `ToolDefinition`, `ToolCallRequest`, `ToolResult`
- **Event types** — `EventType`, `AgentEvent`
- **Memory types** — `MemoryEntry`

```typescript
import type { Message, Completion, CompletionChunk, MemoryEntry } from '@agentic-eng/core';
```

### Deprecated Type Aliases

The following types have been renamed and will be removed after **31 May 2026**:

| Old Name (deprecated) | New Name |
| --- | --- |
| `ChatResponse` | `Completion` |
| `ChatChunk` | `CompletionChunk` |

Both old and new names work today — update your code at your convenience before the removal date.

---

## Error Classes

All custom errors extend `AgenticError`, making it easy to catch any framework error:

| Error | When it's thrown |
| --- | --- |
| `AgenticError` | Base class for all framework errors |
| `ProviderError` | LLM provider call fails |
| `AgentConfigError` | Invalid agent configuration (empty name, missing provider) |
| `MaxIterationsError` | Reasoning loop exceeded `maxIterations` limit |
| `ReasoningParseError` | LLM response is not valid JSON |
| `ToolExecutionError` | A tool's `execute()` method throws |

```typescript
import { AgenticError, ProviderError, MaxIterationsError } from '@agentic-eng/core';

try {
  await agent.invoke('Complex task');
} catch (error) {
  if (error instanceof MaxIterationsError) {
    console.log(`Gave up after ${error.iterationsCompleted} iterations`);
  } else if (error instanceof AgenticError) {
    console.log('Framework error:', error.message);
  }
}
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
