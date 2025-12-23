/**
 * Preset Provider and Model Definitions
 * 
 * These are built-in providers and models that will be automatically created
 * when the application starts for the first time.
 * 
 * Users can configure API keys and edit/delete these presets as needed.
 */

import { MODEL_PRESETS } from './modelParameters';

// Preset Provider IDs - using fixed prefixes for identification
const PRESET_ID_PREFIX = 'preset-';

export interface PresetProvider {
  id: string;
  name: string;
  type: 'GEMINI' | 'OPENAI' | 'LOCAL';
  baseUrl?: string;
  // apiKey is intentionally omitted - users need to configure it
  description?: string; // For UI display
  apiKeyApplyUrl?: string; // URL to apply for API key
}

export interface PresetModel {
  id: string;
  name: string;
  modelIdentifier: string;
  type: 'TEXT' | 'IMAGE';
  providerId: string; // References preset provider id
  parameterConfig: string;
}

// ============================================
// Preset Providers
// ============================================

export const PRESET_PROVIDERS: PresetProvider[] = [
  {
    id: `${PRESET_ID_PREFIX}google-gemini`,
    name: 'Google Gemini',
    type: 'GEMINI',
    baseUrl: 'https://generativelanguage.googleapis.com',
    description: 'Google 官方 Gemini API，需要配置 API Key',
    apiKeyApplyUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: `${PRESET_ID_PREFIX}openrouter`,
    name: 'OpenRouter',
    type: 'OPENAI',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'OpenRouter API 代理，支持多种模型，需要配置 API Key',
    apiKeyApplyUrl: 'https://openrouter.ai/keys',
  },
  {
    id: `${PRESET_ID_PREFIX}grsai`,
    name: 'GRSAI',
    type: 'GEMINI',
    baseUrl: 'https://grsai.dakka.com.cn',
    description: 'GRSAI Nano Banana 图像生成服务，需要配置 API Key',
    apiKeyApplyUrl: 'https://grsai.dakka.com.cn',
  },
];

/**
 * Get API key apply URL for a preset provider
 */
export function getApiKeyApplyUrl(providerId: string): string | undefined {
  const preset = PRESET_PROVIDERS.find(p => p.id === providerId);
  return preset?.apiKeyApplyUrl;
}

// ============================================
// Preset Models
// ============================================

export const PRESET_MODELS: PresetModel[] = [
  // --- Google Gemini Models ---
  {
    id: `${PRESET_ID_PREFIX}gemini-3-flash`,
    name: 'Gemini 3 Flash',
    modelIdentifier: 'models/gemini-3-flash-preview',
    type: 'TEXT',
    providerId: `${PRESET_ID_PREFIX}google-gemini`,
    parameterConfig: JSON.stringify({}),
  },
  {
    id: `${PRESET_ID_PREFIX}gemini-3-pro-image`,
    name: 'Gemini 3 Pro Image',
    modelIdentifier: 'models/gemini-3-pro-image-preview',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}google-gemini`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GEMINI_3_PRO_IMAGE),
  },
  {
    id: `${PRESET_ID_PREFIX}gemini-2-5-flash-image`,
    name: 'Gemini 2.5 Flash Image',
    modelIdentifier: 'gemini-2.5-flash-image',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}google-gemini`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GEMINI_2_5_FLASH_IMAGE),
  },

  // --- OpenRouter Models ---
  {
    id: `${PRESET_ID_PREFIX}or-gemini-3-pro-image`,
    name: 'Gemini 3 Pro Image (OpenRouter)',
    modelIdentifier: 'google/gemini-3-pro-image-preview',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}openrouter`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GEMINI_OPENROUTER),
  },
  {
    id: `${PRESET_ID_PREFIX}or-gemini-2-5-flash-image`,
    name: 'Gemini 2.5 Flash Image (OpenRouter)',
    modelIdentifier: 'google/gemini-2.5-flash-image',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}openrouter`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GEMINI_OPENROUTER),
  },

  // --- GRSAI Models ---
  {
    id: `${PRESET_ID_PREFIX}grsai-nano-banana-pro`,
    name: 'Nano Banana Pro',
    modelIdentifier: 'nano-banana-pro',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}grsai`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GRSAI_NANO_BANANA),
  },
  {
    id: `${PRESET_ID_PREFIX}grsai-nano-banana-fast`,
    name: 'Nano Banana Fast',
    modelIdentifier: 'nano-banana-fast',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}grsai`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GRSAI_NANO_BANANA),
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a provider ID is a preset
 */
export function isPresetProvider(id: string): boolean {
  return id.startsWith(PRESET_ID_PREFIX);
}

/**
 * Check if a model ID is a preset
 */
export function isPresetModel(id: string): boolean {
  return id.startsWith(PRESET_ID_PREFIX);
}

/**
 * Get preset provider by ID
 */
export function getPresetProvider(id: string): PresetProvider | undefined {
  return PRESET_PROVIDERS.find(p => p.id === id);
}

/**
 * Get preset model by ID
 */
export function getPresetModel(id: string): PresetModel | undefined {
  return PRESET_MODELS.find(m => m.id === id);
}

