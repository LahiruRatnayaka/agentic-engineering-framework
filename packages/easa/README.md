# easa

> EASA — Easy Agent System Architecture: A Minimal TypeScript Framework for Agent Systems.

This is the umbrella package that re-exports core primitives from all EASA packages. For granular, tree-shakeable imports, use the individual packages directly.

## Installation

```bash
npm install easa
# or
pnpm add easa
```

## Usage

```typescript
import { Agent } from 'easa';

const agent = new Agent({
  name: 'my-agent',
  description: 'An example agent',
});
```

## Granular Packages

For finer control, import directly from individual packages:

| Package | Import |
| --- | --- |
| [`@easa/agent`](../agent) | `import { Agent } from "@easa/agent"` |

More packages coming soon: `@easa/providers`, `@easa/tools`, `@easa/memory`, `@easa/mcp`, `@easa/telemetry`.

## License

[MIT](../../LICENSE)
