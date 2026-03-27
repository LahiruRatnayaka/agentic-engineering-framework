/**
 * @agentic-eng/agent
 *
 * Core agent class and reasoning loop for the EASA framework.
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
  ChatResponse,
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
