
import React from 'react';
import PageWrapper from './PageWrapper';
import { DictionarySettings, CoverConfig } from '../types';

interface Props {
  text: string;
  settings: DictionarySettings;
  cover: CoverConfig;
}

const ForewordPage: React.FC<Props> = ({ text, settings, cover }) => {
  if (!text.trim()) return null;

  return (
    <PageWrapper settings={settings} coverLogo={cover.logoUrl} pageIndex={2}>
      <div className="max-w-full h-full pt-4">
        <h2 className="text-3xl font-heading font-black mb-10 text-slate-900 border-b-4 border-rose-500 inline-block pr-8 pb-2 uppercase tracking-tighter">
          Önsöz
        </h2>
        <div className="text-xl leading-[1.8] text-slate-800 whitespace-pre-line text-justify italic font-serif opacity-90">
          {text}
        </div>
      </div>
    </PageWrapper>
  );
};

export default ForewordPage;
