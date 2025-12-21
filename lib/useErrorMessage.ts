'use client';

import { useLanguage } from '@/components/LanguageProvider';
import { parseErrorCode } from './errors';

/**
 * Hook to convert error codes to localized messages
 */
export function useErrorMessage() {
  const { t } = useLanguage();

  return function getErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);

    // Try to parse error code
    const parsed = parseErrorCode(message);
    if (!parsed) return message; // Not error code format, return as-is

    const { code, extra } = parsed;

    // Look up translation
    let translated = t(`errors.${code}`);
    if (!translated || translated === `errors.${code}`) {
      // No translation found, return code + extra
      return extra ? `${code}: ${extra}` : code;
    }

    // Replace {0} placeholder
    if (extra) {
      translated = translated.replace('{0}', extra);
    }

    return translated;
  };
}
