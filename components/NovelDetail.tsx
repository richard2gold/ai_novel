
import React, { useState, useEffect } from 'react';
import { Novel, NovelSource } from '../types';
import { generateEpubSummary } from '../services/geminiService';
import { Download, Play, Wifi, ArrowLeft, CheckCircle, Package, Zap, Loader2 } from 'lucide-react';

interface NovelDetailProps {
  novel: Novel;
  onRead: (sourceName: string) => void;
  onBack: () => void;
}

export const NovelDetail: React.FC<NovelDetailProps> = ({ novel, onRead, onBack }) => {
  const [sources, setSources] = useState<NovelSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isPackaging, setIsPackaging] = useState(false);
  const [packageProgress, setPackageProgress] = useState(0);

  useEffect(() => {
    // Simulate source pinging
    const mockSources: NovelSource[] = [
      { id: 'src1', name: '起点中文网 (官方正版)', latencyMs: Math.floor(Math.random() * 50) + 10, quality: 100, isOfficial: true },
      { id: 'src2', name: '纵横中文网 (快速镜像)', latencyMs: Math.floor(Math.random() * 80) + 30, quality: 90, isOfficial: false },
      { id: 'src3', name: '笔趣阁 (极速源)', latencyMs: Math.floor(Math.random() * 200) + 20, quality: 80, isOfficial: false },
      { id: 'src4', name: '免费小说节点 1', latencyMs: Math.floor(Math.random() * 500) + 100, quality: 60, isOfficial: false },
    ].sort((a, b) => a.latencyMs - b.latencyMs); // Auto-sort by speed
    
    setSources(mockSources);
    setSelectedSourceId(mockSources[0].id); // Auto-select fastest
  }, []);

  const getSelectedSource = () => sources.find(s => s.id === selectedSourceId);

  const handleRead = () => {
    const source = getSelectedSource();
    onRead(source ? source.name : '智能优选源');
  };

  const handleDownloadEpub = async () => {
    const source = getSelectedSource();
    if (!source) return;

    setIsPackaging(true);
    setPackageProgress(5);
    
    // Step 1: Connect to Source
    await new Promise(r => setTimeout(r, 800));
    setPackageProgress(20);

    // Step 2: Analyze
    const summary = await generateEpubSummary(novel.title);
    setPackageProgress(70);

    // Step 3: Create Blob
    const content = `
书籍名称: ${novel.title}
作者: ${novel.author}
分类: ${novel.category}
生成工具: 墨卷智能阅读器

=== 书源信息 ===
下载源: ${source.name}
连接延迟: ${source.latencyMs}ms
是否官方: ${source.isOfficial ? '是' : '否'}

=== 智能全本简介 ===
${summary}

=== 章节预览 ===
(此处为智能压缩后的预览内容，完整2000+章内容请使用墨卷APP阅读)
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Download
    setPackageProgress(100);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${novel.title}_[${source.name}]_智能精校版.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => setIsPackaging(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-ink-900 mb-8 transition-colors">
        <ArrowLeft className="w-5 h-5" /> 返回书架
      </button>

      <div className="grid md:grid-cols-12 gap-10">
        {/* Cover Section */}
        <div className="md:col-span-4 lg:col-span-3">
          <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-2xl relative group">
            <img src={novel.coverUrl} alt={novel.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          </div>
          <div className="mt-6 space-y-3">
             <button 
                onClick={handleRead}
                className="w-full py-3 bg-accent-red text-white rounded-lg font-bold shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2"
             >
               <Play className="w-5 h-5 fill-current" /> 立即阅读
             </button>
             <button 
                onClick={handleDownloadEpub}
                disabled={isPackaging || !selectedSourceId}
                className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 relative overflow-hidden ${
                  isPackaging 
                    ? 'bg-paper-100 border border-transparent cursor-not-allowed' 
                    : 'bg-white border border-gray-200 text-ink-900 hover:bg-gray-50 shadow-sm'
                }`}
             >
                {isPackaging ? (
                   <>
                    {/* Background Progress Fill */}
                    <div 
                      className="absolute inset-0 bg-green-500/10 transition-all duration-300 ease-out" 
                      style={{width: `${packageProgress}%`}}
                    ></div>
                    
                    {/* Content */}
                    <div className="relative z-10 flex items-center gap-2 text-sm text-green-800 font-medium">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>正在智能打包... {packageProgress}%</span>
                    </div>

                    {/* Bottom Progress Line */}
                     <div 
                      className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-300 ease-out" 
                      style={{width: `${packageProgress}%`}}
                    ></div>
                   </>
                ) : (
                   <>
                    <Package className="w-5 h-5" /> 智能全本打包
                   </>
                )}
             </button>
             <p className="text-xs text-center text-gray-400 mt-2">
               *智能打包将优先使用下方选中的“{getSelectedSource()?.name.split(' ')[0]}”进行加速。
             </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="md:col-span-8 lg:col-span-9 space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 bg-accent-red/10 text-accent-red text-xs font-bold rounded uppercase tracking-wider">{novel.category}</span>
              <span className="text-sm text-gray-400">{novel.status}</span>
            </div>
            <h1 className="text-4xl font-bold font-serif text-ink-900 mb-2">{novel.title}</h1>
            <p className="text-lg text-gray-500 mb-4">作者： <span className="text-ink-900 font-medium">{novel.author}</span></p>
            <div className="flex items-center gap-1 text-accent-gold">
               {[1,2,3,4,5].map(i => <span key={i} className="text-xl">★</span>)}
               <span className="text-gray-400 text-sm ml-2">({novel.rating} 分)</span>
            </div>
          </div>

          <div className="prose prose-lg text-gray-600">
            <h3 className="text-ink-900 font-bold mb-2">作品简介</h3>
            <p>{novel.description}</p>
          </div>

          {/* Smart Source Selection */}
          <div className="bg-paper-100 rounded-xl p-6 border border-paper-200">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-ink-900 flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-accent-red" />
                  智能书源优选
                </h3>
                <span className="text-xs text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                   <Zap className="w-3 h-3" /> 已自动优化连接
                </span>
             </div>
             
             <div className="space-y-3">
               {sources.map(source => (
                 <div 
                   key={source.id}
                   onClick={() => setSelectedSourceId(source.id)}
                   className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all border relative overflow-hidden ${
                     selectedSourceId === source.id 
                       ? 'bg-white border-accent-red shadow-md' 
                       : 'bg-white/50 border-transparent hover:bg-white'
                   }`}
                 >
                    <div className="flex items-center gap-3 z-10">
                      <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm ${source.latencyMs < 50 ? 'bg-green-500' : source.latencyMs < 200 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                      <div className="flex flex-col">
                        <span className={`font-medium ${selectedSourceId === source.id ? 'text-ink-900' : 'text-gray-600'}`}>
                          {source.name}
                        </span>
                        {source.isOfficial && <span className="text-[10px] text-accent-red bg-red-50 px-1 rounded w-fit mt-0.5">官方正版</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 z-10">
                       <span className={`text-sm font-mono ${source.latencyMs < 50 ? 'text-green-600' : 'text-gray-400'}`}>
                         {source.latencyMs}ms
                       </span>
                       {selectedSourceId === source.id && <CheckCircle className="w-5 h-5 text-accent-red" />}
                    </div>
                    {/* Background decoration for selected */}
                    {selectedSourceId === source.id && (
                       <div className="absolute right-0 top-0 bottom-0 w-1 bg-accent-red"></div>
                    )}
                 </div>
               ))}
             </div>
             <p className="text-xs text-gray-400 mt-4 text-right">
               * 建议优先选择绿色低延迟节点以获得流畅的阅读与下载体验。
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
