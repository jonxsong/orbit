import { useCallback } from 'react';
import { useOrbitStore } from '../store/orbit-store';
import { translate, type TranslationKey } from './translations';

export function useI18n() {
  const language = useOrbitStore((state) => state.language);
  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(language, key, values),
    [language],
  );

  return { language, t };
}

