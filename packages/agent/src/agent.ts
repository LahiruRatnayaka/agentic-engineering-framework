import { AgentConfigError, ProviderError } from './errors';
import type { LLMProvider } from './provider';
import type { ChatOptions, ChatChunk, ChatResponse, Message } from './types';

export interface AgentConfig {
  /** Unique name identifying this agent. */
  name: string;

  /** Optional description of what this agent does. */
  description?: string;

  /** The LLM provider this agent uses for reasoning. */
  provider: LLMProvider;

  /** System prompt that defines the agent's behavior and personality. */
  systemPrompt?: string;

  /** Default chat options applied to every LLM call (can be overridden per-invoke). */
  defaultOptions?: ChatOptions;
}

/**
 * The result returned by `agent.invoke()`.
 */
export interface InvokeResult {
  /** The assistant's response content. */
  content: string;

  /** The full response from the provider, including usage stats. */
  response: ChatResponse;
}

/**
 * Core Agent class — the fundamental building block of EASA.
 *
 * An Agent wraps an LLM provider with conversation state, enabling
 * request/response and streaming interactions.
 *
 * @example
 * ```typescript
 * const agent = new Agent({
 *   name: 'assistant',
 *   provider: myLLMProvider,
 *   systemPrompt: 'You are a helpful assistant.',
 * });
 *
 * const result = await agent.invoke('Hello!');
 * console.log(result.content);
 *
 * for await (const chunk of agent.invokeStream('Tell me a story.')) {
 *   process.stdout.write(chunk.delta);
 * }
 * ```
 */
export class Agent {
  readonly name: string;
  readonly description?: string;

  private readonly provider: LLMProvider;
  private readonly systemPrompt?: string;
  private readonly defaultOptions?: ChatOptions;
  private messages: Message[] = [];

  constructor(config: AgentConfig) {
    if (!config.name || config.name.trim().length === 0) {
      throw new AgentConfigError('Agent name is required and cannot be empty.');
    }

    if (!config.provider) {
      throw new AgentConfigError('Agent requires an LLM provider.');
    }

    this.name = config.name;
    this.description = config.description;
    this.provider = config.provider;
    this.systemPrompt = config.systemPrompt;
    this.defaultOptions = config.defaultOptions;
  }

  /**
   * Send a prompt to the agent and receive a complete response.
   */
  async invoke(prompt: string, options?: ChatOptions): Promise<InvokeResult> {
    this.messages.push({ role: 'user', content: prompt });

    const messagesToSend = this.buildMessages();
    const mergedOptions = this.mergeOptions(options);

    let response: ChatResponse;
    try {
      response = await this.provider.chat(messagesToSend, mergedOptions);
    } catch (error) {
      throw new ProviderError('LLM provider chat call failed.', error);
    }

    this.messages.push(response.message);

    return {
      content: response.message.content,
      response,
    };
  }

  /**
   * Send a prompt to the agent and receive a streaming response.
   * Yields chunks as they arrive. The assistant's full message is
   * appended to conversation history once the stream completes.
   */
  async *invokeStream(prompt: string, options?: ChatOptions): AsyncIterable<ChatChunk> {
    this.messages.push({ role: 'user', content: prompt });

    const messagesToSend = this.buildMessages();
    const mergedOptions = this.mergeOptions(options);

    let fullContent = '';

    try {
      for await (const chunk of this.provider.chatStream(messagesToSend, mergedOptions)) {
        fullContent += chunk.delta;
        yield chunk;
      }
    } catch (error) {
      throw new ProviderError('LLM provider stream call failed.', error);
    }

    this.messages.push({ role: 'assistant', content: fullContent });
  }

  /**
   * Returns a copy of the current conversation history.
   */
  getMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Clears the conversation history.
   */
  clearHistory(): void {
    this.messages = [];
  }

  /**
   * Builds the full message array to send to the provider,
   * prepending the system prompt if configured.
   */
  private buildMessages(): Message[] {
    const messages: Message[] = [];

    if (this.systemPrompt) {
      messages.push({ role: 'system', content: this.systemPrompt });
    }

    messages.push(...this.messages);
    return messages;
  }

  /**
   * Merges per-call options with default options. Per-call options take precedence.
   */
  private mergeOptions(options?: ChatOptions): ChatOptions | undefined {
    if (!this.defaultOptions && !options) return undefined;
    return { ...this.defaultOptions, ...options };
  }
}
