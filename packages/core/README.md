# @agentic-eng/core

Shared types, enums, and error classes for the [EASA](https://github.com/easa-framework/easa) framework.

## Installation

```bash
npm install @agentic-eng/core
```

## What's included

### Types

All foundational types used across EASA packages:

- **Message types** — `Role`, `Message`, `ChatOptions`, `ChatResponse`, `ChatChunk`, `TokenUsage`
- **Reasoning types** — `ReasoningAction`, `LLMReasoningResponse`, `IterationResult`, `ReasoningTrace`, `InvokeOptions`
- **Tool types** — `ToolInputSchema`, `ToolDefinition`, `ToolCallRequest`, `ToolResult`
- **Memory types** — `MemoryEntry`

### Error classes

All custom errors extend `EasaError`:

- `ProviderError` — LLM provider failures
- `AgentConfigError` — invalid agent configuration
- `MaxIterationsError` — reasoning loop exceeded limit
- `ReasoningParseError` — LLM response not valid JSON
- `ToolExecutionError` — tool execution failures

## Usage

```typescript
import type { Message, ChatResponse } from '@agentic-eng/core';
import { ProviderError } from '@agentic-eng/core';
```

## License

MIT — see [LICENSE](./LICENSE).

## Contact

- **GitHub Issues**: [easa-framework/easa](https://github.com/easa-framework/easa/issues)
- **npm**: [@agentic-eng/core](https://www.npmjs.com/package/@agentic-eng/core)
