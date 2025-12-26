import { JsonStore } from './jsonStore';
import { RunLogStore } from './runLogStore';
import type { ConfigData, ResourcesData, LibraryData } from './types';

// Config store: Settings + AccessTokens
export const configStore = new JsonStore<ConfigData>('config.json', {
  version: "1.0",
  settings: {},
  tokens: {}
});

// Resources store: Providers + Models + Templates
export const resourcesStore = new JsonStore<ResourcesData>('resources.json', {
  version: "1.0",
  providers: {},
  models: {},
  templates: {}
});

// Library store: Folders + Images
export const libraryStore = new JsonStore<LibraryData>('library.json', {
  version: "1.0",
  folders: {},
  images: {}
});

// RunLog store: JSONL files by month
export const runLogStore = new RunLogStore();

// Re-export types
export type {
  ConfigData,
  ResourcesData,
  LibraryData,
  TokenRecord,
  ProviderRecord,
  ModelRecord,
  TemplateRecord,
  FolderRecord,
  ImageRecord,
  RunLog
} from './types';

// Re-export classes for advanced usage
export { JsonStore } from './jsonStore';
export { RunLogStore } from './runLogStore';
export { getDataPath } from './utils';
