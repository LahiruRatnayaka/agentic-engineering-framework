/**
 * Supported message roles in a conversation.
 */
export type Role = 'system' | 'user' | 'assistant';

/**
 * A single message in a conversation.
 */
export interface Message {
  role: Role;
  content: string;
}

/**
 * Options that can be passed to an LLM chat call.
 */
export interface ChatOptions {
  /** Sampling temperature (0-2). Higher = more creative. */
  temperature?: number;

  /** Maximum tokens to generate in the response. */
  maxTokens?: number;

  /** Top-p nucleus sampling. */
  topP?: number;

  /** Sequences where the model should stop generating. */
  stop?: string[];
}

/**
 * Token usage statistics from an LLM response.
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Complete response from an LLM chat call.
 */
export interface ChatResponse {
  message: Message;
  usage?: TokenUsage;
}

/**
 * A single chunk from a streaming LLM response.
 */
export interface ChatChunk {
  /** The incremental text content of this chunk. */
  delta: string;

  /** Set to true when the stream is complete. */
  done: boolean;

  /** Usage stats, typically only present on the final chunk. */
  usage?: TokenUsage;
}
