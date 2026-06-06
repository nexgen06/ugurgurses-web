import React, { createContext, useContext } from 'react';
import type { SessionUser } from '../types';
import {
  VERI_BASLANGIC_TARIH,
  EDITOR_GIRIS_BASLANGIC_TARIH,
  isAdminProxyAraligi
} from '../lib/date-policy';

const UserContext = createContext<SessionUser | null>(null);

export function UserProvider({ user, children }: { user: SessionUser | null; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUser(): SessionUser | null {
  return useContext(UserContext);
}

/** Veri girişi yapabilenler: admin, proje yetkilisi, editör */
export function canEnterData(user: SessionUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'proje_yetkilisi' || user?.role === 'editor';
}

/** Geriye dönük uyum (eski adıyla veri girişi yetkisi) */
export const canEdit = canEnterData;

/** Gün kesinleştirebilenler: admin, proje yetkilisi */
export function canFinalize(user: SessionUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'proje_yetkilisi';
}

/** Kesinleşmiş günün kilidini açabilenler: yalnızca admin */
export function canUnlock(user: SessionUser | null): boolean {
  return user?.role === 'admin';
}

/** Kilit açma talebi oluşturabilenler: yalnızca editör */
export function canRequestUnlock(user: SessionUser | null): boolean {
  return user?.role === 'editor';
}

/** 1–5 Haziran 2026: admin personel adına giriş (geçici) */
export function canProxyDataEntry(user: SessionUser | null, kayit_tarihi: string): boolean {
  if (!canAdmin(user)) return false;
  return isAdminProxyAraligi(kayit_tarihi);
}

/** Tarih bazlı veri giriş yetkisi */
export function canEnterDataOnDate(user: SessionUser | null, kayit_tarihi: string): boolean {
  if (!canEnterData(user)) return false;
  if (kayit_tarihi < VERI_BASLANGIC_TARIH) return false;
  if (canAdmin(user)) return true;
  if (isAdminProxyAraligi(kayit_tarihi)) return false;
  return kayit_tarihi >= EDITOR_GIRIS_BASLANGIC_TARIH;
}

export function isKayitTarihiEditorIcinKapali(kayit_tarihi: string, user: SessionUser | null): boolean {
  return canEnterData(user) && !canEnterDataOnDate(user, kayit_tarihi);
}

/** Kullanıcı/sistem yönetimi: yalnızca admin */
export function canManage(user: SessionUser | null): boolean {
  return user?.role === 'admin';
}

/** Adlı (kişi isimli) raporları görebilenler: admin, proje yetkilisi, viewer.
 *  Editör yalnızca kendi adlı verisini görür; diğer kullanıcılar anonimdir. */
export function canViewNamedReports(user: SessionUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'proje_yetkilisi' || user?.role === 'viewer';
}

export function canAdmin(user: SessionUser | null): boolean {
  return user?.role === 'admin';
}

/** Denetim günlüğü (Firestore audit_log) — admin ve proje yetkilisi */
export function canViewAudit(user: SessionUser | null): boolean {
  return canAdmin(user) || canFinalize(user);
}

/** Kullanıcının erişebileceği birimler.
 *  - admin: tüm birimler
 *  - diğer roller: yalnızca kendisine atanmış birimler (atanmamışsa boş = erişim yok) */
export function getAllowedBirimler(user: SessionUser | null, allBirimler: string[]): string[] {
  if (user?.role === 'admin') return allBirimler;
  return (user?.birimler || []).filter((b) => allBirimler.includes(b));
}

/** Admin dışında birim atanmamış kullanıcı (kapalı üyelik: yönetici atayana kadar kısıtlı). */
export function needsBirimAssignment(user: SessionUser | null): boolean {
  if (!user || user.role === 'admin') return false;
  return !(user.birimler?.length);
}
