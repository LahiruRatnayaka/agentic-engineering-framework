import type { AgentEvent, ObservabilityProvider } from '@agentic-eng/provider';

/**
 * A no-op observer that discards all events.
 * Used internally when no observability provider is configured.
 */
export class NoopObserver implements ObservabilityProvider {
  emit(_event: AgentEvent): void {
    // intentionally empty
  }
}
