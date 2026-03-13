# @agentic-eng/easa

> EASA — Easy Agent System Architecture: A Minimal TypeScript Framework for Agent Systems.

This is the umbrella package that re-exports core primitives from all EASA packages. For granular, tree-shakeable imports, use the individual packages directly.

## Installation

```bash
npm install @agentic-eng/easa
# or
pnpm add @agentic-eng/easa
```

## Usage

```typescript
import { Agent } from '@agentic-eng/easa';

const agent = new Agent({
  name: 'my-agent',
  description: 'An example agent',
});
```

## Granular Packages

For finer control, import directly from individual packages:

| Package | Import |
| --- | --- |
| [`@agentic-eng/agent`](../agent) | `import { Agent } from "@agentic-eng/agent"` |

More packages coming soon: `@agentic-eng/providers`, `@agentic-eng/tools`, `@agentic-eng/memory`, `@agentic-eng/mcp`, `@agentic-eng/telemetry`.

## License

[MIT](../../LICENSE)
