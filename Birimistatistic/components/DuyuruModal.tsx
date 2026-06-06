import React, { useEffect, useState, useCallback } from 'react';
import { Megaphone, X } from 'lucide-react';

interface Props {
  metin: string;
  onClose: () => void;
}

const DuyuruModal: React.FC<Props> = ({ metin, onClose }) => {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prev;
    };
  }, [handleKey]);

  return (
    <div
      className={`fixed inset-0 z-[95] flex items-center justify-center p-4 transition-all duration-300 ${
        entered ? 'bg-[#001E2B]/75 backdrop-blur-sm' : 'bg-transparent'
      }`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-sky-200 dark:border-sky-700 overflow-hidden transition-all duration-300 ease-out ${
          entered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="duyuru-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50/80 via-transparent to-emerald-50/50 dark:from-sky-950/40 dark:to-emerald-950/20 pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="Duyuruyu kapat"
        >
          <X size={20} />
        </button>

        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-5 pr-8">
            <div className="p-3 rounded-2xl bg-sky-100 dark:bg-sky-900/50 shadow-inner">
              <Megaphone className="text-sky-600 dark:text-sky-400" size={26} />
            </div>
            <div>
              <h2
                id="duyuru-modal-title"
                className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight"
              >
                Kurumsal duyuru
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                Yeni yayın — bir kez gösterilir; sonra üst bantta kalır.
              </p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
            {metin}
          </p>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black shadow-lg shadow-sky-900/20 transition-colors"
            >
              Anladım
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuyuruModal;
