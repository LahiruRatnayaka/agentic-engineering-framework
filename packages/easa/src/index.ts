/**
 * @deprecated This package is deprecated and will be removed after 15 April 2026.
 * Please migrate to `@agentic-eng/agent` which contains all the same exports.
 *
 * Migration:
 *   npm uninstall @agentic-eng/easa
 *   npm install @agentic-eng/agent
 *
 * Then update imports:
 *   - import { Agent } from '@agentic-eng/easa';
 *   + import { Agent } from '@agentic-eng/agent';
 */

// Runtime deprecation warning
const _warn = (globalThis as unknown as { console: { warn: (...args: string[]) => void } }).console.warn;
_warn(
  '\x1b[33m[DEPRECATED]\x1b[0m @agentic-eng/easa is deprecated and will be removed after 15 April 2026. ' +
  'Please migrate to @agentic-eng/agent. See https://www.npmjs.com/package/@agentic-eng/agent'
);

// Core
export {
  Agent,
  FlatFileMemoryProvider,
  ToolRegistry,
  ConsoleEventEmitter,
  NoopEventEmitter,
  EasaError,
  ProviderError,
  AgentConfigError,
  MaxIterationsError,
  ReasoningParseError,
  ToolExecutionError,
} from '@agentic-eng/agent';
export type {
  AgentConfig,
  InvokeResult,
  LLMProvider,
  MemoryProvider,
  Tool,
  ToolInputSchema,
  ToolDefinition,
  ToolCallRequest,
  ToolResult,
  EventType,
  AgentEvent,
  AgentEventEmitter,
  Role,
  Message,
  ChatOptions,
  ChatResponse,
  ChatChunk,
  TokenUsage,
  ReasoningAction,
  LLMReasoningResponse,
  MemoryEntry,
  IterationResult,
  ReasoningTrace,
  InvokeOptions,
} from '@agentic-eng/agent';
