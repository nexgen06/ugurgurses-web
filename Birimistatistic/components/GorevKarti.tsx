import React from 'react';
import { ClipboardList } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useBirimler } from '../contexts/BirimlerContext';
import { buildGorevOzeti } from '../user-task-summary';
import { ROLE_LABELS } from '../role-labels';

const GorevKarti: React.FC = () => {
  const user = useUser();
  const { birimler } = useBirimler();
  if (!user) return null;

  const ozet = buildGorevOzeti(user, birimler);
  if (!ozet) return null;

  return (
    <div className="mb-4 flex gap-3 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
      <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 shrink-0 h-fit">
        <ClipboardList className="text-emerald-700 dark:text-emerald-400" size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
          Göreviniz · {ROLE_LABELS[user.role]}
        </p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">{ozet}</p>
      </div>
    </div>
  );
};

export default GorevKarti;
