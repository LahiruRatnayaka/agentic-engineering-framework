# @agentic-eng/agent

> Core agent primitives and runtime for EASA — Easy Agent System Architecture.

[PLEASE NOTE: This package is not yet ready for production use. It is currently in beta and may change significantly before the first stable release.]

## Installation

```bash
npm install @agentic-eng/agent
# or
pnpm add @agentic-eng/agent
```

## Usage

```typescript
import { Agent } from '@agentic-eng/agent';

const agent = new Agent({
  name: 'my-agent',
  description: 'An example agent',
});
```

## API

### `Agent`

The core agent class.

#### Constructor

```typescript
new Agent(config: AgentConfig)
```

#### `AgentConfig`

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Unique name identifying the agent |
| `description` | `string` | No | Description of what the agent does |

## License

[MIT](../../LICENSE)
