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
  description?: string; // For UI display (fallback)
  descriptionKey?: string; // i18n key for UI display
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
    descriptionKey: 'presets.provider.gemini.desc',
    apiKeyApplyUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: `${PRESET_ID_PREFIX}openai`,
    name: 'OpenAI',
    type: 'OPENAI',
    baseUrl: 'https://api.openai.com/v1',
    description: 'OpenAI 官方 API，支持 GPT 和图像生成模型',
    descriptionKey: 'presets.provider.openai.desc',
    apiKeyApplyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: `${PRESET_ID_PREFIX}anthropic`,
    name: 'Anthropic',
    type: 'OPENAI',
    baseUrl: 'https://api.anthropic.com/v1',
    description: 'Anthropic Claude 系列模型，需要配置 API Key',
    descriptionKey: 'presets.provider.anthropic.desc',
    apiKeyApplyUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: `${PRESET_ID_PREFIX}xai-grok`,
    name: 'xAI Grok',
    type: 'OPENAI',
    baseUrl: 'https://api.x.ai/v1',
    description: 'xAI Grok 系列模型，支持文本和图像生成',
    descriptionKey: 'presets.provider.grok.desc',
    apiKeyApplyUrl: 'https://console.x.ai/',
  },
  {
    id: `${PRESET_ID_PREFIX}deepseek`,
    name: 'DeepSeek',
    type: 'OPENAI',
    baseUrl: 'https://api.deepseek.com/v1',
    description: 'DeepSeek 官方 API，支持文本和多模态模型',
    descriptionKey: 'presets.provider.deepseek.desc',
    apiKeyApplyUrl: 'https://platform.deepseek.com/',
  },
  {
    id: `${PRESET_ID_PREFIX}siliconflow`,
    name: 'SiliconFlow',
    type: 'OPENAI',
    baseUrl: 'https://api.siliconflow.cn/v1',
    description: '硅基流动 API，支持多种开源模型',
    descriptionKey: 'presets.provider.siliconflow.desc',
    apiKeyApplyUrl: 'https://cloud.siliconflow.cn/account/ak',
  },
  {
    id: `${PRESET_ID_PREFIX}openrouter`,
    name: 'OpenRouter',
    type: 'OPENAI',
    baseUrl: 'https://openrouter.ai/api/v1',
    description: 'OpenRouter API 代理，支持多种模型，需要配置 API Key',
    descriptionKey: 'presets.provider.openrouter.desc',
    apiKeyApplyUrl: 'https://openrouter.ai/keys',
  },
  {
    id: `${PRESET_ID_PREFIX}grsai`,
    name: 'GRSAI',
    type: 'GEMINI',
    baseUrl: 'https://grsai.dakka.com.cn',
    description: 'GRSAI Nano Banana 图像生成服务，需要配置 API Key',
    descriptionKey: 'presets.provider.grsai.desc',
    apiKeyApplyUrl: 'https://grsai.dakka.com.cn',
  },
  {
    id: `${PRESET_ID_PREFIX}ark`,
    name: 'Ark',
    type: 'OPENAI',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    description: '火山引擎 Ark 平台，OpenAI SDK 同构，需要配置 API Key',
    descriptionKey: 'presets.provider.ark.desc',
    apiKeyApplyUrl: 'https://console.volcengine.com/ark',
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
    name: 'Nano Banana Pro',
    modelIdentifier: 'models/gemini-3-pro-image-preview',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}google-gemini`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GEMINI_3_PRO_IMAGE),
  },
  {
    id: `${PRESET_ID_PREFIX}gemini-2-5-flash-image`,
    name: 'Nano Banana',
    modelIdentifier: 'gemini-2.5-flash-image',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}google-gemini`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GEMINI_2_5_FLASH_IMAGE),
  },

  // --- OpenRouter Models ---
  {
    id: `${PRESET_ID_PREFIX}or-gemini-3-pro-image`,
    name: 'Nano Banana Pro(OpenRouter)',
    modelIdentifier: 'google/gemini-3-pro-image-preview',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}openrouter`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GEMINI_OPENROUTER),
  },
  {
    id: `${PRESET_ID_PREFIX}or-gemini-2-5-flash-image`,
    name: 'Nano Banana(OpenRouter)',
    modelIdentifier: 'google/gemini-2.5-flash-image',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}openrouter`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GEMINI_OPENROUTER),
  },
  {
    id: `${PRESET_ID_PREFIX}or-claude-sonnet-4-5`,
    name: 'Claude Sonnet 4.5',
    modelIdentifier: 'anthropic/claude-sonnet-4.5',
    type: 'TEXT',
    providerId: `${PRESET_ID_PREFIX}openrouter`,
    parameterConfig: JSON.stringify({}),
  },

  // --- GRSAI Models ---
  {
    id: `${PRESET_ID_PREFIX}grsai-nano-banana-pro`,
    name: 'Nano Banana Pro(GRSAI)',
    modelIdentifier: 'nano-banana-pro',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}grsai`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GRSAI_NANO_BANANA_PRO),
  },
  {
    id: `${PRESET_ID_PREFIX}grsai-nano-banana-fast`,
    name: 'Nano Banana(GRSAI)',
    modelIdentifier: 'nano-banana-fast',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}grsai`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GRSAI_NANO_BANANA_FAST),
  },

  // --- Ark Models (火山引擎) ---
  {
    id: `${PRESET_ID_PREFIX}ark-deepseek-v3-2`,
    name: 'DeepSeek 3.2',
    modelIdentifier: 'deepseek-v3-2-251201',
    type: 'TEXT',
    providerId: `${PRESET_ID_PREFIX}ark`,
    parameterConfig: JSON.stringify({}),
  },
  {
    id: `${PRESET_ID_PREFIX}ark-deepseek-v3-1`,
    name: 'DeepSeek 3.1',
    modelIdentifier: 'deepseek-v3-1-terminus',
    type: 'TEXT',
    providerId: `${PRESET_ID_PREFIX}ark`,
    parameterConfig: JSON.stringify({}),
  },
  {
    id: `${PRESET_ID_PREFIX}ark-seedream-4-5`,
    name: 'Seedream 4.5',
    modelIdentifier: 'doubao-seedream-4.5-250115',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}ark`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.ARK_SEEDREAM_4_5),
  },

  // --- OpenAI Models ---
  {
    id: `${PRESET_ID_PREFIX}openai-gpt-5-2`,
    name: 'GPT-5.2',
    modelIdentifier: 'gpt-5.2-2025-12-11',
    type: 'TEXT',
    providerId: `${PRESET_ID_PREFIX}openai`,
    parameterConfig: JSON.stringify({}),
  },
  {
    id: `${PRESET_ID_PREFIX}openai-gpt-5-mini`,
    name: 'GPT-5-mini',
    modelIdentifier: 'gpt-5-mini-2025-08-07',
    type: 'TEXT',
    providerId: `${PRESET_ID_PREFIX}openai`,
    parameterConfig: JSON.stringify({}),
  },
  {
    id: `${PRESET_ID_PREFIX}openai-gpt-image-1`,
    name: 'GPT-Image-1',
    modelIdentifier: 'gpt-image-1',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}openai`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.OPENAI_GPT_IMAGE_1),
  },

  // --- Anthropic Models ---
  {
    id: `${PRESET_ID_PREFIX}anthropic-claude-sonnet-4-5`,
    name: 'Claude Sonnet 4.5',
    modelIdentifier: 'claude-sonnet-4-5-20250929',
    type: 'TEXT',
    providerId: `${PRESET_ID_PREFIX}anthropic`,
    parameterConfig: JSON.stringify({}),
  },
  {
    id: `${PRESET_ID_PREFIX}anthropic-claude-haiku-4-5`,
    name: 'Claude Haiku 4.5',
    modelIdentifier: 'claude-haiku-4-5-20251001',
    type: 'TEXT',
    providerId: `${PRESET_ID_PREFIX}anthropic`,
    parameterConfig: JSON.stringify({}),
  },

  // --- xAI Grok Models ---
  {
    id: `${PRESET_ID_PREFIX}grok-4-1-fast`,
    name: 'Grok-4.1-fast',
    modelIdentifier: 'grok-4-1-fast',
    type: 'TEXT',
    providerId: `${PRESET_ID_PREFIX}xai-grok`,
    parameterConfig: JSON.stringify({}),
  },
  {
    id: `${PRESET_ID_PREFIX}grok-2-image`,
    name: 'Grok-2-Image',
    modelIdentifier: 'grok-2-image',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}xai-grok`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.GROK_2_IMAGE),
  },

  // --- DeepSeek Models ---
  {
    id: `${PRESET_ID_PREFIX}deepseek-chat`,
    name: 'DeepSeek-Official',
    modelIdentifier: 'deepseek-chat',
    type: 'TEXT',
    providerId: `${PRESET_ID_PREFIX}deepseek`,
    parameterConfig: JSON.stringify({}),
  },
  {
    id: `${PRESET_ID_PREFIX}deepseek-janus-pro`,
    name: 'Janus Pro',
    modelIdentifier: 'deepseek-janus-pro-7b',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}deepseek`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.DEEPSEEK_JANUS_PRO),
  },

  // --- SiliconFlow Models ---
  {
    id: `${PRESET_ID_PREFIX}siliconflow-deepseek-v3-2`,
    name: 'DeepSeek-SiliconFlow',
    modelIdentifier: 'deepseek-ai/DeepSeek-V3.2',
    type: 'TEXT',
    providerId: `${PRESET_ID_PREFIX}siliconflow`,
    parameterConfig: JSON.stringify({}),
  },
  {
    id: `${PRESET_ID_PREFIX}siliconflow-deepseek-pro`,
    name: 'DeepSeek-SiliconFlow-Pro',
    modelIdentifier: 'Pro/deepseek-ai/DeepSeek-V3.2',
    type: 'TEXT',
    providerId: `${PRESET_ID_PREFIX}siliconflow`,
    parameterConfig: JSON.stringify({}),
  },
  {
    id: `${PRESET_ID_PREFIX}siliconflow-qwen-image`,
    name: 'Qwen-Image',
    modelIdentifier: 'Qwen/Qwen-Image',
    type: 'IMAGE',
    providerId: `${PRESET_ID_PREFIX}siliconflow`,
    parameterConfig: JSON.stringify(MODEL_PRESETS.SILICONFLOW_QWEN_IMAGE),
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
