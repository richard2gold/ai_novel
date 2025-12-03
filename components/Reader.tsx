import React, { useEffect, useState, useRef } from 'react';
import { Settings, ArrowLeft, ChevronLeft, ChevronRight, X, Type, Wifi, RefreshCw, Layout, Smartphone, Monitor } from 'lucide-react';
import { Novel, Chapter, ReaderSettings, DEFAULT_SETTINGS } from '../types';
import { generateChapterContent, preloadChapter } from '../services/geminiService';

interface ReaderProps {
  novel: Novel;
  initialChapterIndex: number;
  sourceName?: string;
  onBack: () => void;
}

const THEME_STYLES = {
  light: {
    id: 'light',
    name: '纸张',
    container: 'bg-paper-50 text-ink-900',
    header: 'bg-paper-50/95 border-paper-200',
    preview: 'bg-paper-50 border-gray-200'
  },
  sepia: {
    id: 'sepia',
    name: '怀旧',
    container: 'bg-[#f6f2e0] text-[#554636]',
    header: 'bg-[#f6f2e0]/95 border-[#e6dec5]',
    preview: 'bg-[#f6f2e0] border-[#e6dec5]'
  },
  green: {
    id: 'green',
    name: '护眼',
    container: 'bg-[#C7EDCC] text-[#2F4F2F]', // Classic Eye Protection Green
    header: 'bg-[#C7EDCC]/95 border-[#B0D6B5]',
    preview: 'bg-[#C7EDCC] border-[#B0D6B5]'
  },
  dark: {
    id: 'dark',
    name: '夜间',
    container: 'bg-[#1a1a1a] text-[#999]',
    header: 'bg-[#1a1a1a]/95 border-[#333]',
    preview: 'bg-[#1a1a1a] border-gray-600'
  }
};

const WIDTH_OPTIONS = [
  { id: 'max-w-2xl', label: '窄', icon: Smartphone },
  { id: 'max-w-3xl', label: '标准', icon: Layout },
  { id: 'max-w-5xl', label: '宽', icon: Monitor },
  { id: 'max-w-full', label: '全屏', icon: Layout },
];

