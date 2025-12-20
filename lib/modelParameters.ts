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
    label: '画幅比例',
    type: 'select',
    default: '1:1',
    options: [
      { value: 'auto', label: '自动', description: '自动选择比例' },
      { value: '1:1', label: '1:1', description: '正方形' },
      { value: '2:3', label: '2:3', description: '竖版' },
      { value: '3:2', label: '3:2', description: '横版' },
      { value: '3:4', label: '3:4', description: '竖版全屏' },
      { value: '4:3', label: '4:3', description: '横版全屏' },
      { value: '4:5', label: '4:5', description: '竖版' },
      { value: '5:4', label: '5:4', description: '横版' },
      { value: '9:16', label: '9:16', description: '竖版加长' },
      { value: '16:9', label: '16:9', description: '横版加宽' },
      { value: '21:9', label: '21:9', description: '超宽屏' },
    ],
    description: '生成图片的宽高比例'
  },

  imageSize: {
    key: 'imageSize',
    label: '分辨率',
    type: 'select',
    default: '1K',
    options: [
      { value: '1K', label: '1024x1024 (1K)', description: '标准分辨率' },
      { value: '2K', label: '2048x2048 (2K)', description: '高清' },
      { value: '4K', label: '4096x4096 (4K)', description: '超高清' },
    ],
    description: '生成图片的分辨率'
  },

  responseModalities: {
    key: 'responseModalities',
    label: '返回类型',
    type: 'multiselect',
    default: ['image'],
    options: [
      { value: 'image', label: '图片', description: '生成图片' },
      { value: 'text', label: '文本', description: '附带文本描述' },
    ],
    description: '返回的内容类型'
  },

  quality: {
    key: 'quality',
    label: '质量',
    type: 'select',
    default: 'standard',
    options: [
      { value: 'standard', label: '标准', description: '标准质量' },
      { value: 'hd', label: '高清', description: 'HD质量（更慢更贵）' },
    ],
    description: '生成质量（仅DALL-E）'
  },

  style: {
    key: 'style',
    label: '风格',
    type: 'select',
    default: 'vivid',
    options: [
      { value: 'vivid', label: '生动', description: '更有创意和戏剧性' },
      { value: 'natural', label: '自然', description: '更贴近真实照片' },
    ],
    description: '图片风格（仅DALL-E）'
  },

  refImagesEnabled: {
    key: 'refImagesEnabled',
    label: '参考图',
    type: 'toggle',
    default: true,
    description: '是否支持上传参考图片'
  },

  // === Local Model Specific Parameters ===
  steps: {
    key: 'steps',
    label: '采样步数',
    type: 'slider',
    default: 8,
    min: 1,
    max: 50,
    step: 1,
    description: '生成步数（Z-Image Turbo 推荐 8）'
  },

  cfgScale: {
    key: 'cfgScale',
    label: 'CFG Scale',
    type: 'slider',
    default: 0,
    min: 0,
    max: 10,
    step: 0.5,
    description: '提示词引导强度（0=自动，Z-Image Turbo 推荐 0）'
  },

  seed: {
    key: 'seed',
    label: '随机种子',
    type: 'slider',
    default: -1,
    min: -1,
    max: 999999999,
    step: 1,
    description: '-1 表示随机，固定值可复现结果'
  },

  sampler: {
    key: 'sampler',
    label: '采样器',
    type: 'select',
    default: 'euler',
    options: [
      { value: 'euler', label: 'Euler', description: '快速，适合低步数' },
      { value: 'euler_a', label: 'Euler A', description: '随机性更强' },
      { value: 'dpm++_2m', label: 'DPM++ 2M', description: '高质量' },
      { value: 'dpm++_2m_karras', label: 'DPM++ 2M Karras', description: '高质量+平滑' },
      { value: 'lcm', label: 'LCM', description: '极速，配合低步数' },
    ],
    description: '采样算法'
  },

  numberOfImages: {
    key: 'numberOfImages',
    label: '生成数量',
    type: 'slider',
    default: 1,
    min: 1,
    max: 4,
    step: 1,
    description: '一次生成多少张图片'
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

  // Grsai Nano Banana (uses custom API endpoint)
  GRSAI_NANO_BANANA: {
    supportedParams: ['aspectRatio', 'imageSize', 'refImagesEnabled'],
    defaults: {
      aspectRatio: 'auto',
      imageSize: '1K',
      refImagesEnabled: true,
    },
    maxRefImages: 10,  // 根据文档支持 urls 数组
    description: 'Grsai Nano Banana (支持比例和分辨率，使用自定义API格式)'
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
  params: Record<string, any>
): Record<string, any> {
  const mappedParams: Record<string, any> = {};

  // Detect actual API type
  const isGoogleOfficial = providerType === 'GEMINI' && (
    !baseUrl ||
    baseUrl.includes('googleapis.com') ||
    baseUrl.includes('generativelanguage.googleapis.com')
  );

  const isGrsai = baseUrl && (baseUrl.includes('grsai') || baseUrl.includes('dakka.com.cn'));
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
