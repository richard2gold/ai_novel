import React, { useEffect, useState } from 'react';
import { Novel } from '../types';
import { getRankings, searchNovels, preloadChapter } from '../services/geminiService';
import { Search, Trophy, Flame, BookOpen, Clock } from 'lucide-react';

interface HomeProps {
  onNovelSelect: (novel: Novel) => void;
  searchQuery: string;
}

const CACHE_KEY = 'mojuan_rankings_v1';
const CACHE_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours

const RankingCard = ({ novel, rank, onSelect }: { novel: Novel; rank: number; onSelect: (novel: Novel) => void }) => (
  <div 
    onClick={() => onSelect(novel)}
    className="flex gap-4 p-4 hover:bg-white hover:shadow-md rounded-xl transition-all cursor-pointer group border border-transparent hover:border-gray-100"
  >
    <div className="relative shrink-0 w-20 h-28 rounded-md overflow-hidden shadow-sm group-hover:shadow-lg transition-shadow">
      <img src={novel.coverUrl} alt={novel.title} className="w-full h-full object-cover" />
      <div className={`absolute top-0 left-0 w-6 h-6 flex items-center justify-center text-xs font-bold text-white rounded-br-lg ${rank <= 3 ? 'bg-accent-gold' : 'bg-gray-400'}`}>
        {rank}
      </div>
    </div>
    <div className="flex flex-col justify-between py-1 flex-1">
      <div>
        <h3 className="font-bold text-ink-900 group-hover:text-accent-red transition-colors line-clamp-1">{novel.title}</h3>
        <p className="text-sm text-gray-500 mt-1">{novel.author}</p>
      </div>
      <p className="text-xs text-gray-400 line-clamp-2 mt-2">{novel.description}</p>
      <div className="flex items-center gap-2 mt-2">
         <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{novel.category}</span>
         <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-accent-red rounded">{novel.rating} ★</span>
      </div>
    </div>
  </div>
);

export const Home: React.FC<HomeProps> = ({ onNovelSelect, searchQuery }) => {
  const [urbanRankings, setUrbanRankings] = useState<Novel[]>([]);
  const [historyRankings, setHistoryRankings] = useState<Novel[]>([]);
  const [searchResults, setSearchResults] = useState<Novel[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      searchNovels(searchQuery).then(results => {
        setSearchResults(results);
        setIsSearching(false);
      });
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    const loadRankings = async () => {
      let urban: Novel[] = [];
      let history: Novel[] = [];
      let loadedFromCache = false;

      // 1. Try to load from local cache
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp, urban: u, history: h } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (age < CACHE_EXPIRY && u?.length > 0 && h?.length > 0) {
            console.log("Loaded rankings from cache");
            urban = u;
            history = h;
            loadedFromCache = true;
          }
        }
      } catch (e) {
        console.error("Cache parsing error", e);
        localStorage.removeItem(CACHE_KEY);
      }

      // 2. Fetch from API if cache invalid/expired
      if (!loadedFromCache) {
        try {
          const [u, h] = await Promise.all([
            getRankings('Urban'),
            getRankings('Historical')
          ]);
          urban = u;
          history = h;
          
          // 3. Save to cache
          if (u.length > 0 && h.length > 0) {
             localStorage.setItem(CACHE_KEY, JSON.stringify({
               timestamp: Date.now(),
               urban: u,
               history: h
             }));
          }
        } catch (error) {
          console.error("Failed to load rankings", error);
        }
      }

      // Update State
      setUrbanRankings(urban);
      setHistoryRankings(history);

      // 4. PRELOAD STRATEGY
      // Preload first 2 chapters for top 6 novels in each category
      const topNovels = [...urban.slice(0, 6), ...history.slice(0, 6)];
      if (topNovels.length > 0) {
        console.log(`Starting background preload for ${topNovels.length} novels...`);
        topNovels.forEach(novel => {
          preloadChapter(novel.title, 0); // Chapter 1
          preloadChapter(novel.title, 1); // Chapter 2
        });
      }
    };
    
    loadRankings();
  }, []);

  if (searchQuery) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Search className="w-6 h-6 text-accent-red" />
          搜索结果： "{searchQuery}"
        </h2>
        {isSearching ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
             {[1,2,3,4].map(i => <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>)}
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map(novel => (
               <div 
               key={novel.id}
               onClick={() => onNovelSelect(novel)}
               className="bg-white p-4 rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-100 flex gap-4"
             >
               <img src={novel.coverUrl} alt={novel.title} className="w-24 h-32 object-cover rounded shadow" />
               <div>
                 <h3 className="font-bold text-lg text-ink-900">{novel.title}</h3>
                 <p className="text-sm text-gray-500">{novel.author}</p>
                 <p className="text-sm text-gray-600 mt-2 line-clamp-3">{novel.description}</p>
               </div>
             </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-12">
        {/* Urban Column */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-serif text-ink-900 flex items-center gap-2">
              <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
              都市·现实
            </h2>
            <button className="text-sm text-gray-500 hover:text-blue-600">查看全部</button>
          </div>
          <div className="space-y-4">
            {urbanRankings.length === 0 ? (
              <div className="space-y-4 animate-pulse">
                 {[1,2,3,4,5].map(i => <div key={i} className="h-28 bg-gray-100 rounded-xl"></div>)}
              </div>
            ) : (
              urbanRankings.slice(0, 10).map((novel, idx) => (
                <RankingCard key={novel.id} novel={novel} rank={idx + 1} onSelect={onNovelSelect} />
              ))
            )}
          </div>
        </section>

        {/* History Column */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-serif text-ink-900 flex items-center gap-2">
              <span className="w-1 h-6 bg-accent-red rounded-full"></span>
              历史·武侠
            </h2>
            <button className="text-sm text-gray-500 hover:text-accent-red">查看全部</button>
          </div>
          <div className="space-y-4">
             {historyRankings.length === 0 ? (
               <div className="space-y-4 animate-pulse">
                 {[1,2,3,4,5].map(i => <div key={i} className="h-28 bg-gray-100 rounded-xl"></div>)}
               </div>
            ) : (
              historyRankings.slice(0, 10).map((novel, idx) => (
                <RankingCard key={novel.id} novel={novel} rank={idx + 1} onSelect={onNovelSelect} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};