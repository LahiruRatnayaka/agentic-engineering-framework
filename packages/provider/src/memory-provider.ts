import type { MemoryEntry } from '@agentic-eng/core';

/**
 * Interface for persisting agent knowledge across invocations.
 *
 * Consumers can implement custom backends (database, vector store, etc.)
 * or use the built-in `FlatFileMemory` from `@agentic-eng/memory` for file-based storage.
 */
export interface MemoryProvider {
  /**
   * Store a piece of knowledge.
   */
  store(agentName: string, entry: MemoryEntry): Promise<void>;

  /**
   * Retrieve all stored knowledge for a given agent.
   */
  retrieve(agentName: string): Promise<MemoryEntry[]>;
}
