export type LanguageCode = 'en' | 'hu' | 'de' | 'fr' | 'es' | 'it' | 'pl' | 'uk' | 'ro' | 'nl';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}
