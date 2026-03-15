/**
 * Base error class for all EASA framework errors.
 */
export class EasaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EasaError';
  }
}

/**
 * Thrown when an LLM provider encounters an error.
 */
export class ProviderError extends EasaError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Thrown when the Agent is misconfigured (e.g. missing provider).
 */
export class AgentConfigError extends EasaError {
  constructor(message: string) {
    super(message);
    this.name = 'AgentConfigError';
  }
}
