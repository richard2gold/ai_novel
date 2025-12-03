import { GoogleGenAI, Type } from "@google/genai";
import { Novel, Chapter } from '../types';

// Ensure API Key exists
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const PLACEHOLDER_IMGS = [
  "https://picsum.photos/300/400?random=1",
  "https://picsum.photos/300/400?random=2",
  "https://picsum.photos/300/400?random=3",
  "https://picsum.photos/300/400?random=4",
  "https://picsum.photos/300/400?random=5",
];

// --- Caching & Preloading System ---
const chapterCache = new Map<string, Chapter>();
const activeRequests = new Map<string, Promise<Chapter>>();
const preloadQueue: (() => Promise<void>)[] = [];
let activeWorkers = 0;
const CONCURRENCY_LIMIT = 3;

const processQueue = () => {
  if (preloadQueue.length === 0 || activeWorkers >= CONCURRENCY_LIMIT) return;
  
  const task = preloadQueue.shift();
  if (task) {
    activeWorkers++;
    task().finally(() => {
      activeWorkers--;
      processQueue();
    });
  }
};

export const preloadChapter = (novelTitle: string, chapterIndex: number) => {
  const key = `${novelTitle}-${chapterIndex}`;
  if (chapterCache.has(key) || activeRequests.has(key)) return;

  // Add to queue
  preloadQueue.push(async () => {
    try {
      await generateChapterContent(novelTitle, chapterIndex);
    } catch (e) {
      console.warn(`Preload failed for ${key}`, e);
    }
  });
  processQueue();
};

export const searchNovels = async (query: string): Promise<Novel[]> => {
  if (!apiKey) return [];
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Search for Chinese web novels matching the query: "${query}". 
      Return 4-6 distinct results. 
      Focus on Urban (都市) and Historical (历史) genres if not specified.
      IMPORTANT: Return all fields (title, author, description, tags) in Simplified Chinese (简体中文).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              category: { type: Type.STRING, enum: ['Urban', 'Historical', 'Fantasy', 'Other'] },
              description: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['Ongoing', 'Completed'] },
              rating: { type: Type.NUMBER },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '[]');
    return data.map((item: any, index: number) => ({
      ...item,
      coverUrl: PLACEHOLDER_IMGS[index % PLACEHOLDER_IMGS.length]
    }));
  } catch (error) {
    console.error("Search failed", error);
    return [];
  }
};

export const getRankings = async (category: 'Urban' | 'Historical'): Promise<Novel[]> => {
  if (!apiKey) return [];

  try {
    const categoryCN = category === 'Urban' ? '都市' : '历史';
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `List top 10 popular Chinese web novels in the ${categoryCN} (${category}) genre. 
      Ensure high-quality, classic, or trending titles known in China.
      IMPORTANT: Return all text in Simplified Chinese (简体中文).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              category: { type: Type.STRING, enum: ['Urban', 'Historical'] },
              description: { type: Type.STRING },
              status: { type: Type.STRING, enum: ['Ongoing', 'Completed'] },
              rating: { type: Type.NUMBER },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '[]');
    return data.map((item: any, index: number) => ({
      ...item,
      coverUrl: PLACEHOLDER_IMGS[index % PLACEHOLDER_IMGS.length]
    }));
  } catch (error) {
    console.error("Rankings failed", error);
    return [];
  }
};

export const generateChapterContent = async (novelTitle: string, chapterIndex: number, previousContext?: string): Promise<Chapter> => {
  if (!apiKey) return { id: 'error', title: 'Error', content: 'API Key missing or error.', number: 1 };

  const key = `${novelTitle}-${chapterIndex}`;

  // 1. Check Memory Cache
  if (chapterCache.has(key)) {
    // console.log(`[Cache Hit] ${key}`);
    return chapterCache.get(key)!;
  }

  // 2. Check Pending Requests (Deduplication)
  if (activeRequests.has(key)) {
    // console.log(`[Request Dedup] ${key}`);
    return activeRequests.get(key)!;
  }

  // 3. Create New Request
  const requestPromise = (async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write the content for Chapter ${chapterIndex + 1} of the Chinese novel "${novelTitle}".
        Language: Simplified Chinese (简体中文).
        Style: Authentic Chinese web novel style (网文风格), immersive, detailed description.
        Length: Approximately 1500 Chinese characters.
        Format: Return ONLY the raw text content with paragraph breaks. No JSON.
        Start with the Chapter Title (第X章 title) on the first line.`,
      });

      const text = response.text || '';
      const lines = text.split('\n');
      const title = lines[0] || `第 ${chapterIndex + 1} 章`;
      const content = lines.slice(1).join('\n');

      const chapter: Chapter = {
        id: key,
        title: title.replace(/^#+\s*/, ''),
        content: content,
        number: chapterIndex + 1
      };

      // Save to cache
      chapterCache.set(key, chapter);
      return chapter;
    } catch (error) {
      console.error("Chapter generation failed", error);
      throw error;
    } finally {
      activeRequests.delete(key);
    }
  })();

  activeRequests.set(key, requestPromise);
  
  try {
    return await requestPromise;
  } catch (e) {
    return {
      id: 'error',
      title: '生成失败',
      content: '无法生成章节内容，请检查网络后重试。',
      number: chapterIndex + 1
    };
  }
};

export const generateEpubSummary = async (novelTitle: string): Promise<string> => {
   try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Act as a professional Chinese novel editor. Summarize the plot of the novel "${novelTitle}" 
      into a high-density synopsis suitable for an EPUB metadata description. 
      Also, create a "Smart Compression" (智能精简) summary of the first 50 chapters, 
      removing filler content and highlighting key plot points.
      Output language: Simplified Chinese.`,
    });
    return response.text || "暂无简介";
  } catch (error) {
    return "生成失败";
  }
}