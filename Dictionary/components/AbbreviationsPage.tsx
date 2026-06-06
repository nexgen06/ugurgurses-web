
import React from 'react';
import PageWrapper from './PageWrapper';
import { DictionarySettings, CoverConfig } from '../types';

interface Props {
  text: string;
  settings: DictionarySettings;
  cover: CoverConfig;
}

const AbbreviationsPage: React.FC<Props> = ({ text, settings, cover }) => {
  if (!text.trim()) return null;

  const allLines = text.split('\n').filter(line => line.trim().includes(':') || line.trim().includes('-'));
  
  // Bir sayfaya sığacak maksimum madde sayısı (2 sütun x 22 satır = 44)
  const itemsPerPage = 44;
  const chunks: string[][] = [];
  
  for (let i = 0; i < allLines.length; i += itemsPerPage) {
    chunks.push(allLines.slice(i, i + itemsPerPage));
  }

  // Başlangıç sayfa numarası (Kapak=1, Önsöz=2 ise bu 3'ten başlar)
  const startPageIndex = settings.forewordText ? 3 : 2;

  return (
    <>
      {chunks.map((chunk, chunkIdx) => (
        <PageWrapper 
          key={chunkIdx} 
          settings={settings} 
          coverLogo={cover.logoUrl} 
          pageIndex={startPageIndex + chunkIdx}
        >
          <div className="w-full h-full pt-4">
            <h2 className="text-3xl font-heading font-black mb-10 text-slate-900 border-b-4 border-rose-500 inline-block pr-8 pb-2 uppercase tracking-tighter">
              Kısaltmalar {chunks.length > 1 ? `(${chunkIdx + 1})` : ''}
            </h2>
            <div className="grid grid-cols-2 gap-x-16 gap-y-4">
              {chunk.map((line, idx) => {
                const separator = line.includes(':') ? ':' : '-';
                const parts = line.split(separator);
                const abbr = parts[0]?.trim();
                const desc = parts.slice(1).join(separator)?.trim();
                
                return (
                  <div key={idx} className="flex border-b border-slate-100 pb-2 items-baseline group hover:border-rose-200 transition-colors">
                    <span className="font-black text-indigo-900 w-28 flex-shrink-0 font-heading text-sm tracking-widest">{abbr}</span>
                    <span className="text-slate-600 text-[13px] leading-tight italic">{desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </PageWrapper>
      ))}
    </>
  );
};

export default AbbreviationsPage;
