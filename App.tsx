
import React, { useState } from 'react';
import { Search, Book } from 'lucide-react';
import { ViewState, Novel } from './types';
import { Home } from './components/Home';
import { NovelDetail } from './components/NovelDetail';
import { Reader } from './components/Reader';

export default function App() {
  const [view, setView] = useState<ViewState>({ type: 'home' });
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setView({ type: 'search', query: searchQuery });
    } else {
      setView({ type: 'home' });
    }
  };

  const renderContent = () => {
    switch (view.type) {
      case 'home':
      case 'search':
        return (
          <Home 
            searchQuery={view.type === 'search' ? view.query : ''}
            onNovelSelect={(novel) => setView({ type: 'detail', novel })}
          />
        );
      case 'detail':
        return (
          <NovelDetail 
            novel={view.novel} 
            onRead={(sourceName) => setView({ type: 'reader', novel: view.novel, chapterIndex: 0, sourceName })}
            onBack={() => setView({ type: 'home' })}
          />
        );
      case 'reader':
        return (
           <Reader 
             novel={view.novel} 
             initialChapterIndex={view.chapterIndex}
             sourceName={view.sourceName}
             onBack={() => setView({ type: 'detail', novel: view.novel })}
           />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-paper-50 selection:bg-accent-red selection:text-white">
      {/* Top Navigation - Hide when reading */}
      {view.type !== 'reader' && (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            {/* Logo */}
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => { setView({ type: 'home' }); setSearchQuery(''); }}
            >
              <div className="w-8 h-8 bg-ink-900 rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl">
                墨
              </div>
              <span className="font-serif font-bold text-xl text-ink-900 hidden sm:block">墨卷阅读</span>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-4">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="搜索书名、作者..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-transparent rounded-full focus:bg-white focus:border-accent-red focus:ring-2 focus:ring-accent-red/20 outline-none transition-all placeholder-gray-400 text-sm"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-accent-red transition-colors" />
              </div>
            </form>

            {/* User Actions */}
            <div className="flex items-center gap-4">
              <button className="text-gray-500 hover:text-ink-900 transition-colors text-sm font-medium hidden sm:block">
                我的书架
              </button>
              <button className="w-8 h-8 rounded-full bg-accent-gold/20 text-accent-gold flex items-center justify-center font-bold text-xs">
                VIP
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main>
        {renderContent()}
      </main>
    </div>
  );
}
