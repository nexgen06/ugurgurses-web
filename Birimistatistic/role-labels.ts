import type { UserRole } from './types';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Yönetici (Admin)',
  proje_yetkilisi: 'Proje Yetkilisi',
  editor: 'Editör',
  viewer: 'Görüntüleyici'
};
