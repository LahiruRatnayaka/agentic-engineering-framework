# @agentic-eng/tool

Tool interface and registry for the [EASA](https://github.com/easa-framework/easa) framework.

## Installation

```bash
npm install @agentic-eng/tool
```

## Usage

### Defining a tool

```typescript
import type { Tool } from '@agentic-eng/tool';

const calculator: Tool = {
  definition: {
    name: 'calculator',
    description: 'Performs basic arithmetic.',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression' },
      },
      required: ['expression'],
    },
  },
  async execute(input) {
    const result = eval(input.expression as string);
    return { toolName: 'calculator', success: true, output: String(result) };
  },
};
```

### Registering tools

```typescript
import { ToolRegistry } from '@agentic-eng/tool';

const tools = new ToolRegistry();
tools.register(calculator, webSearchTool);

// Pass to the agent
const agent = new Agent({ name: 'assistant', provider, tools });
```

### ToolRegistry API

| Method | Description |
| --- | --- |
| `register(...tools)` | Register one or more tools |
| `get(name)` | Get a tool by name |
| `has(name)` | Check if a tool exists |
| `getDefinitions()` | All registered `ToolDefinition[]` |
| `getCompactIndex()` | Token-efficient name + description list |
| `getFullSchema(name)` | Full JSON schema for a specific tool |
| `size` | Number of registered tools |

## License

MIT — see [LICENSE](./LICENSE).

## Contact

- **GitHub Issues**: [easa-framework/easa](https://github.com/easa-framework/easa/issues)
- **npm**: [@agentic-eng/tool](https://www.npmjs.com/package/@agentic-eng/tool)
