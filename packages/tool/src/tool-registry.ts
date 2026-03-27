import type { ToolDefinition } from '@agentic-eng/core';

import type { Tool } from './tool';

/**
 * Manages a collection of tools available to the agent.
 * Supports both custom tools and MCP-sourced tools in a single registry.
 */
export class ToolRegistry {
  private readonly tools: Map<string, Tool> = new Map();

  /**
   * Register one or more tools.
   */
  register(...tools: Tool[]): void {
    for (const tool of tools) {
      this.tools.set(tool.definition.name, tool);
    }
  }

  /**
   * Get a tool by name. Returns undefined if not found.
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Returns all registered tool definitions.
   */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  /**
   * Returns a compact index of tools: just names and descriptions.
   * This is what gets sent to the LLM on every call (token-efficient).
   */
  getCompactIndex(): string {
    if (this.tools.size === 0) return '';

    const lines = Array.from(this.tools.values()).map(
      (t) => `- ${t.definition.name}: ${t.definition.description}`,
    );
    return lines.join('\n');
  }

  /**
   * Returns the full schema for a specific tool (name, description, inputSchema).
   * Used when the LLM requests a tool call — injected into the next iteration
   * so the LLM can construct the input accurately.
   */
  getFullSchema(name: string): string | undefined {
    const tool = this.tools.get(name);
    if (!tool) return undefined;

    return JSON.stringify(
      {
        name: tool.definition.name,
        description: tool.definition.description,
        inputSchema: tool.definition.inputSchema,
      },
      null,
      2,
    );
  }

  /**
   * Returns the number of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Check if a tool with the given name is registered.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }
}
