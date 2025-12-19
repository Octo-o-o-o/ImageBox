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

  numberOfImages: {
    key: 'numberOfImages',
    label: '生成数量',
    type: 'slider',
    default: 1,
    min: 1,
    max: 4,
    step: 1,
    description: '一次生成的图片数量'
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
};

// Preset configurations for common model types
export const MODEL_PRESETS = {
  // Google Gemini 2.5 Flash Image (仅支持aspectRatio)
  GEMINI_2_5_FLASH_IMAGE: {
    supportedParams: ['aspectRatio', 'numberOfImages', 'responseModalities', 'refImagesEnabled'],
    defaults: {
      aspectRatio: '1:1',
      numberOfImages: 1,
      responseModalities: ['IMAGE'],
      refImagesEnabled: true,
    },
    maxRefImages: 2,  // 最多2张参考图
    description: 'Gemini 2.5 Flash Image（仅支持比例，不支持分辨率，最多2张参考图）'
  },

  // Google Gemini 3 Pro Image Preview (支持aspectRatio + imageSize)
  GEMINI_3_PRO_IMAGE: {
    supportedParams: ['aspectRatio', 'imageSize', 'numberOfImages', 'responseModalities', 'refImagesEnabled'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
      numberOfImages: 1,
      responseModalities: ['IMAGE'],
      refImagesEnabled: true,
    },
    maxRefImages: 14,  // 最多14张参考图
    description: 'Gemini 3 Pro Image Preview（支持比例和分辨率，最多14张参考图）'
  },

  // Google Gemini via OpenRouter (OpenAI-compatible)
  GEMINI_OPENROUTER: {
    supportedParams: ['aspectRatio', 'imageSize', 'numberOfImages', 'responseModalities', 'refImagesEnabled'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
      numberOfImages: 1,
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
    supportedParams: ['aspectRatio', 'imageSize', 'numberOfImages', 'refImagesEnabled'],
    defaults: {
      aspectRatio: '1:1',
      imageSize: '1K',
      numberOfImages: 1,
      refImagesEnabled: true,
    },
    maxRefImages: 10,  // 通用默认10张
    description: '通用OpenAI兼容接口'
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

  const isOpenRouter = baseUrl && baseUrl.includes('openrouter.ai');
  const isOfficialOpenAI = providerType === 'OPENAI' && !baseUrl;

  if (isGoogleOfficial) {
    // Google Gemini Official SDK
    // Supports: responseModalities, numberOfImages, imageConfig (aspectRatio, imageSize)

    // responseModalities: must be uppercase for Google API
    if (params.responseModalities) {
      mappedParams.responseModalities = Array.isArray(params.responseModalities)
        ? params.responseModalities.map((m: string) => m.toUpperCase())
        : [params.responseModalities.toUpperCase()];
    }

    // numberOfImages
    if (params.numberOfImages) {
      mappedParams.numberOfImages = parseInt(params.numberOfImages) || 1;
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
  } else if (isOpenRouter || (providerType === 'GEMINI' && baseUrl)) {
    // OpenRouter or other OpenAI-compatible Gemini endpoints
    if (params.aspectRatio) {
      mappedParams.aspectRatio = params.aspectRatio;
    }
    if (params.imageSize) {
      mappedParams.imageSize = params.imageSize;
    }
    if (params.numberOfImages) {
      mappedParams.numberOfImages = parseInt(params.numberOfImages) || 1;
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
    if (params.numberOfImages) mappedParams.numberOfImages = parseInt(params.numberOfImages) || 1;
    if (params.quality) mappedParams.quality = params.quality;
    if (params.style) mappedParams.style = params.style;
    if (params.refImages) mappedParams.refImages = params.refImages;
  }

  return mappedParams;
}
