import React, { useState } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { transferUserRecords } from '../services/veri-devir-service';
import type { UserProfile } from '../services/users-service';

interface VeriDevriModalProps {
  fromUser: UserProfile;
  allProfiles: UserProfile[];
  actorUid: string;
  actorEmail?: string;
  onClose: () => void;
  onDone: () => void;
}

const VeriDevriModal: React.FC<VeriDevriModalProps> = ({
  fromUser,
  allProfiles,
  actorUid,
  actorEmail,
  onClose,
  onDone
}) => {
  const [toUid, setToUid] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targets = allProfiles.filter((p) => p.uid !== fromUser.uid);

  const submit = async () => {
    if (!toUid) {
      setError('Hedef kullanıcı seçin');
      return;
    }
    const hedef = targets.find((p) => p.uid === toUid);
    if (
      !window.confirm(
        `${fromUser.email || fromUser.uid} kullanıcısının tüm işlem kayıtları ${hedef?.email || toUid} hesabına aktarılacak. Bu işlem geri alınamaz. Onaylıyor musunuz?`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const { count, error: err } = await transferUserRecords(fromUser.uid, toUid, actorUid, actorEmail);
    setBusy(false);
    if (err) setError(err);
    else {
      alert(`${count} kayıt devredildi. Geçmiş raporlarda veriler yeni kullanıcıya bağlı görünür.`);
      onDone();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-600">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ArrowRightLeft size={20} className="text-indigo-600" />
              Veri devri
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Kaynak: <strong>{fromUser.email || fromUser.uid}</strong>
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Tüm <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">islem_kayitlari</code> satırlarında{' '}
          <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">user_id</code> güncellenir; isim sürekliliği raporlarda korunur.
        </p>
        <label className="text-[10px] font-bold uppercase text-slate-400">Hedef kullanıcı</label>
        <select
          value={toUid}
          onChange={(e) => setToUid(e.target.value)}
          className="w-full mt-1 mb-4 px-3 py-2 rounded-xl border text-sm font-medium"
        >
          <option value="">Seçin…</option>
          {targets.map((p) => (
            <option key={p.uid} value={p.uid}>
              {p.email || p.uid}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600">
            İptal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !toUid}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-50"
          >
            {busy ? 'Aktarılıyor…' : 'Verileri devret'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VeriDevriModal;
