import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  getOrtakKategoriler,
  getAllBirimOzelMap,
  mergeKategoriler,
  getBirimOzelKategoriler
} from '../kategoriler-service';
import { ISLEM_TURLERI as DEFAULT_ORTAK } from '../constants';

interface KategorilerCtx {
  ortak: string[];
  birimOzelMap: Record<string, string[]>;
  loading: boolean;
  reload: () => Promise<void>;
  getForBirim: (birim: string) => string[];
  getPartsForBirim: (birim: string) => { ortak: string[]; birimOzel: string[]; birlesik: string[] };
}

const Ctx = createContext<KategorilerCtx>({
  ortak: [...DEFAULT_ORTAK],
  birimOzelMap: {},
  loading: true,
  reload: async () => {},
  getForBirim: (birim) => mergeKategoriler([...DEFAULT_ORTAK], []),
  getPartsForBirim: (birim) => ({
    ortak: [...DEFAULT_ORTAK],
    birimOzel: [],
    birlesik: mergeKategoriler([...DEFAULT_ORTAK], [])
  })
});

export function KategorilerProvider({ children }: { children: React.ReactNode }) {
  const [ortak, setOrtak] = useState<string[]>([...DEFAULT_ORTAK]);
  const [birimOzelMap, setBirimOzelMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [o, m] = await Promise.all([getOrtakKategoriler(), getAllBirimOzelMap()]);
    setOrtak(o);
    setBirimOzelMap(m);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const getPartsForBirim = useCallback(
    (birim: string) => {
      const birimOzel = birimOzelMap[birim] || [];
      return { ortak, birimOzel, birlesik: mergeKategoriler(ortak, birimOzel) };
    },
    [ortak, birimOzelMap]
  );

  const getForBirim = useCallback(
    (birim: string) => getPartsForBirim(birim).birlesik,
    [getPartsForBirim]
  );

  return (
    <Ctx.Provider value={{ ortak, birimOzelMap, loading, reload, getForBirim, getPartsForBirim }}>
      {children}
    </Ctx.Provider>
  );
}

export function useKategoriler(): KategorilerCtx {
  return useContext(Ctx);
}

/** Seçili birim için güncel birim-özel listesini Firestore'dan yenile (form açılışında). */
export async function refreshBirimKategoriler(
  birim: string,
  setMap: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
): Promise<string[]> {
  const list = await getBirimOzelKategoriler(birim);
  setMap((prev) => ({ ...prev, [birim]: list }));
  return list;
}
