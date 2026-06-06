import React, { createContext, useContext, useState, useCallback } from 'react';

interface BreadcrumbContextType {
  suffix: string | null;
  setSuffix: (s: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | null>(null);

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [suffix, setSuffix] = useState<string | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ suffix, setSuffix }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

export function useBreadcrumb(): BreadcrumbContextType {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error('useBreadcrumb must be used within BreadcrumbProvider');
  return ctx;
}
