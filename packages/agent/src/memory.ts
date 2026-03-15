import * as fs from 'node:fs';
import * as path from 'node:path';

import type { MemoryEntry } from './types';

/**
 * Interface for persisting agent knowledge across invocations.
 *
 * Consumers can implement custom backends (database, vector store, etc.)
 * or use the built-in `FlatFileMemoryProvider` for file-based storage.
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

/**
 * Flat-file memory provider that persists agent knowledge as KNL DATA blocks.
 *
 * Each agent gets its own `.knl` file in the configured directory.
 * Knowledge entries are stored as KNL DATA blocks with items.
 *
 * @example
 * ```typescript
 * const memory = new FlatFileMemoryProvider('/path/to/memory');
 * const agent = new Agent({
 *   name: 'my-agent',
 *   provider: myProvider,
 *   memory,
 * });
 * ```
 */
export class FlatFileMemoryProvider implements MemoryProvider {
  constructor(private readonly directory: string) {}

  async store(agentName: string, entry: MemoryEntry): Promise<void> {
    await fs.promises.mkdir(this.directory, { recursive: true });

    const filePath = this.getFilePath(agentName);
    const knlBlock = this.toKnlBlock(agentName, entry);

    await fs.promises.appendFile(filePath, knlBlock + '\n', 'utf-8');
  }

  async retrieve(agentName: string): Promise<MemoryEntry[]> {
    const filePath = this.getFilePath(agentName);

    let content: string;
    try {
      content = await fs.promises.readFile(filePath, 'utf-8');
    } catch {
      return [];
    }

    return this.parseKnlBlocks(content);
  }

  private getFilePath(agentName: string): string {
    const safeName = agentName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.directory, `${safeName}.memory.knl`);
  }

  /**
   * Converts a MemoryEntry into a KNL DATA block.
   *
   * Format:
   * ```
   * <<<
   * KNL[DATA][1.0]:::
   * ID[knl:data:easa.memory:{agentName}:{timestamp}:v1.0]:::
   * NS[easa.memory]:::
   * LABEL["{label}"]:::
   * TAGS[{tags}]:::
   * ITEM["{content}"] [DESC:"{label}"]
   * >>>
   * ```
   */
  private toKnlBlock(agentName: string, entry: MemoryEntry): string {
    const timestamp = Date.now();
    const safeName = agentName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const escapedLabel = this.escapeKnl(entry.label);
    const escapedContent = this.escapeKnl(entry.content);
    const tags = entry.tags?.join(',') ?? '';

    const lines = [
      '<<<',
      'KNL[DATA][1.0]:::',
      `ID[knl:data:easa.memory:${safeName}:${timestamp}:v1.0]:::`,
      'NS[easa.memory]:::',
      `LABEL["${escapedLabel}"]:::`,
    ];

    if (tags) {
      lines.push(`TAGS[${tags}]:::`);
    }

    lines.push(`ITEM["${escapedContent}"] [DESC:"${escapedLabel}"]`);
    lines.push('>>>');

    return lines.join('\n');
  }

  /**
   * Parses KNL DATA blocks back into MemoryEntry objects.
   */
  private parseKnlBlocks(content: string): MemoryEntry[] {
    const entries: MemoryEntry[] = [];
    const blockPattern = /<<<([\s\S]*?)>>>/g;
    let match: RegExpExecArray | null;

    while ((match = blockPattern.exec(content)) !== null) {
      const block = match[1] ?? '';

      const labelMatch = /LABEL\["([^"]*)"\]/.exec(block);
      const itemMatch = /ITEM\["([^"]*)"\]/.exec(block);
      const tagsMatch = /TAGS\[([^\]]*)\]/.exec(block);

      if (labelMatch?.[1] && itemMatch?.[1]) {
        const entry: MemoryEntry = {
          label: this.unescapeKnl(labelMatch[1]),
          content: this.unescapeKnl(itemMatch[1]),
        };

        if (tagsMatch?.[1]) {
          entry.tags = tagsMatch[1].split(',').map((t) => t.trim()).filter(Boolean);
        }

        entries.push(entry);
      }
    }

    return entries;
  }

  private escapeKnl(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private unescapeKnl(str: string): string {
    return str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
}
