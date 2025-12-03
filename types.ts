
export interface Novel {
  id: string;
  title: string;
  author: string;
  category: 'Urban' | 'Historical' | 'Fantasy' | 'Other';
  description: string;
  coverUrl: string;
  tags: string[];
  status: 'Ongoing' | 'Completed';
  rating: number; // 0-10
}

export interface NovelSource {
  id: string;
  name: string;
  latencyMs: number;
  quality: number; // 0-100
  isOfficial: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  content: string; // HTML or Markdown
  number: number;
}

export interface ReaderSettings {
  fontFamily: 'font-serif' | 'font-sans' | 'font-kaiti';
  fontSize: number; // px
  lineHeight: number; // relative
  letterSpacing: number; // px
  theme: 'light' | 'sepia' | 'dark' | 'green';
  width: 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl' | 'max-w-full';
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  fontFamily: 'font-serif',
  fontSize: 18,
  lineHeight: 1.8,
  letterSpacing: 0.5,
  theme: 'sepia',
  width: 'max-w-3xl',
};

export type ViewState = 
  | { type: 'home' }
  | { type: 'search'; query: string }
  | { type: 'detail'; novel: Novel }
  | { type: 'reader'; novel: Novel; chapterIndex: number; sourceName?: string };
