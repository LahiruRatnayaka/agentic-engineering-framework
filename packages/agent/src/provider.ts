import type { ChatChunk, ChatOptions, ChatResponse, Message } from './types';

/**
 * Interface that all LLM providers must implement.
 *
 * The framework does not ship any concrete provider — consumers implement
 * this interface to plug in any LLM backend (OpenAI, Anthropic, local models, etc.).
 *
 * @example
 * ```typescript
 * const myProvider: LLMProvider = {
 *   async chat(messages, options) {
 *     const res = await fetch('https://api.openai.com/v1/chat/completions', {
 *       method: 'POST',
 *       headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ model: 'gpt-4', messages, ...options }),
 *     });
 *     const json = await res.json();
 *     return { message: json.choices[0].message };
 *   },
 *   async *chatStream(messages, options) {
 *     // ... SSE streaming implementation
 *   },
 * };
 * ```
 */
export interface LLMProvider {
  /**
   * Send messages to the LLM and receive a complete response.
   */
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;

  /**
   * Send messages to the LLM and receive a streaming response.
   * Yields chunks as they arrive from the provider.
   */
  chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<ChatChunk>;
}