export const Reader: React.FC<ReaderProps> = ({ novel, initialChapterIndex, sourceName, onBack }) => {
  const [chapterIndex, setChapterIndex] = useState(initialChapterIndex);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  
  // Auto-switch Source State
  const [currentSourceName, setCurrentSourceName] = useState(sourceName || '智能优选源');
  const [retryCount, setRetryCount] = useState(0);
  const [isAutoSwitching, setIsAutoSwitching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentTheme = THEME_STYLES[settings.theme as keyof typeof THEME_STYLES] || THEME_STYLES.light;

  // Reset retry state when chapter changes
  useEffect(() => {
    setRetryCount(0);
    setIsAutoSwitching(false);
    setCurrentSourceName(sourceName || '智能优选源');
  }, [chapterIndex, sourceName]);

  useEffect(() => {
    const loadChapter = async () => {
      setLoading(true);
      
      // If not auto-switching (first load of chapter), scroll to top
      if (!isAutoSwitching) {
        window.scrollTo(0, 0);
      }

      try {
        // Simulate a slight delay for "Switching Source" effect if retrying
        if (retryCount > 0) {
          await new Promise(r => setTimeout(r, 1500));
        }

        const data = await generateChapterContent(novel.title, chapterIndex);
        
        // Mock error check: In real app, check api status. 
        // Here we simulate checking if content is valid
        if (data.id === 'error' || data.content.length < 50) {
          throw new Error("Content load failed");
        }

        setChapter(data);
        setIsAutoSwitching(false); // Success, stop switching
      } catch (e) {
        console.error("Failed to load chapter", e);
        
        // Auto-Switch Logic
        if (retryCount < 3) {
          setIsAutoSwitching(true);
          setRetryCount(prev => prev + 1);
          setCurrentSourceName(`备用线路 ${retryCount + 1}`);
          // The effect will not re-run automatically unless we depend on retryCount
          // but relying on dependency for retry logic can be tricky.
          // However, since we updated state, we need to trigger re-fetch.
          // We will use a separate effect or just dependency array.
        } else {
          setChapter(null); // Final failure
          setIsAutoSwitching(false);
        }
      } finally {
        if (retryCount >= 3 || (!isAutoSwitching && chapter)) {
           setLoading(false);
        }
        // If we are auto-switching (retryCount < 3 and error happened), we stay "loading" visually
        // until the next attempt finishes or fails.
      }
    };

    loadChapter();
    
    // Preload next 5 chapters in background (only on first attempt)
    if (retryCount === 0) {
      for (let i = 1; i <= 5; i++) {
        preloadChapter(novel.title, chapterIndex + i);
      }
    }
  }, [novel.title, chapterIndex, retryCount]); // Re-run when retryCount increments

  const nextChapter = () => setChapterIndex(prev => prev + 1);
  const prevChapter = () => setChapterIndex(prev => Math.max(0, prev - 1));

  return (
    <div className={`min-h-screen transition-colors duration-300 ${currentTheme.container} ${settings.fontFamily}`}>
      {/* Sticky Header */}
      <div className={`sticky top-0 z-40 flex items-center justify-between px-4 py-3 shadow-sm backdrop-blur-md transition-all duration-300 border-b ${currentTheme.header}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
             <h2 className="text-sm font-bold truncate max-w-[150px] sm:max-w-md">{novel.title}</h2>
             <div className="flex items-center gap-2">
                <span className="text-xs opacity-70">第 {chapterIndex + 1} 章</span>
                <span className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/5 opacity-60 ${isAutoSwitching ? 'animate-pulse text-accent-red bg-red-50' : ''}`}>
                  {isAutoSwitching ? <RefreshCw className="w-2.5 h-2.5 animate-spin" /> : <Wifi className="w-2.5 h-2.5" />} 
                  {currentSourceName.split(' ')[0]}
                </span>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-6 bg-white dark:bg-[#222] shadow-2xl border-t border-gray-200 dark:border-gray-700 rounded-t-2xl sm:inset-auto sm:top-16 sm:right-4 sm:bottom-auto sm:w-80 sm:rounded-xl">
          <div className="flex justify-between items-center mb-6 text-gray-900 dark:text-gray-100">
            <h3 className="font-bold flex items-center gap-2 text-sm"><Type className="w-4 h-4"/> 阅读设置</h3>
            <button onClick={() => setShowSettings(false)} className="hover:text-accent-red"><X className="w-5 h-5" /></button>
          </div>
          
          <div className="space-y-6">
            {/* Theme */}
            <div>
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-medium">背景主题</p>
              <div className="flex gap-4">
                {Object.values(THEME_STYLES).map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSettings(s => ({ ...s, theme: theme.id as any }))}
                    className={`flex flex-col items-center gap-2 group`}
                  >
                    <div className={`w-12 h-12 rounded-full border-2 transition-all ${theme.preview} ${settings.theme === theme.id ? 'ring-2 ring-accent-red ring-offset-2 dark:ring-offset-[#222] scale-110 shadow-md' : 'border-opacity-50 hover:scale-105'}`} />
                    <span className={`text-[10px] ${settings.theme === theme.id ? 'text-accent-red font-bold' : 'text-gray-500'}`}>{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">字号</p>
                <span className="text-xs font-mono text-gray-500">{settings.fontSize}px</span>
              </div>
              <input 
                type="range" 
                min="14" max="32" step="2"
                value={settings.fontSize}
                onChange={(e) => setSettings(s => ({ ...s, fontSize: Number(e.target.value) }))}
                className="w-full accent-accent-red h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>小</span>
                <span>大</span>
              </div>
            </div>

            {/* Font Family */}
            <div>
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-medium">字体</p>
              <div className="grid grid-cols-3 gap-2">
                 {[
                   { id: 'font-serif', name: '宋体' },
                   { id: 'font-sans', name: '黑体' },
                   { id: 'font-kaiti', name: '楷体' }
                 ].map(f => (
                    <button 
                      key={f.id}
                      onClick={() => setSettings(s => ({...s, fontFamily: f.id as any}))}
                      className={`px-2 py-2 text-sm border rounded-lg transition-all ${
                        settings.fontFamily === f.id 
                        ? 'border-accent-red text-accent-red bg-red-50 dark:bg-red-900/20' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {f.name}
                    </button>
                 ))}
              </div>
            </div>

             {/* Width Control */}
             <div>
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-medium">页面宽度</p>
              <div className="grid grid-cols-4 gap-2">
                {WIDTH_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button 
                      key={opt.id}
                      onClick={() => setSettings(s => ({...s, width: opt.id as any}))}
                      className={`flex flex-col items-center justify-center py-2 border rounded-lg transition-all ${
                        settings.width === opt.id
                        ? 'border-accent-red text-accent-red bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="text-[10px]">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

             {/* Spacing */}
             <div>
              <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide font-medium">间距</p>
              <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                {[1.5, 1.8, 2.2].map(h => (
                   <button 
                   key={h}
                   onClick={() => setSettings(s => ({...s, lineHeight: h}))}
                   className={`flex-1 py-1.5 text-xs rounded-md transition-all ${
                     settings.lineHeight === h 
                     ? 'bg-white dark:bg-gray-700 text-accent-red shadow-sm font-bold' 
                     : 'text-gray-500 hover:text-gray-700'
                   }`}>
                   {h}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`mx-auto px-4 py-8 min-h-[80vh] transition-all duration-300 ${settings.width}`} ref={containerRef}>
        {(loading || isAutoSwitching) ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
             {isAutoSwitching ? (
               <>
                 <RefreshCw className="w-10 h-10 text-accent-red animate-spin mb-4" />
                 <p className="text-gray-500 font-medium">加载失败，正在尝试自动换源...</p>
                 <p className="text-xs text-gray-400 mt-2">已切换至：{currentSourceName}</p>
               </>
             ) : (
               <div className="w-full space-y-6 mt-10">
                  <div className="h-10 bg-current opacity-5 rounded w-2/3 mx-auto mb-12"></div>
                  {[1,2,3,4,5,6,7,8].map(i => (
                    <div key={i} className="h-4 bg-current opacity-5 rounded w-full"></div>
                  ))}
               </div>
             )}
          </div>
        ) : chapter ? (
          <article className="animate-fade-in">
            <h1 className="text-3xl sm:text-4xl font-bold mb-10 text-center leading-relaxed tracking-wide opacity-90">{chapter.title}</h1>
            <div 
              className="text-justify whitespace-pre-wrap leading-relaxed opacity-90"
              style={{ 
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                letterSpacing: `${settings.letterSpacing}px`
              }}
            >
              {chapter.content}
            </div>
          </article>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 text-red-500 opacity-80">
            <Wifi className="w-10 h-10 mb-4 opacity-50"/>
            <p>内容加载失败</p>
            <p className="text-xs text-gray-400 mt-2 mb-4">所有书源均无法连接，请检查网络</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-black/5 rounded-full text-sm hover:bg-black/10 transition-colors">点击重试</button>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className={`py-12 border-t mt-12 transition-colors duration-300 ${
        settings.theme === 'dark' ? 'border-gray-800' : 'border-black/5'
      }`}>
        <div className="max-w-3xl mx-auto flex justify-between px-6 gap-4">
          <button 
            onClick={prevChapter}
            disabled={chapterIndex === 0}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-medium text-sm sm:text-base"
          >
            <ChevronLeft className="w-5 h-5" /> 上一章
          </button>
          <button 
             onClick={nextChapter}
             className="flex-[2] flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-accent-red text-white hover:bg-red-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all font-bold text-sm sm:text-base"
          >
            下一章 <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};