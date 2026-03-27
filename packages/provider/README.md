# @agentic-eng/provider

Interface-only contracts for LLM, Memory, and Observability providers in the [EASA](https://github.com/easa-framework/easa) framework.

This package contains **no concrete implementations** — only TypeScript interfaces. Implementations live in their respective packages (`@agentic-eng/memory`, `@agentic-eng/observability`, or your own).

## Installation

```bash
npm install @agentic-eng/provider
```

## Interfaces

### `LlmProvider`

Plug in any LLM backend (OpenAI, Anthropic, local models, etc.):

```typescript
import type { LlmProvider } from '@agentic-eng/provider';

const myProvider: LlmProvider = {
  async chat(messages, options) {
    // call your LLM API
    return { message: { role: 'assistant', content: '...' } };
  },
  async *chatStream(messages, options) {
    // yield streaming chunks
  },
};
```

### `MemoryProvider`

Persist agent knowledge across invocations:

```typescript
import type { MemoryProvider } from '@agentic-eng/provider';

const myMemory: MemoryProvider = {
  async store(agentName, entry) { /* ... */ },
  async retrieve(agentName) { /* ... */ },
};
```

### `ObservabilityProvider`

Receive lifecycle events from the agent:

```typescript
import type { ObservabilityProvider } from '@agentic-eng/provider';

const myObserver: ObservabilityProvider = {
  emit(event) { /* log, send to OTEL, etc. */ },
};
```

## License

MIT — see [LICENSE](./LICENSE).

## Contact

- **GitHub Issues**: [easa-framework/easa](https://github.com/easa-framework/easa/issues)
- **npm**: [@agentic-eng/provider](https://www.npmjs.com/package/@agentic-eng/provider)
