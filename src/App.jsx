import React, { useState, useEffect } from 'react';
import Scanner from './components/Scanner';
import ResultCard from './components/ResultCard';
import { analyzeIngredientsAsync } from './utils/aiAnalyzer';
import { Activity, ShieldCheck, Moon, Sun } from 'lucide-react';

function App() {
  const [result, setResult] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check user preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async (text) => {
    setIsAnalyzing(true);
    try {
      const analysisResult = await analyzeIngredientsAsync(text);
      if (analysisResult) {
        setResult(analysisResult);
      } else {
        alert("Geçerli bir içindekiler listesi bulunamadı. Lütfen daha net bir fotoğraf çekin veya elle girin.");
      }
    } catch (error) {
      console.error(error);
      alert("Analiz sırasında bir hata oluştu.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 flex flex-col items-center relative">
      {/* Theme Toggle */}
      <button 
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="absolute top-4 right-4 p-2 glass rounded-full text-slate-800 dark:text-slate-200 hover:scale-110 transition-transform"
        aria-label="Toggle Dark Mode"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Header */}
      <header className="mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/20 rounded-full mb-4 ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
          <Activity size={32} className="text-emerald-500 dark:text-emerald-400" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-400 dark:from-emerald-400 dark:to-teal-200 mb-2">
          Paketli Gıda İçerik Analizi
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs mx-auto">
          Paketli gıdalarınızı tarayın, ne yediğinizi saniyeler içinde öğrenin ve sağlığınızı koruyun.
        </p>
      </header>

      {/* Main Content */}
      <main className="w-full relative z-10">
        {!result ? (
          <div className="animate-in zoom-in-95 duration-500">
            <Scanner onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
          </div>
        ) : (
          <ResultCard result={result} onReset={() => setResult(null)} />
        )}
      </main>

      {/* Footer Info */}
      <footer className="mt-auto pt-12 pb-4 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center">
        <ShieldCheck size={14} className="mr-1" />
        Sadece bilgilendirme amaçlıdır. Tıbbi tavsiye yerine geçmez.
      </footer>
    </div>
  );
}

export default App;
