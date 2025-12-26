import fs from 'fs/promises';
import path from 'path';
import { getDataPath } from './utils';
import type { RunLog } from './types';

export class RunLogStore {
  private dirPath: string;

  constructor() {
    this.dirPath = path.join(getDataPath(), 'run-logs');
  }

  private getFilePath(date: Date): string {
    const month = date.toISOString().slice(0, 7); // "2025-01"
    return path.join(this.dirPath, `${month}.jsonl`);
  }

  /**
   * Append a log entry (efficient, O(1))
   */
  async append(log: RunLog): Promise<void> {
    await fs.mkdir(this.dirPath, { recursive: true });
    const filePath = this.getFilePath(new Date(log.requestTime));
    await fs.appendFile(filePath, JSON.stringify(log) + '\n', 'utf-8');
  }

  /**
   * Update a log entry (called when generation completes to update status/duration)
   */
  async update(id: string, updates: Partial<RunLog>, requestTime: string): Promise<void> {
    const filePath = this.getFilePath(new Date(requestTime));

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');

      const updatedLines = lines.map(line => {
        if (!line) return line;
        try {
          const record = JSON.parse(line) as RunLog;
          if (record.id === id) {
            return JSON.stringify({ ...record, ...updates });
          }
        } catch {
          // Skip malformed lines
        }
        return line;
      });

      // Atomic write
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, updatedLines.join('\n') + '\n', 'utf-8');
      await fs.rename(tempPath, filePath);
    } catch (e: unknown) {
      const error = e as NodeJS.ErrnoException;
      if (error.code !== 'ENOENT') throw e;
      // File doesn't exist, ignore (shouldn't happen in practice)
    }
  }

  /**
   * Read logs from recent N days (default 30)
   */
  async getRecent(days: number = 30, filters?: {
    type?: string;
    status?: string;
  }): Promise<RunLog[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const months = this.getMonthsInRange(cutoff, new Date());
    const results: RunLog[] = [];

    for (const month of months) {
      const filePath = path.join(this.dirPath, `${month}.jsonl`);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const logs = content
          .trim()
          .split('\n')
          .filter(line => line)
          .map(line => {
            try {
              return JSON.parse(line) as RunLog;
            } catch {
              return null;
            }
          })
          .filter((log): log is RunLog => log !== null);
        results.push(...logs);
      } catch {
        // File doesn't exist, skip
      }
    }

    return results
      .filter(log => new Date(log.requestTime) >= cutoff)
      .filter(log => !filters?.type || log.type === filters.type)
      .filter(log => !filters?.status || log.status === filters.status)
      .sort((a, b) =>
        new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime()
      );
  }

  /**
   * Get all historical logs (when user clicks "Load more")
   */
  async getAll(filters?: {
    type?: string;
    status?: string;
  }): Promise<RunLog[]> {
    try {
      const files = await fs.readdir(this.dirPath);
      const jsonlFiles = files.filter(f => f.endsWith('.jsonl')).sort().reverse();

      const results: RunLog[] = [];
      for (const file of jsonlFiles) {
        const content = await fs.readFile(path.join(this.dirPath, file), 'utf-8');
        const logs = content
          .trim()
          .split('\n')
          .filter(line => line)
          .map(line => {
            try {
              return JSON.parse(line) as RunLog;
            } catch {
              return null;
            }
          })
          .filter((log): log is RunLog => log !== null);
        results.push(...logs);
      }

      return results
        .filter(log => !filters?.type || log.type === filters.type)
        .filter(log => !filters?.status || log.status === filters.status)
        .sort((a, b) =>
          new Date(b.requestTime).getTime() - new Date(a.requestTime).getTime()
        );
    } catch {
      return [];
    }
  }

  /**
   * Delete all logs (used in reset)
   */
  async deleteAll(): Promise<void> {
    try {
      const files = await fs.readdir(this.dirPath);
      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          await fs.unlink(path.join(this.dirPath, file));
        }
      }
    } catch {
      // Directory doesn't exist, nothing to delete
    }
  }

  private getMonthsInRange(start: Date, end: Date): string[] {
    const months: string[] = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= endMonth) {
      months.push(current.toISOString().slice(0, 7));
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }
}
