/**
 * Application Error Codes
 *
 * Usage:
 *   throw new Error(`[${E.MODEL_NOT_FOUND}]`);
 *   throw new Error(`[${E.API_ERROR}]${status}: ${message}`);
 */
export const E = {
  // Configuration errors
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  GEMINI_KEY_MISSING: 'GEMINI_KEY_MISSING',
  GRSAI_CONFIG_MISSING: 'GRSAI_CONFIG_MISSING',

  // Generation errors
  NO_IMAGE_RETURNED: 'NO_IMAGE_RETURNED',
  TEXT_GEN_UNSUPPORTED: 'TEXT_GEN_UNSUPPORTED',
  IMAGE_GEN_UNSUPPORTED: 'IMAGE_GEN_UNSUPPORTED',
  GENERATION_FAILED: 'GENERATION_FAILED',
  STREAM_READ_FAILED: 'STREAM_READ_FAILED',
  IMAGE_EXTRACT_FAILED: 'IMAGE_EXTRACT_FAILED',

  // API errors
  API_ERROR: 'API_ERROR',
  IMAGE_DOWNLOAD_FAILED: 'IMAGE_DOWNLOAD_FAILED',
  LOCAL_SERVICE_ERROR: 'LOCAL_SERVICE_ERROR',
  LOCAL_SERVICE_NO_IMAGE: 'LOCAL_SERVICE_NO_IMAGE',

  // Resource errors
  FOLDER_NOT_FOUND: 'FOLDER_NOT_FOUND',
  CANNOT_DELETE_DEFAULT: 'CANNOT_DELETE_DEFAULT',
  IMAGE_NOT_FOUND: 'IMAGE_NOT_FOUND',
  IMAGE_MOVE_FAILED: 'IMAGE_MOVE_FAILED',
} as const;

export type ErrorCode = typeof E[keyof typeof E];

/**
 * Extract error code and extra info from error message
 * @returns null if not in error code format
 */
export function parseErrorCode(message: string): { code: string; extra: string } | null {
  const match = message.match(/^\[([A-Z_]+)\](.*)$/);
  if (!match) return null;
  return { code: match[1], extra: match[2] };
}
