/**
 * EASA — Easy Agent System Architecture
 *
 * Umbrella package that re-exports core primitives from all EASA packages.
 * For granular imports, use the individual packages directly (e.g. @agentic-eng/agent).
 */

// Core
export {
  Agent,
  FlatFileMemoryProvider,
  EasaError,
  ProviderError,
  AgentConfigError,
  MaxIterationsError,
  ReasoningParseError,
} from '@agentic-eng/agent';
export type {
  AgentConfig,
  InvokeResult,
  LLMProvider,
  MemoryProvider,
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
