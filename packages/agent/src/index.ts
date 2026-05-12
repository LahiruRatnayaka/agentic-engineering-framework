/**
 * @agentic-eng/agent
 *
 * Core agent class and orchestrator for the EASA framework.
 * This package re-exports key types from its dependencies for convenience.
 */

// Agent
export { Agent } from './agent';
export type { AgentConfig, InvokeResult } from './agent';

// Re-export from @agentic-eng/core
export type {
  Role,
  Message,
  ChatOptions,
  Completion,
  CompletionChunk,
  /** @deprecated Use `Completion` instead. Will be removed after 31 May 2026. */
  ChatResponse,
  /** @deprecated Use `CompletionChunk` instead. Will be removed after 31 May 2026. */
  ChatChunk,
  TokenUsage,
  ReasoningAction,
  LLMReasoningResponse,
  MemoryEntry,
  IterationResult,
  ReasoningTrace,
  InvokeOptions,
  ToolInputSchema,
  ToolDefinition,
  ToolCallRequest,
  ToolResult,
} from '@agentic-eng/core';

export {
  AgenticError,
  /** @deprecated Use `AgenticError` instead. Will be removed after 31 May 2026. */
  EasaError,
  ProviderError,
  AgentConfigError,
  MaxIterationsError,
  ReasoningParseError,
  ToolExecutionError,
} from '@agentic-eng/core';

// Re-export from @agentic-eng/provider
export type { LlmProvider, MemoryProvider, ObservabilityProvider, EventType, AgentEvent } from '@agentic-eng/provider';

// Re-export from @agentic-eng/tool
export type { Tool } from '@agentic-eng/tool';
export { ToolRegistry } from '@agentic-eng/tool';
