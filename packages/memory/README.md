# @agentic-eng/memory

Memory implementations for the [EASA](https://github.com/easa-framework/easa) framework.

## Installation

```bash
npm install @agentic-eng/memory
```

## FlatFileMemory

Persists agent knowledge as KNL DATA blocks in flat files. Each agent gets its own `.knl` file.

```typescript
import { FlatFileMemory } from '@agentic-eng/memory';

const memory = new FlatFileMemory({ directory: './agent-memory' });

const agent = new Agent({
  name: 'my-agent',
  provider: myProvider,
  memory,
});
```

### How it works

- `store(agentName, entry)` — appends a KNL DATA block to `{agentName}.memory.knl`
- `retrieve(agentName)` — parses all KNL blocks from the file back into `MemoryEntry[]`

### Custom implementations

You can implement your own `MemoryProvider` (from `@agentic-eng/provider`) for databases, vector stores, Redis, etc.

```typescript
import type { MemoryProvider } from '@agentic-eng/provider';

class PostgresMemory implements MemoryProvider {
  async store(agentName, entry) { /* INSERT INTO ... */ }
  async retrieve(agentName) { /* SELECT FROM ... */ }
}
```

## License

MIT — see [LICENSE](./LICENSE).

## Contact

- **GitHub Issues**: [easa-framework/easa](https://github.com/easa-framework/easa/issues)
- **npm**: [@agentic-eng/memory](https://www.npmjs.com/package/@agentic-eng/memory)
