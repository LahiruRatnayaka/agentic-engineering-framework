import type { AgentEvent, EventType, ObservabilityProvider } from '@agentic-eng/provider';

/**
 * Event observer that logs events to the console.
 * Useful for development and debugging.
 *
 * @example
 * ```typescript
 * import { ConsoleObserver } from '@agentic-eng/observability';
 *
 * const agent = new Agent({
 *   name: 'my-agent',
 *   provider: myProvider,
 *   observability: new ConsoleObserver(),
 * });
 * ```
 */
export class ConsoleObserver implements ObservabilityProvider {
  private readonly prefix: string;

  constructor(options?: { prefix?: string }) {
    this.prefix = options?.prefix ?? '[AEF]';
  }

  emit(event: AgentEvent): void {
    const ts = event.timestamp.split('T')[1] ?? event.timestamp;
    const tag = this.formatType(event.type);
    const detail = this.formatData(event);

    console.log(`${this.prefix} ${ts} ${tag} ${detail}`);
  }

  private formatType(type: EventType): string {
    const tags: Record<string, string> = {
      'agent.invoke.start': 'INVOKE:START',
      'agent.invoke.end': 'INVOKE:END',
      'agent.invoke_stream.start': 'STREAM:START',
      'agent.invoke_stream.end': 'STREAM:END',
      'agent.iteration.start': 'ITER:START',
      'agent.iteration.end': 'ITER:END',
      'llm.call.start': 'LLM:START',
      'llm.call.end': 'LLM:END',
      'tool.call.start': 'TOOL:START',
      'tool.call.end': 'TOOL:END',
      'tool.schema.inject': 'TOOL:SCHEMA',
      'tool.not_found': 'TOOL:NOT_FOUND',
      'memory.store': 'MEMORY:STORE',
      'agent.error': 'ERROR',
    };
    return tags[type] ?? type;
  }

  private formatData(event: AgentEvent): string {
    const d = event.data;
    switch (event.type) {
      case 'agent.invoke.start':
        return `agent="${event.agentName}" prompt="${this.truncate(d['prompt'] as string)}"`;
      case 'agent.invoke.end':
        return `agent="${event.agentName}" iterations=${d['totalIterations']} completed=${d['completed']}`;
      case 'agent.invoke_stream.start':
        return `agent="${event.agentName}" prompt="${this.truncate(d['prompt'] as string)}"`;
      case 'agent.invoke_stream.end':
        return `agent="${event.agentName}" length=${d['contentLength']}`;
      case 'agent.iteration.start':
        return `iteration=${d['iteration']}/${d['maxIterations']}`;
      case 'agent.iteration.end':
        return `iteration=${d['iteration']} action="${d['action']}"`;
      case 'llm.call.start':
        return `messages=${d['messageCount']}`;
      case 'llm.call.end':
        return `tokens=${d['totalTokens'] ?? 'n/a'}`;
      case 'tool.call.start':
        return `tool="${d['toolName']}"`;
      case 'tool.call.end':
        return `tool="${d['toolName']}" success=${d['success']}`;
      case 'tool.schema.inject':
        return `tool="${d['toolName']}"`;
      case 'tool.not_found':
        return `tool="${d['toolName']}" available=${d['availableTools']}`;
      case 'memory.store':
        return `label="${d['label']}"`;
      case 'agent.error':
        return `error="${d['message']}"`;
      default:
        return JSON.stringify(d);
    }
  }

  private truncate(str: string | undefined, max = 80): string {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '…' : str;
  }
}
