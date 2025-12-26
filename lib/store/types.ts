// Store data types for JSON/JSONL storage

export interface ConfigData {
  version: "1.0";
  settings: Record<string, string>;
  tokens: Record<string, TokenRecord>;
}

export interface TokenRecord {
  id: string;
  name: string;
  description: string | null;
  token: string;
  expiresAt: string; // ISO 8601
  isRevoked: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ResourcesData {
  version: "1.0";
  providers: Record<string, ProviderRecord>;
  models: Record<string, ModelRecord>;
  templates: Record<string, TemplateRecord>;
}

export interface ProviderRecord {
  id: string;
  name: string;
  type: "GEMINI" | "OPENAI" | "LOCAL";
  baseUrl: string | null;
  apiKey: string | null;
  localBackend: string | null;
  localModelPath: string | null;
  createdAt: string;
}

export interface ModelRecord {
  id: string;
  name: string;
  modelIdentifier: string;
  type: "TEXT" | "IMAGE";
  parameterConfig: string | null;
  providerId: string | null;
  createdAt: string;
}

export interface TemplateRecord {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  promptTemplate: string;
  systemPrompt: string | null;
  promptGeneratorId: string | null;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryData {
  version: "1.0";
  folders: Record<string, FolderRecord>;
  images: Record<string, ImageRecord>;
}

export interface FolderRecord {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ImageRecord {
  id: string;
  path: string;
  thumbnailPath: string | null;
  finalPrompt: string;
  modelName: string;
  params: string;
  isFavorite: boolean;
  templateId: string | null;
  folderId: string | null;
  createdAt: string;
}

export interface RunLog {
  id: string;
  requestTime: string;
  completionTime: string | null;
  duration: number | null;
  type: "PROMPT_GEN" | "IMAGE_GEN";
  status: "SUCCESS" | "FAILURE" | "RUNNING";
  modelUsed: string | null;
  actualInput: string | null;
  output: string | null;
  parentTaskId: string | null;
  configParams: string | null;
}
