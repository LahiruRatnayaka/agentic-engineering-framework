# @agentic-eng/memory

> Memory implementations for [EASA](https://github.com/easa-framework/easa) — Easy Agent System Architecture.

[![npm](https://img.shields.io/npm/v/@agentic-eng/memory)](https://www.npmjs.com/package/@agentic-eng/memory)
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
| **`@agentic-eng/memory`** (this package) | Memory implementations (`FlatFileMemory`) |
| [`@agentic-eng/observability`](https://www.npmjs.com/package/@agentic-eng/observability) | Observability implementations (`ConsoleObserver`, `NoopObserver`) |

---

## What This Package Does

`@agentic-eng/memory` provides concrete implementations of the `MemoryProvider` interface from [`@agentic-eng/provider`](https://www.npmjs.com/package/@agentic-eng/provider). Memory allows the agent to **persist knowledge across invocations** — the LLM decides *when* to store information during the reasoning loop.

Currently ships:

- **`FlatFileMemory`** — persists knowledge as [KNL](https://github.com/knl-lang/knl) DATA blocks in flat files

---

## Installation

```bash
npm install @agentic-eng/memory
```

> **Prerequisite:** You also need [`@agentic-eng/agent`](https://www.npmjs.com/package/@agentic-eng/agent) to use memory with an agent.

---

## Using FlatFileMemory with the Agent

```typescript
import { Agent } from '@agentic-eng/agent';
import { FlatFileMemory } from '@agentic-eng/memory';

const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  memory: new FlatFileMemory({ directory: './agent-memory' }),
});

// The agent will now persist knowledge automatically
const result = await agent.invoke('Remember that my birthday is March 15th');
// → Stores a memory entry in ./agent-memory/assistant.memory.knl

const later = await agent.invoke('When is my birthday?');
// → Retrieves stored memories and uses them in context
```

### How It Works

Each agent gets its own `.knl` file in the specified directory:

- **`store(agentName, entry)`** — appends a KNL DATA block to `{agentName}.memory.knl`
- **`retrieve(agentName)`** — parses all KNL blocks from the file back into `MemoryEntry[]`

Memories are stored as [KNL](https://github.com/knl-lang/knl) DATA blocks:

```
<<<
KNL[DATA][1.0]:::
ID[knl:data:easa.memory:assistant:1710532800000:v1.0]:::
NS[easa.memory]:::
LABEL["User birthday"]:::
TAGS[personal,birthday]:::
ITEM["User's birthday is March 15th."] [DESC:"User birthday"]
>>>
```

---

## Building a Custom Memory Provider

Need a database, vector store, or Redis backend? Implement the `MemoryProvider` interface from [`@agentic-eng/provider`](https://www.npmjs.com/package/@agentic-eng/provider):

```typescript
import type { MemoryProvider, MemoryEntry } from '@agentic-eng/provider';

class PostgresMemory implements MemoryProvider {
  async store(agentName: string, entry: MemoryEntry): Promise<void> {
    // INSERT INTO memories (agent, label, content, tags) VALUES (...)
  }

  async retrieve(agentName: string): Promise<MemoryEntry[]> {
    // SELECT * FROM memories WHERE agent = agentName
    return rows.map(r => ({ label: r.label, content: r.content, tags: r.tags }));
  }
}

// Use it the same way
const agent = new Agent({
  name: 'assistant',
  provider: myProvider,
  memory: new PostgresMemory(),
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
@agentic-eng/memory (FlatFileMemory — implements MemoryProvider)  ← you are here
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
