# @agentic-eng/observability

Observability implementations for the [EASA](https://github.com/easa-framework/easa) framework.

## Installation

```bash
npm install @agentic-eng/observability
```

## ConsoleObserver

Logs all agent lifecycle events to the console with formatted output. Useful for development and debugging.

```typescript
import { ConsoleObserver } from '@agentic-eng/observability';

const agent = new Agent({
  name: 'my-agent',
  provider: myProvider,
  observability: new ConsoleObserver(),
});
```

Sample output:

```
[EASA] 12:34:56.789Z ▶ INVOKE agent="my-agent" prompt="What is 2+2?"
[EASA] 12:34:56.790Z ↻ ITER   iteration=1/5
[EASA] 12:34:56.791Z → LLM    messages=3
[EASA] 12:34:57.123Z ← LLM    tokens=150
[EASA] 12:34:57.124Z ✓ ITER   iteration=1 action="done"
[EASA] 12:34:57.124Z ■ INVOKE agent="my-agent" iterations=1 completed=true
```

You can customize the prefix:

```typescript
new ConsoleObserver({ prefix: '[MyApp]' });
```

## NoopObserver

Silently discards all events. Used internally when no observability provider is configured.

```typescript
import { NoopObserver } from '@agentic-eng/observability';
```

## Custom implementations

Implement the `ObservabilityProvider` interface from `@agentic-eng/provider`:

```typescript
import type { ObservabilityProvider } from '@agentic-eng/provider';

class OtelObserver implements ObservabilityProvider {
  emit(event) { /* export as OTEL span event */ }
}
```

## License

MIT — see [LICENSE](./LICENSE).

## Contact

- **GitHub Issues**: [easa-framework/easa](https://github.com/easa-framework/easa/issues)
- **npm**: [@agentic-eng/observability](https://www.npmjs.com/package/@agentic-eng/observability)
