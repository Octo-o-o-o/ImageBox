/**
 * Model Parameter Definitions
 *
 * This file defines all possible parameters for image generation models.
 * Each parameter includes UI configuration and API mapping logic.
 */

// Parameter definition types
export type ParameterType = 'select' | 'toggle' | 'slider' | 'multiselect';

export interface ParameterOption {
  value: string;
  label: string;
  description?: string;
}

export interface ParameterDefinition {
  key: string;
  label: string;
  type: ParameterType;
  options?: ParameterOption[];
  default: any;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

// All available parameters
export const PARAMETER_DEFINITIONS: Record<string, ParameterDefinition> = {
  aspectRatio: {
    key: 'aspectRatio',
    label: 'params.aspectRatio.label',
    type: 'select',
    default: '1:1',
    options: [
      { value: 'auto', label: 'params.aspectRatio.option.auto', description: 'params.aspectRatio.option.auto.desc' },
      { value: '1:1', label: 'params.aspectRatio.option.1:1', description: 'params.aspectRatio.option.1:1.desc' },
      { value: '2:3', label: 'params.aspectRatio.option.2:3', description: 'params.aspectRatio.option.2:3.desc' },
      { value: '3:2', label: 'params.aspectRatio.option.3:2', description: 'params.aspectRatio.option.3:2.desc' },
      { value: '3:4', label: 'params.aspectRatio.option.3:4', description: 'params.aspectRatio.option.3:4.desc' },
      { value: '4:3', label: 'params.aspectRatio.option.4:3', description: 'params.aspectRatio.option.4:3.desc' },
      { value: '4:5', label: 'params.aspectRatio.option.4:5', description: 'params.aspectRatio.option.4:5.desc' },
      { value: '5:4', label: 'params.aspectRatio.option.5:4', description: 'params.aspectRatio.option.5:4.desc' },
      { value: '9:16', label: 'params.aspectRatio.option.9:16', description: 'params.aspectRatio.option.9:16.desc' },
      { value: '16:9', label: 'params.aspectRatio.option.16:9', description: 'params.aspectRatio.option.16:9.desc' },
      { value: '21:9', label: 'params.aspectRatio.option.21:9', description: 'params.aspectRatio.option.21:9.desc' },
    ],
    description: 'params.aspectRatio.description'
  },

  imageSize: {
    key: 'imageSize',
    label: 'params.imageSize.label',
    type: 'select',
    default: '1K',
    options: [
      { value: '1K', label: 'params.imageSize.option.1K', description: 'params.imageSize.option.1K.desc' },
      { value: '2K', label: 'params.imageSize.option.2K', description: 'params.imageSize.option.2K.desc' },
      { value: '4K', label: 'params.imageSize.option.4K', description: 'params.imageSize.option.4K.desc' },
    ],
    description: 'params.imageSize.description'
  },

  responseModalities: {
    key: 'responseModalities',
    label: 'params.responseModalities.label',
    type: 'multiselect',
    default: ['image'],
    options: [
      { value: 'image', label: 'params.responseModalities.option.image', description: 'params.responseModalities.option.image.desc' },
      { value: 'text', label: 'params.responseModalities.option.text', description: 'params.responseModalities.option.text.desc' },
    ],
    description: 'params.responseModalities.description'
  },

  quality: {
    key: 'quality',
    label: 'params.quality.label',
    type: 'select',
    default: 'standard',
    options: [
      { value: 'standard', label: 'params.quality.option.standard', description: 'params.quality.option.standard.desc' },
      { value: 'hd', label: 'params.quality.option.hd', description: 'params.quality.option.hd.desc' },
    ],
    description: 'params.quality.description'
  },

  style: {
    key: 'style',
    label: 'params.style.label',
    type: 'select',
    default: 'vivid',
    options: [
      { value: 'vivid', label: 'params.style.option.vivid', description: 'params.style.option.vivid.desc' },
      { value: 'natural', label: 'params.style.option.natural', description: 'params.style.option.natural.desc' },
    ],
    description: 'params.style.description'
  },

  refImagesEnabled: {
    key: 'refImagesEnabled',
    label: 'params.refImagesEnabled.label',
    type: 'toggle',
    default: true,
    description: 'params.refImagesEnabled.description'
  },

  // === Local Model Specific Parameters ===
  steps: {
    key: 'steps',
    label: 'params.steps.label',
    type: 'slider',
    default: 8,
    min: 1,
    max: 50,
    step: 1,
    description: 'params.steps.description'
  },

  cfgScale: {
    key: 'cfgScale',
    label: 'params.cfgScale.label',
    type: 'slider',
    default: 0,
    min: 0,
    max: 10,
    step: 0.5,
    description: 'params.cfgScale.description'
  },

  seed: {
    key: 'seed',
    label: 'params.seed.label',
    type: 'slider',
    default: -1,
    min: -1,
    max: 999999999,
    step: 1,
    description: 'params.seed.description'
  },

  sampler: {
    key: 'sampler',
    label: 'params.sampler.label',
    type: 'select',
    default: 'euler',
    options: [
      { value: 'euler', label: 'params.sampler.option.euler', description: 'params.sampler.option.euler.desc' },
      { value: 'euler_a', label: 'params.sampler.option.euler_a', description: 'params.sampler.option.euler_a.desc' },
      { value: 'dpm++_2m', label: 'params.sampler.option.dpm++_2m', description: 'params.sampler.option.dpm++_2m.desc' },
      { value: 'dpm++_2m_karras', label: 'params.sampler.option.dpm++_2m_karras', description: 'params.sampler.option.dpm++_2m_karras.desc' },
      { value: 'lcm', label: 'params.sampler.option.lcm', description: 'params.sampler.option.lcm.desc' },
    ],
    description: 'params.sampler.description'
  },

  numberOfImages: {
    key: 'numberOfImages',
    label: 'params.numberOfImages.label',
    type: 'slider',
    default: 1,
    min: 1,
    max: 4,
    step: 1,
    description: 'params.numberOfImages.description'
  },
};

// Preset configurations for common model types
export const MODEL_PRESETS = {
  // Google Gemini 2.5 Flash Image (仅支持aspectRatio)
  GEMINI_2_5_FLASH_IMAGE: {
    supportedParams: ['aspectRatio', 'responseModalities', 'refImagesEnabled'],
    defaults: {
      aspectRatio: '1:1',
      responseModalities: ['IMAGE'],
      refImagesEnabled: true,
    },
    maxRefImages: 2,  // 最多2张参考图
    description: 'Gemini 2.5 Flash Image（仅支持比例，不支持分辨率，最多2张参考图）'
  },

  // Google Gemini 3 Pro Image Preview (支持aspectRatio + imageSize)
  GEMINI_3_PRO_IMAGE: {
    supportedParams: ['aspectRatio', 'imageSize', 'responseModalities', 'refImagesEnabled'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
      responseModalities: ['IMAGE'],
      refImagesEnabled: true,
    },
    maxRefImages: 14,  // 最多14张参考图
    description: 'Gemini 3 Pro Image Preview（支持比例和分辨率，最多14张参考图）'
  },

  // Google Gemini via OpenRouter (OpenAI-compatible)
  GEMINI_OPENROUTER: {
    supportedParams: ['aspectRatio', 'imageSize', 'responseModalities', 'refImagesEnabled'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
      responseModalities: ['image'],
      refImagesEnabled: true,
    },
    maxRefImages: 14,  // OpenRouter Gemini 通常支持14张
    description: 'OpenRouter上的Gemini模型（支持更多参数）'
  },

  // OpenAI DALL-E
  OPENAI_DALLE: {
    supportedParams: ['imageSize', 'quality', 'style'],
    defaults: {
      imageSize: '1K',
      quality: 'standard',
      style: 'vivid',
    },
    maxRefImages: 0,  // DALL-E 不支持参考图
    description: 'OpenAI DALL-E 3（不支持参考图）'
  },

  // Generic OpenAI-compatible
  OPENAI_COMPATIBLE: {
    supportedParams: ['aspectRatio', 'imageSize', 'refImagesEnabled'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
      refImagesEnabled: true,
    },
    maxRefImages: 10,  // 通用默认10张
    description: '通用OpenAI兼容接口'
  },

  // Grsai Nano Banana Pro (uses custom API endpoint, supports imageSize)
  GRSAI_NANO_BANANA_PRO: {
    supportedParams: ['aspectRatio', 'imageSize', 'refImagesEnabled'],
    defaults: {
      aspectRatio: 'auto',
      imageSize: '1K',
      refImagesEnabled: true,
    },
    maxRefImages: 10,  // 根据文档支持 urls 数组
    description: 'Grsai Nano Banana Pro (支持比例和分辨率，使用自定义API格式)'
  },

  // Grsai Nano Banana Fast (uses custom API endpoint, imageSize NOT supported)
  GRSAI_NANO_BANANA_FAST: {
    supportedParams: ['aspectRatio', 'refImagesEnabled'],  // imageSize only supported by Pro model
    defaults: {
      aspectRatio: 'auto',
      refImagesEnabled: true,
    },
    maxRefImages: 10,  // 根据文档支持 urls 数组
    description: 'Grsai Nano Banana Fast (仅支持比例，不支持分辨率)'
  },

  // === Local Models ===

  // Z-Image via stable-diffusion.cpp
  LOCAL_ZIMAGE_SDCPP: {
    supportedParams: ['aspectRatio', 'imageSize', 'numberOfImages', 'steps', 'cfgScale', 'seed'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
      numberOfImages: 1,
      steps: 8,        // Z-Image Turbo 推荐 8 步
      cfgScale: 0,     // Turbo 版本不需要 CFG
      seed: -1,        // -1 表示随机
    },
    maxRefImages: 0,   // sd.cpp 暂不支持参考图
    description: 'Z-Image 本地模型 (stable-diffusion.cpp)'
  },

  // Z-Image via ComfyUI
  LOCAL_ZIMAGE_COMFYUI: {
    supportedParams: ['aspectRatio', 'imageSize', 'numberOfImages', 'steps', 'cfgScale', 'seed', 'sampler', 'refImagesEnabled'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
      numberOfImages: 1,
      steps: 8,
      cfgScale: 0,
      seed: -1,
      sampler: 'euler',
      refImagesEnabled: true,
    },
    maxRefImages: 4,   // ComfyUI 可通过工作流支持
    description: 'Z-Image 本地模型 (ComfyUI)'
  },

  // === Volcengine Ark Models ===

  // Volcengine Ark Seedream 4.5 (OpenAI-compatible image generation)
  ARK_SEEDREAM_4_5: {
    supportedParams: ['aspectRatio', 'imageSize', 'refImagesEnabled'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
      refImagesEnabled: true,
    },
    maxRefImages: 1,  // Seedream 4.5 supports single reference image
    description: 'Volcengine Ark Seedream 4.5 (支持比例和分辨率，最多1张参考图)'
  },

  // === OpenAI Official Models ===

  // OpenAI GPT-Image-1 (Image generation API)
  OPENAI_GPT_IMAGE_1: {
    supportedParams: ['aspectRatio', 'imageSize', 'quality'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
      quality: 'medium',
    },
    maxRefImages: 0,  // GPT-Image-1 doesn't support reference images
    description: 'OpenAI GPT-Image-1 (支持多种尺寸和质量设置)'
  },

  // === xAI Grok Models ===

  // xAI Grok-2-Image (Image generation)
  GROK_2_IMAGE: {
    supportedParams: ['numberOfImages'],
    defaults: {
      numberOfImages: 1,
    },
    maxRefImages: 0,  // Grok-2-Image doesn't support reference images
    description: 'xAI Grok-2-Image (固定尺寸1024x768，不支持参考图)'
  },

  // === DeepSeek Models ===

  // DeepSeek Janus Pro (Multimodal image generation)
  DEEPSEEK_JANUS_PRO: {
    supportedParams: ['aspectRatio', 'imageSize'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
    },
    maxRefImages: 0,  // Janus Pro primarily text-to-image
    description: 'DeepSeek Janus Pro 7B (多模态图片生成)'
  },

  // === SiliconFlow Models ===

  // SiliconFlow Qwen-Image (Image generation)
  SILICONFLOW_QWEN_IMAGE: {
    supportedParams: ['aspectRatio', 'imageSize'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
    },
    maxRefImages: 0,
    description: 'SiliconFlow Qwen-Image (支持多种比例和尺寸)'
  },

  // Custom local model (minimal params)
  LOCAL_CUSTOM: {
    supportedParams: ['aspectRatio', 'imageSize', 'numberOfImages'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
      numberOfImages: 1,
    },
    maxRefImages: 0,
    description: '自定义本地模型（OpenAI 兼容接口）'
  },
};

/**
 * Get parameter definitions for a model based on its configuration
 */
export function getModelParameters(parameterConfig: string): ParameterDefinition[] {
  try {
    const config = JSON.parse(parameterConfig || '{}');
    const supportedParams = config.supportedParams || [];

    return supportedParams
      .map((key: string) => PARAMETER_DEFINITIONS[key])
      .filter(Boolean);
  } catch (e) {
    console.error('Failed to parse parameter config:', e);
    return [];
  }
}

/**
 * Get default values for a model based on its configuration
 */
export function getModelDefaults(parameterConfig: string): Record<string, any> {
  try {
    const config = JSON.parse(parameterConfig || '{}');
    return config.defaults || {};
  } catch (e) {
    console.error('Failed to parse parameter config:', e);
    return {};
  }
}

/**
 * Get maximum number of reference images for a model
 */
export function getMaxRefImages(parameterConfig: string): number {
  try {
    const config = JSON.parse(parameterConfig || '{}');
    return config.maxRefImages !== undefined ? config.maxRefImages : 14; // 默认14张
  } catch (e) {
    console.error('Failed to parse parameter config:', e);
    return 14; // 默认14张
  }
}

/**
 * Map UI parameters to API parameters based on provider type
 */
export function mapParametersForAPI(
  providerType: string,
  baseUrl: string | null,
  params: Record<string, any>,
  parameterConfig?: string | null
): Record<string, any> {
  const mappedParams: Record<string, any> = {};

  // Detect actual API type
  const isGoogleOfficial = providerType === 'GEMINI' && (
    !baseUrl ||
    baseUrl.includes('googleapis.com') ||
    baseUrl.includes('generativelanguage.googleapis.com')
  );

  // Check if model uses Grsai Nano Banana preset (more reliable than baseUrl check)
  let isGrsai = false;
  if (parameterConfig) {
    try {
      const config = JSON.parse(parameterConfig);
      // Check for both Pro and Fast variants
      isGrsai = !!(config.description && (
        config.description.includes('Grsai Nano Banana Pro') ||
        config.description.includes('Grsai Nano Banana Fast')
      ));
    } catch (e) {
      // Fallback to baseUrl check if config parsing fails
      isGrsai = !!(baseUrl && (baseUrl.includes('grsai') || baseUrl.includes('dakka.com.cn')));
    }
  } else {
    // Fallback to baseUrl check if no config provided
    isGrsai = !!(baseUrl && (baseUrl.includes('grsai') || baseUrl.includes('dakka.com.cn')));
  }

  // Check if model uses Ark Seedream preset
  let isArkSeedream = false;
  if (parameterConfig) {
    try {
      const config = JSON.parse(parameterConfig);
      isArkSeedream = !!(config.description && config.description.includes('Ark Seedream'));
    } catch (e) {
      // Fallback to baseUrl check if config parsing fails
      isArkSeedream = !!(baseUrl && baseUrl.includes('ark.cn-beijing.volces.com'));
    }
  } else {
    // Fallback to baseUrl check if no config provided
    isArkSeedream = !!(baseUrl && baseUrl.includes('ark.cn-beijing.volces.com'));
  }

  const isOpenRouter = baseUrl && baseUrl.includes('openrouter.ai');
  const isOfficialOpenAI = providerType === 'OPENAI' && !baseUrl;

  if (isGoogleOfficial) {
    // Google Gemini Official SDK
    // Supports: responseModalities, imageConfig (aspectRatio, imageSize)

    // responseModalities: must be uppercase for Google API
    if (params.responseModalities) {
      mappedParams.responseModalities = Array.isArray(params.responseModalities)
        ? params.responseModalities.map((m: string) => m.toUpperCase())
        : [params.responseModalities.toUpperCase()];
    }

    // imageConfig: aspectRatio and imageSize
    const imageConfig: any = {};
    let hasImageConfig = false;

    if (params.aspectRatio) {
      imageConfig.aspectRatio = params.aspectRatio;
      hasImageConfig = true;
    }

    if (params.imageSize) {
      imageConfig.imageSize = params.imageSize;
      hasImageConfig = true;
    }

    if (hasImageConfig) {
      mappedParams.imageConfig = imageConfig;
    }

    // Reference images
    if (params.refImages) {
      mappedParams.refImages = params.refImages;
    }
  } else if (isGrsai) {
    // Grsai Nano Banana - uses custom /v1/draw/nano-banana API
    // Parameters are top-level (not nested in imageConfig)
    mappedParams._useGrsaiAPI = true; // Special flag for custom API handling

    if (params.aspectRatio) {
      mappedParams.aspectRatio = params.aspectRatio;
    }
    if (params.imageSize) {
      mappedParams.imageSize = params.imageSize;
    }
    if (params.refImages) {
      mappedParams.refImages = params.refImages;
    }
  } else if (isArkSeedream) {
    // Volcengine Ark Seedream - uses images.generate API (OpenAI-compatible)
    // Special flag for custom API handling in generation.ts
    mappedParams._useArkSeedreamAPI = true;

    if (params.aspectRatio) {
      // Convert aspectRatio format (e.g., "16:9" -> "16:9")
      mappedParams.aspect_ratio = params.aspectRatio;
    }
    if (params.imageSize) {
      // Map our imageSize to Seedream size format
      const sizeMap: Record<string, string> = {
        '1K': '1024x1024',
        '2K': '2048x2048',
        '4K': '4096x4096',
      };
      // If aspectRatio is specified, we need to calculate the actual dimensions
      if (params.aspectRatio && params.aspectRatio !== '1:1') {
        const [w, h] = params.aspectRatio.split(':').map(Number);
        const baseSize = params.imageSize === '2K' ? 2048 : params.imageSize === '4K' ? 4096 : 1024;
        let width: number, height: number;
        if (w > h) {
          width = baseSize;
          height = Math.round(baseSize * h / w);
        } else {
          height = baseSize;
          width = Math.round(baseSize * w / h);
        }
        // Round to nearest 64 (common requirement for image generation)
        width = Math.round(width / 64) * 64;
        height = Math.round(height / 64) * 64;
        mappedParams.size = `${width}x${height}`;
      } else {
        mappedParams.size = sizeMap[params.imageSize] || '1024x1024';
      }
    }
    if (params.refImages && Array.isArray(params.refImages) && params.refImages.length > 0) {
      // Seedream uses image_urls for reference images
      mappedParams.image_urls = params.refImages;
    }
  } else if (isOpenRouter || (providerType === 'GEMINI' && baseUrl)) {
    // OpenRouter or other OpenAI-compatible Gemini endpoints
    if (params.aspectRatio) {
      mappedParams.aspectRatio = params.aspectRatio;
    }
    if (params.imageSize) {
      mappedParams.imageSize = params.imageSize;
    }
    if (params.responseModalities) {
      mappedParams.responseModalities = Array.isArray(params.responseModalities)
        ? params.responseModalities
        : [params.responseModalities];
    }
    if (params.refImages) {
      mappedParams.refImages = params.refImages;
    }
  } else if (isOfficialOpenAI) {
    // Official OpenAI DALL-E
    // Uses different parameter format (quality, style, size)
    if (params.quality) {
      mappedParams.quality = params.quality;
    }
    if (params.style) {
      mappedParams.style = params.style;
    }
    if (params.imageSize) {
      // Map our imageSize to OpenAI size format
      const sizeMap: Record<string, string> = {
        '1K': '1024x1024',
        '2K': '1024x1792', // DALL-E 3 supports these specific sizes
        '4K': '1792x1024',
      };
      mappedParams.size = sizeMap[params.imageSize] || '1024x1024';
    }
  } else {
    // Generic OpenAI-compatible
    // Pass through most parameters
    if (params.aspectRatio) mappedParams.aspectRatio = params.aspectRatio;
    if (params.imageSize) mappedParams.imageSize = params.imageSize;
    if (params.quality) mappedParams.quality = params.quality;
    if (params.style) mappedParams.style = params.style;
    if (params.refImages) mappedParams.refImages = params.refImages;
  }

  return mappedParams;
}
