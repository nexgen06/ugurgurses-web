import React, { useEffect, useState, useCallback } from 'react';
import { Megaphone } from 'lucide-react';
import { getDuyuru, duyuruVersionKey, type DuyuruDoc } from '../services/duyuru-service';
import { useUser } from '../contexts/UserContext';
import { needsProfileSetup } from '../lib/user-display';
import { shouldShowDuyuruModal, markDuyuruSeen } from '../lib/duyuru-prefs';
import DuyuruModal from './DuyuruModal';

const emptyDoc: DuyuruDoc = { metin: '' };

const DuyuruBanner: React.FC = () => {
  const user = useUser();
  const [doc, setDoc] = useState<DuyuruDoc>(emptyDoc);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);

  const refresh = useCallback(() => {
    getDuyuru().then((d) => {
      setDoc(d);
      setModalDismissed(false);
    });
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('duyuru_updated', onUpdate);
    return () => window.removeEventListener('duyuru_updated', onUpdate);
  }, [refresh]);

  const metin = doc.metin.trim();
  const version = duyuruVersionKey(doc);
  const profileBlocking = user ? needsProfileSetup(user) : false;

  useEffect(() => {
    if (!user?.id || !metin || profileBlocking || modalDismissed) {
      setModalOpen(false);
      return;
    }
    setModalOpen(shouldShowDuyuruModal(user.id, version, metin));
  }, [user?.id, metin, version, profileBlocking, modalDismissed]);

  const closeModal = useCallback(() => {
    if (user?.id && version) markDuyuruSeen(user.id, version);
    setModalOpen(false);
    setModalDismissed(true);
  }, [user?.id, version]);

  if (!metin) return null;

  return (
    <>
      {modalOpen && <DuyuruModal metin={metin} onClose={closeModal} />}
      <div
        className="mb-4 flex gap-3 items-start p-3 sm:p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-100"
        role="status"
        aria-live="polite"
      >
        <Megaphone className="shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" size={20} />
        <p className="text-sm font-semibold leading-snug">{metin}</p>
      </div>
    </>
  );
};

export default DuyuruBanner;
