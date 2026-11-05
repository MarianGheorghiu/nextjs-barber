import { useState } from 'react';
import { ArrowRight, Bell, Check, Trash2 } from 'lucide-react';
import { friendlyError } from '../lib/api';
import type { LocalNotification } from '../lib/types';
import { clock, prettyDate } from '../lib/time';
import { Modal } from './Modal';

type Props = {
  notifications: LocalNotification[];
  loadError: string;
  onClose: () => void;
  onOpenAppointment: (id: string) => void;
  onDismiss: (id: string) => Promise<void>;
  onRead: () => Promise<void>;
};

export function NotificationInbox({ notifications, loadError, onClose, onOpenAppointment, onDismiss, onRead }: Props) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function act(action: () => Promise<void>) {
    setBusy(true);
    setActionError('');
    try { await action(); }
    catch (error) { setActionError(friendlyError(error)); }
    finally { setBusy(false); }
  }

  return <Modal title="Notificările tale" onClose={onClose}>
    {(actionError || loadError) && <p className="error-box" role="alert">{actionError || loadError}</p>}
    <div className="inbox-list">
      {notifications.map(notification => <article className={`inbox-item ${notification.read_at ? '' : 'unread'}`} key={notification.id}>
        <span className="inbox-icon" aria-hidden="true"><Bell size={18}/></span>
        <div className="inbox-content">
          <div className="inbox-title"><h3>{notification.title}</h3>{!notification.read_at && <span className="inbox-new">Nouă</span>}</div>
          <p>{notification.body}</p>
          <time dateTime={notification.created_at}>{prettyDate(notification.created_at, { year: 'numeric' })}, {clock(notification.created_at)}</time>
          <div className="inbox-actions">
            <button className="secondary" onClick={() => onOpenAppointment(notification.appointment_id)}>Vezi programarea<ArrowRight size={15}/></button>
            <button className="icon-button danger-glass" aria-label={`Șterge notificarea: ${notification.title}`} title="Șterge notificarea" disabled={busy} onClick={() => void act(() => onDismiss(notification.id))}><Trash2 size={16}/></button>
          </div>
        </div>
      </article>)}
      {!notifications.length && !loadError && <div className="inbox-empty"><span className="inbox-icon"><Bell size={22}/></span><h3>Ești la zi.</h3><p>Actualizările programărilor tale vor apărea aici.</p></div>}
    </div>
    {notifications.some(notification => !notification.read_at) && <button className="secondary full" disabled={busy} onClick={() => void act(onRead)}>Marchează ca citite<Check size={17}/></button>}
  </Modal>;
}
