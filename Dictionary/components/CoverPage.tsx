
import React from 'react';
import { CoverConfig } from '../types';

interface Props {
  config: CoverConfig;
}

const CoverPage: React.FC<Props> = ({ config }) => {
  return (
    <div className="page-block">
      <div
        id="cover-page"
        className="inner-page-container !p-0 flex flex-col items-center justify-between relative overflow-hidden shadow-none"
        style={{
          backgroundColor: config.backgroundColor || '#2c3e50',
          color: config.textColor || '#ffffff'
        }}
      >
        {/* Arka Plan Süslemesi */}
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-black rounded-full blur-3xl"></div>
        </div>

        {/* Üst Kısım: Başlık Grubu */}
        <div className="text-center z-20 pt-24 px-12 w-full">
          <div className="w-16 h-1 bg-rose-500 mx-auto mb-8 rounded-full"></div>
          <h1 className="text-5xl font-black font-heading uppercase leading-[1.1] tracking-tighter mb-4 whitespace-pre-line drop-shadow-md">
            {config.title || "SÖZLÜK\nBAŞLIĞI"}
          </h1>
          <p className="text-lg font-light font-heading opacity-80 tracking-[0.4em] uppercase italic">
            {config.subtitle || "Kapsamlı Rehber"}
          </p>
        </div>

        {/* Orta Kısım: AI Görseli */}
        <div className="flex-grow flex items-center justify-center w-full px-12 z-10">
          {config.backgroundImageUrl ? (
            <div className="relative group w-full max-w-md aspect-square">
              <div className="absolute inset-0 bg-white/10 rounded-3xl blur-xl group-hover:blur-2xl transition-all"></div>
              <img
                src={config.backgroundImageUrl}
                alt="AI Cover Art"
                className="relative w-full h-full object-cover rounded-3xl shadow-2xl border border-white/20 transform rotate-1"
              />
              <div className="absolute -inset-2 border-2 border-white/10 rounded-[36px] pointer-events-none"></div>
            </div>
          ) : (
            <div className="w-64 h-64 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center italic text-xs opacity-30 text-center px-10">
              Başlığa uygun görsel oluşturmak için tasarım panelini kullanın
            </div>
          )}
        </div>

        {/* Alt Kısım: Yazar & Edisyon */}
        <div className="w-full text-center pb-20 z-20 bg-gradient-to-t from-black/20 to-transparent pt-10">
          <p className="text-xl font-bold tracking-[0.5em] mb-3 uppercase">
            {config.editionYear || "2025/2026 EDİSYONU"}
          </p>
          <div className="flex items-center justify-center space-x-4 opacity-50">
            <div className="h-[1px] w-8 bg-current"></div>
            <span className="text-[10px] font-black tracking-[0.2em] uppercase">{config.professionalText || "Profesyonel Baskı"}</span>
            <div className="h-[1px] w-8 bg-current"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverPage;
