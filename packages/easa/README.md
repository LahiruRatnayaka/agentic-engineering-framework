# @lahiruratnayaka/easa

> EASA — Easy Agent System Architecture: A Minimal TypeScript Framework for Agent Systems.

This is the umbrella package that re-exports core primitives from all EASA packages. For granular, tree-shakeable imports, use the individual packages directly.

## Installation

```bash
npm install @lahiruratnayaka/easa
# or
pnpm add @lahiruratnayaka/easa
```

## Usage

```typescript
import { Agent } from '@lahiruratnayaka/easa';

const agent = new Agent({
  name: 'my-agent',
  description: 'An example agent',
});
```

## Granular Packages

For finer control, import directly from individual packages:

| Package | Import |
| --- | --- |
| [`@lahiruratnayaka/agent`](../agent) | `import { Agent } from "@lahiruratnayaka/agent"` |

More packages coming soon: `@lahiruratnayaka/providers`, `@lahiruratnayaka/tools`, `@lahiruratnayaka/memory`, `@lahiruratnayaka/mcp`, `@lahiruratnayaka/telemetry`.

## License

[MIT](../../LICENSE)
