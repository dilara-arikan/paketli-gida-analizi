import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { Camera, FileText, Loader2, AlertCircle, Info } from 'lucide-react';

const Scanner = ({ onAnalyze, isAnalyzing }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [manualText, setManualText] = useState("");
  const [mode, setMode] = useState('camera'); // camera or manual

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setProgress(0);

    Tesseract.recognize(
      file,
      'tur', // Turkish language
      { logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        }
      }
    ).then(({ data: { text } }) => {
      setLoading(false);
      onAnalyze(text);
    }).catch(err => {
      console.error(err);
      setLoading(false);
      alert("Metin okuma sırasında bir hata oluştu.");
    });
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualText.trim()) {
      onAnalyze(manualText);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 glass rounded-2xl">
      <div className="flex justify-center mb-6 space-x-4">
        <button 
          onClick={() => setMode('camera')}
          className={`flex items-center px-4 py-2 rounded-full transition-all ${mode === 'camera' ? 'bg-emerald-600 text-white' : 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}
        >
          <Camera size={18} className="mr-2" />
          Kamera / Fotoğraf
        </button>
        <button 
          onClick={() => setMode('manual')}
          className={`flex items-center px-4 py-2 rounded-full transition-all ${mode === 'manual' ? 'bg-emerald-600 text-white' : 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}
        >
          <FileText size={18} className="mr-2" />
          Elle Gir
        </button>
      </div>

      {mode === 'camera' ? (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-full h-48 border-2 border-dashed border-emerald-400/50 rounded-xl flex flex-col items-center justify-center bg-emerald-900/5 dark:bg-emerald-900/10 hover:bg-emerald-900/10 dark:hover:bg-emerald-900/20 transition-colors">
            {loading || isAnalyzing ? (
              <div className="flex flex-col items-center relative">
                {/* Dönen Yuvarlak Animasyon */}
                <div className="absolute inset-0 m-auto w-24 h-24 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-[spin_1.5s_linear_infinite]"></div>
                <div className="absolute inset-0 m-auto w-16 h-16 rounded-full border-4 border-teal-400/20 border-b-teal-400 animate-[spin_2s_linear_infinite_reverse]"></div>
                
                <Loader2 className="animate-spin text-emerald-500 mb-4 z-10" size={32} />
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 z-10 animate-pulse">
                  {loading ? "Taranıyor..." : "İçerik analiz ediliyor..."}
                </p>
                {loading && <p className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70 z-10 mt-1">Görsel Okunuyor (%{progress})</p>}
              </div>
            ) : (
              <>
                <Camera size={48} className="text-emerald-500 mb-2 opacity-80" />
                <p className="text-sm text-slate-600 dark:text-slate-300 text-center px-4">
                  Buraya tıklayarak ürünün arkasındaki <br/> <strong className="text-emerald-600 dark:text-emerald-400">"İçindekiler / Ingredients"</strong> <br/> kısmının net bir fotoğrafını çekin veya seçin.
                </p>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleImageUpload}
                />
              </>
            )}
          </div>

        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="flex flex-col space-y-4">
          <textarea
            className="w-full h-32 bg-white/50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-xl p-4 text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            placeholder="İçindekiler listesini virgülle ayırarak girin... (Örn: Şeker, Glikoz şurubu, Palm yağı, E250)"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleManualSubmit(e);
              }
            }}
          ></textarea>
          <button 
            type="submit"
            disabled={isAnalyzing}
            className="w-full bg-gradient-to-r flex justify-center items-center from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70"
          >
            {isAnalyzing ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
            {isAnalyzing ? "İçerik analiz ediliyor..." : "Analiz Et"}
          </button>
        </form>
      )}
    </div>
  );
};

export default Scanner;
