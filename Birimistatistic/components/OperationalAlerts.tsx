import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, Info } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useBirimler } from '../contexts/BirimlerContext';
import { fetchOperationalAlerts, type OperationalAlert } from '../services/quality-service';

const DISMISS_KEY = 'operational_alerts_dismissed';

function loadDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

const OperationalAlerts: React.FC = () => {
  const user = useUser();
  const { birimler } = useBirimler();
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOperationalAlerts(user, birimler).then((list) => {
      if (!cancelled) {
        setAlerts(list);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, birimler.join('|')]);

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (loading || visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  return (
    <div className="mb-6 space-y-3">
      {visible.map((a) => (
        <div
          key={a.id}
          className={`flex gap-3 p-4 rounded-2xl border ${
            a.severity === 'warning'
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-100'
              : 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-100'
          }`}
        >
          {a.severity === 'warning' ? (
            <AlertTriangle className="shrink-0 mt-0.5" size={22} />
          ) : (
            <Info className="shrink-0 mt-0.5" size={22} />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{a.title}</p>
            <p className="text-sm mt-1 opacity-90 leading-relaxed">{a.message}</p>
          </div>
          <button
            type="button"
            onClick={() => dismiss(a.id)}
            className="shrink-0 p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-opacity"
            title="Bu oturumda gizle"
            aria-label="Uyarıyı gizle"
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default OperationalAlerts;
