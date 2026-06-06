
export interface DictionaryEntry {
  word: string;
  definition: string;
  type?: string;
  example?: string;
}

export interface CoverConfig {
  title: string;
  subtitle: string;
  author: string;
  editionYear?: string;
  professionalText?: string;
  logoUrl?: string;
  backgroundImageUrl?: string; // AI tarafından üretilen görsel
  backgroundColor: string;
  textColor: string;
}

export type Alignment = 'left' | 'center' | 'right';
export type PageNumberPosition =
  | 'header-left' | 'header-center' | 'header-right'
  | 'footer-left' | 'footer-center' | 'footer-right'
  | 'none';

export interface DictionarySettings {
  columns: number;
  fontSize: number;
  showAlphabetHeaders: boolean;
  showPageNumbers: boolean;
  showGuidelines: boolean;
  forewordText: string;
  abbreviationsText: string;
  headerText: string;
  headerAlignment: Alignment;
  headerShowLogo: boolean;
  footerText: string;
  footerAlignment: Alignment;
  pageNumberPosition: PageNumberPosition;
}
