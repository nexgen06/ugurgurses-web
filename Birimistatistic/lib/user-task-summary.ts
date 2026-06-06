import type { SessionUser } from '../types';
import {
  canAdmin,
  canEnterData,
  canFinalize,
  canUnlock,
  needsBirimAssignment
} from '../contexts/UserContext';
import { ROLE_LABELS } from '../lib/role-labels';

function birimMetni(user: SessionUser, allBirimler: string[]): string {
  if (needsBirimAssignment(user)) return 'henüz atanmış birim yok';
  const list =
    user.role === 'admin'
      ? allBirimler
      : (user.birimler || []).filter((b) => allBirimler.includes(b));
  if (list.length === 0) return 'tanımlı birim yok';
  if (list.length === 1) return `«${list[0]}» biriminde`;
  if (list.length <= 3) return `${list.map((b) => `«${b}»`).join(', ')} birimlerinde`;
  return `${list.length} birimde (${list.slice(0, 2).join(', ')}…)`;
}

/** Yetkilerim panelinin tek cümlelik özeti — görev kartı metni */
export function buildGorevOzeti(user: SessionUser | null, allBirimler: string[]): string {
  if (!user) return '';

  const birim = birimMetni(user, allBirimler);
  const rol = ROLE_LABELS[user.role];

  if (needsBirimAssignment(user)) {
    return `Rolünüz: ${rol}. Henüz birim atanmadı; yöneticinizden birim ve rol tanımlaması isteyin.`;
  }

  if (canAdmin(user)) {
    return `Sizin göreviniz: sistem yönetimi; tüm birimlerde veri girişi, kesinleştirme ve kilit açma yetkiniz var.`;
  }

  if (user.role === 'proje_yetkilisi') {
    return `Sizin göreviniz: ${birim} veri girişi, gün kesinleştirme ve kilit açma taleplerini onaylama; kilidi yalnızca admin açar.`;
  }

  if (user.role === 'editor') {
    return `Sizin göreviniz: ${birim} veri girişi; kesinleşmiş günlerde kilit açma talebi oluşturabilirsiniz (proje yetkilisi → admin).`;
  }

  if (canEnterData(user)) {
    return `Sizin göreviniz: ${birim} veri girişi.`;
  }

  const extras: string[] = [];
  if (canFinalize(user)) extras.push('kesinleştirme');
  if (canUnlock(user)) extras.push('kilit açma');
  const ek = extras.length ? ` (${extras.join(', ')})` : '';

  return `Sizin göreviniz: ${birim} yalnızca raporları görüntüleme${ek}.`;
}
