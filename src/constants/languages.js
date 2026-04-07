/**
 * Language options used in source and target dropdowns.
 * code: ISO 639-1 code used by both Whisper and LibreTranslate
 * label: display name
 */

export const SOURCE_LANGUAGES = [
  { code: 'auto', label: 'Auto-detect' },
  { code: 'en',   label: 'English' },
  { code: 'bn',   label: 'Bengali (Bangla)' },
  { code: 'hi',   label: 'Hindi' },
  { code: 'ar',   label: 'Arabic' },
  { code: 'zh',   label: 'Chinese' },
  { code: 'fr',   label: 'French' },
  { code: 'de',   label: 'German' },
  { code: 'id',   label: 'Indonesian' },
  { code: 'it',   label: 'Italian' },
  { code: 'ja',   label: 'Japanese' },
  { code: 'ko',   label: 'Korean' },
  { code: 'pl',   label: 'Polish' },
  { code: 'pt',   label: 'Portuguese' },
  { code: 'ru',   label: 'Russian' },
  { code: 'es',   label: 'Spanish' },
  { code: 'th',   label: 'Thai' },
  { code: 'tr',   label: 'Turkish' },
  { code: 'uk',   label: 'Ukrainian' },
  { code: 'vi',   label: 'Vietnamese' },
]

export const TARGET_LANGUAGES = [
  { code: 'en',   label: 'English' },
  { code: 'bn',   label: 'Bengali (Bangla)' },
  { code: 'hi',   label: 'Hindi' },
  { code: 'ar',   label: 'Arabic' },
  { code: 'zh',   label: 'Chinese' },
  { code: 'fr',   label: 'French' },
  { code: 'de',   label: 'German' },
  { code: 'it',   label: 'Italian' },
  { code: 'ja',   label: 'Japanese' },
  { code: 'ko',   label: 'Korean' },
  { code: 'pt',   label: 'Portuguese' },
  { code: 'ru',   label: 'Russian' },
  { code: 'es',   label: 'Spanish' },
]

export const DEFAULT_SETTINGS = {
  whisperUrl:   import.meta.env.VITE_WHISPER_URL   || 'http://localhost:8080/v1/audio/transcriptions',
  translateUrl: import.meta.env.VITE_TRANSLATE_URL  || 'http://localhost:5050/translate',
  srcLang:      'auto',
  tgtLang:      'en',
  chunkSec:     30,
  concurrency:  1,
  doTranslate:  true,
  showOriginal: false,
}
