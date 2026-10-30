import { useEffect, useRef } from 'react';
import { Calendar, Icon } from '@aileron/react-components';
import type { Draft, TripType } from './booking';
import { track } from './analytics';

type Props = {
  open: boolean;
  onClose: () => void;
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  className?: string;
};

export function DatesDialog({ open, onClose, draft, update, className = '' }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) { element.showModal(); track('dates_open'); }
    if (!open && element.open) element.close();
  }, [open]);

  const setTrip = (trip: TripType) => {
    update({ trip, ret: trip === 'oneway' ? null : draft.ret });
    track('trip_type_change', { trip });
  };

  return <dialog ref={dialog} className={`dates-dialog ${className}`} aria-labelledby="dates-dialog-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className="dates-dialog-heading">
      <h2 id="dates-dialog-title">When are you flying?</h2>
      <button type="button" className="icon-button" aria-label="Close dates" onClick={onClose}><Icon icon="action:close" size={24} /></button>
    </div>
    <fieldset className="trip-toggle">
      <legend className="visually-hidden">Trip type</legend>
      {(['round', 'oneway'] as const).map(trip => <label key={trip} className={draft.trip === trip ? 'checked' : ''}>
        <input type="radio" name="trip-type" value={trip} checked={draft.trip === trip} onChange={() => setTrip(trip)} />
        {trip === 'round' ? 'Round trip' : 'One way'}
      </label>)}
    </fieldset>
    {open && <Calendar range={draft.trip === 'round'} startDate={draft.depart} endDate={draft.trip === 'round' ? draft.ret : null}
      startDateName="Departure date" endDateName="Return date" onClose={onClose}
      onDateSelected={dates => {
        const ret = draft.trip === 'round' ? dates.endDate : null;
        if (dates.startDate === draft.depart && ret === draft.ret) return;
        update({ depart: dates.startDate, ret });
        if (dates.startDate) track('dates_selected', { trip: draft.trip, hasReturn: Boolean(dates.endDate) });
      }} />}
  </dialog>;
}
