import React from 'react';
import { AlertTriangle, Info, CheckCircle, RefreshCw } from 'lucide-react';

const ResultCard = ({ result, onReset }) => {
  if (!result) return null;

  const { score, riskLevel, color, barColor, items } = result;

  return (
    <div className="w-full max-w-md mx-auto p-6 glass rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Temizlik Analizi</h2>
        
        <div className="flex flex-col justify-center items-center my-4">
          <div className={`flex flex-col items-center justify-center w-36 h-36 rounded-full border-8 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl relative mb-4`}>
            {/* Skor etrafında hafif bir ışıma */}
            <div className={`absolute inset-0 rounded-full blur-md opacity-20 ${barColor}`}></div>
            <span className={`text-6xl font-extrabold z-10 ${color}`}>{score}</span>
            <span className="text-xs font-semibold text-slate-400 z-10 uppercase tracking-widest mt-1">Skor</span>
          </div>
          
          <h3 className={`text-xl font-bold ${color} mb-6`}>{riskLevel}</h3>

          {/* Görsel Analog Ölçek (VAS) - Kırmızıdan Yeşile */}
          <div className="w-full px-2 mb-2 relative mt-4">
            <div className="h-4 w-full rounded-full bg-gradient-to-r from-red-600 via-yellow-400 to-emerald-500 shadow-inner"></div>
            <div 
              className="absolute top-0 -ml-2.5 transition-all duration-1000 ease-out"
              style={{ left: `${score}%` }}
            >
              <div className="h-6 w-5 bg-white border-2 border-slate-800 rounded shadow-md transform -translate-y-1">
                {/* Ok işareti efekti */}
                <div className="w-1 h-3 mx-auto mt-0.5 rounded-full bg-slate-300"></div>
              </div>
            </div>
            <div className="flex justify-between w-full mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="text-red-500/80">Zararlı</span>
              <span className="text-yellow-500/80">Orta</span>
              <span className="text-emerald-500/80">Temiz</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerjen Uyarısı */}
      {result.allergens && result.allergens.length > 0 && (
        <div className="mb-6 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 shadow-sm animate-in fade-in">
          <div className="flex items-start">
            <AlertTriangle className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <h4 className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">Alerjen Uyarısı</h4>
              <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-300 space-y-1">
                {result.allergens.map((allergen, idx) => (
                  <li key={idx}>{allergen}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">İçerik Detayları</h3>
        <div className="max-h-64 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {items.map((item, idx) => (
            <div key={idx} className="bg-white/40 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-slate-800 dark:text-slate-100 flex items-center text-sm">
                  {item.score > 70 ? (
                    <AlertTriangle size={14} className="text-red-500 mr-1.5" />
                  ) : item.score < 30 ? (
                    <CheckCircle size={14} className="text-emerald-500 mr-1.5" />
                  ) : (
                    <Info size={14} className="text-yellow-500 mr-1.5" />
                  )}
                  {item.name}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full">
                  ~%{(item.weight)}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={onReset}
        className="w-full mt-6 flex items-center justify-center bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-medium py-3 rounded-xl transition-colors"
      >
        <RefreshCw size={18} className="mr-2" />
        Yeni Ürün Tara
      </button>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.6);
          border-radius: 4px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.8);
        }
      `}</style>
    </div>
  );
};

export default ResultCard;
