import { VERI_BASLANGIC_TARIH } from '../lib/date-policy';
import { todayIso } from '../lib/user-prefs';

/** Tüm roller için takvim alt sınırı */
export function minKayitTarihi(_admin = false): string {
  return VERI_BASLANGIC_TARIH;
}

/** Son N gün (bugün dahil), başlangıç tarihinden önceki günler atlanır */
export function getRecentDays(count: number, maxDate = todayIso(), minDate = VERI_BASLANGIC_TARIH): string[] {
  const days: string[] = [];
  const end = new Date(maxDate + 'T12:00:00');
  for (let i = 0; i < count; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    if (iso < minDate) break;
    days.push(iso);
  }
  return days;
}

export function formatGunChip(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const bugun = todayIso();
  if (iso === bugun) return 'Bugün';
  const dun = new Date();
  dun.setDate(dun.getDate() - 1);
  if (iso === dun.toISOString().split('T')[0]) return 'Dün';
  return d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function clampKayitTarihi(iso: string, _admin = false): string {
  const bugun = todayIso();
  const min = VERI_BASLANGIC_TARIH;
  let v = iso;
  if (v > bugun) v = bugun;
  if (v < min) v = min;
  if (v > bugun) v = bugun;
  return v;
}
