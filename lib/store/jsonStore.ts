import fs from 'fs/promises';
import path from 'path';
import { getDataPath } from './utils';

export class JsonStore<T extends { version: string }> {
  private filePath: string;
  private cache: T | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private defaultData: T;

  constructor(filename: string, defaultData: T) {
    this.filePath = path.join(getDataPath(), filename);
    this.defaultData = defaultData;
  }

  async read(): Promise<T> {
    if (this.cache) return this.cache;

    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      this.cache = JSON.parse(content);
      return this.cache!;
    } catch (e: unknown) {
      const error = e as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        // File doesn't exist, initialize with default data
        this.cache = this.defaultData;
        await this.write(this.defaultData);
        return this.defaultData;
      }
      throw e;
    }
  }

  async write(data: T): Promise<void> {
    // Serial write queue to avoid concurrent write conflicts
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });

      // Atomic write: write to tmp first, then rename
      const tempPath = `${this.filePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(data), 'utf-8');
      await fs.rename(tempPath, this.filePath);

      this.cache = data;
    });
    return this.writeQueue;
  }

  async update(updater: (data: T) => T): Promise<T> {
    const current = await this.read();
    const updated = updater(current);
    await this.write(updated);
    return updated;
  }

  invalidateCache(): void {
    this.cache = null;
  }

  getFilePath(): string {
    return this.filePath;
  }
}
