/**
 * All lifecycle event types emitted by the agent.
 * Follows OTEL-like span conventions: start/end pairs for each phase.
 */
export type EventType =
  | 'agent.invoke.start'
  | 'agent.invoke.end'
  | 'agent.invoke_stream.start'
  | 'agent.invoke_stream.end'
  | 'agent.iteration.start'
  | 'agent.iteration.end'
  | 'llm.call.start'
  | 'llm.call.end'
  | 'tool.call.start'
  | 'tool.call.end'
  | 'tool.schema.inject'
  | 'tool.not_found'
  | 'memory.store'
  | 'agent.error';

/**
 * Base event structure emitted at every lifecycle point.
 * Designed to be compatible with OTEL span events.
 */
export interface AgentEvent {
  /** The event type. */
  type: EventType;

  /** ISO 8601 timestamp when the event occurred. */
  timestamp: string;

  /** Name of the agent that emitted this event. */
  agentName: string;

  /** Event-specific payload. */
  data: Record<string, unknown>;
}

/**
 * Interface for receiving agent lifecycle events.
 *
 * Consumers implement this to observe what the agent is doing.
 * Use `ConsoleObserver` from `@agentic-eng/observability` for dev/debug logging,
 * or implement your own for OTEL, Datadog, custom dashboards, etc.
 */
export interface ObservabilityProvider {
  /**
   * Called for every lifecycle event during agent execution.
   */
  emit(event: AgentEvent): void;
}
