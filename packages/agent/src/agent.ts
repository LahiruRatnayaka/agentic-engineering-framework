export interface AgentConfig {
  /** Unique name identifying this agent. */
  name: string;

  /** Optional description of what this agent does. */
  description?: string;
}

/**
 * Core Agent class — the fundamental building block of EASA.
 */
export class Agent {
  readonly name: string;
  readonly description?: string;

  constructor(config: AgentConfig) {
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Agent name is required and cannot be empty.');
    }

    this.name = config.name;
    this.description = config.description;
  }
}
