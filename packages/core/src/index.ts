/**
 * @agentic-eng/core
 *
 * Shared types, enums, and errors for the EASA framework.
 * This package is the foundation that all other EASA packages depend on.
 */

// Types
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
} from './types';

// Errors
export {
  AgenticError,
  /** @deprecated Use `AgenticError` instead. Will be removed after 31 May 2026. */
  EasaError,
  ProviderError,
  AgentConfigError,
  MaxIterationsError,
  ReasoningParseError,
  ToolExecutionError,
} from './errors';
