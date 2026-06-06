
import React from 'react';
import { DictionarySettings, CoverConfig } from '../types';

interface Props {
  settings: DictionarySettings;
  coverLogo?: string;
  pageIndex: number; // For preview mode display
  children: React.ReactNode;
}

const PageWrapper: React.FC<Props> = ({ settings, coverLogo, pageIndex, children }) => {
  const renderPageNumber = () => (
    <span className="dynamic-page-num font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded min-w-[1.5rem] text-center inline-block">
      <span className="print:hidden">{pageIndex}</span>
    </span>
  );

  const getJustifyClass = (align: string) => {
    if (align === 'center') return 'justify-center';
    if (align === 'right') return 'justify-end';
    return 'justify-start';
  };

  const renderHeader = () => {
    const isNumLeft = settings.pageNumberPosition === 'header-left';
    const isNumCenter = settings.pageNumberPosition === 'header-center';
    const isNumRight = settings.pageNumberPosition === 'header-right';

    return (
      <div className={`page-header-area ${getJustifyClass(settings.headerAlignment)} space-x-4`}>
        {isNumLeft && renderPageNumber()}
        
        <div className="flex items-center space-x-3">
          {settings.headerShowLogo && coverLogo && (
            <img src={coverLogo} alt="Header Logo" className="h-5 object-contain opacity-70" />
          )}
          {settings.headerText && <span className="uppercase tracking-widest font-semibold text-[10px]">{settings.headerText}</span>}
        </div>

        {isNumCenter && renderPageNumber()}
        {isNumRight && renderPageNumber()}
      </div>
    );
  };

  const renderFooter = () => {
    const isNumLeft = settings.pageNumberPosition === 'footer-left';
    const isNumCenter = settings.pageNumberPosition === 'footer-center';
    const isNumRight = settings.pageNumberPosition === 'footer-right';

    return (
      <div className={`page-footer-area ${getJustifyClass(settings.footerAlignment)} space-x-4`}>
        {isNumLeft && renderPageNumber()}
        {settings.footerText && <span className="uppercase tracking-widest font-semibold text-[10px]">{settings.footerText}</span>}
        {isNumCenter && renderPageNumber()}
        {isNumRight && renderPageNumber()}
      </div>
    );
  };

  return (
    <div className="page-block">
      <div className="inner-page-container">
        {renderHeader()}
        <div className="flex-grow z-10 overflow-hidden">
          {children}
        </div>
        {renderFooter()}
      </div>
    </div>
  );
};

export default PageWrapper;
