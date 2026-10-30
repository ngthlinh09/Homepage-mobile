import { useState, type FormEvent, type RefObject } from 'react';
import { Button, DateInput, Icon, Select, type DateInputHandle } from '@aileron/react-components';
import RouteField from './RouteField';
import './vacation-search.css';

export type VacationDraft = {
  from: string;
  to: string;
  depart: string | null;
  return: string | null;
  passengers: string;
  fare: string;
};
const fares = [
  { value: 'coach', label: 'Coach' },
  { value: 'premium-economy', label: 'Premium Economy' },
  { value: 'business', label: 'Business' },
  { value: 'first', label: 'First' },
];

type VacationSearchProps = {
  hidden: boolean;
  draft: VacationDraft;
  onChange: (patch: Partial<VacationDraft>) => void;
  dateInputRef: RefObject<DateInputHandle | null>;
  calendarOpen: boolean;
  onOpenCalendar: (field?: 'first' | 'second') => void;
};

export default function VacationSearch({ hidden, draft, onChange, dateInputRef, calendarOpen, onOpenCalendar }: VacationSearchProps) {
  const [errors, setErrors] = useState<{ from?: string; to?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const change = (patch: Partial<VacationDraft>) => { onChange(patch); setSubmitted(false); };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitted(false);
    const nextErrors = {
      from: draft.from.trim() ? undefined : 'Enter a departure airport.',
      to: draft.to.trim() ? undefined : 'Enter an arrival airport.',
    };
    setErrors(nextErrors);
    if (nextErrors.from || nextErrors.to) {
      event.currentTarget.querySelector<HTMLInputElement>(`[aria-label="${nextErrors.from ? 'From' : 'To'}"]`)?.focus();
      return;
    }
    if (!draft.depart || !draft.return || !dateInputRef.current?.getDateState().isValid) {
      dateInputRef.current?.validateAll();
      dateInputRef.current?.containerEl?.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    setSubmitted(true);
    window.open('https://www.aavacations.com/', '_blank', 'noopener,noreferrer');
  };

  return <form className="vacation-search" aria-label="Vacation packages" hidden={hidden} onSubmit={submit} noValidate>
    <RouteField from={draft.from} to={draft.to} errors={errors} expanded={false} idPrefix="vacation-route" disclosureControls={null}
      onChange={(side, value) => { change({ [side]: value }); setErrors(previous => ({ ...previous, [side]: undefined })); }}
      onSwap={() => { change({ from: draft.to, to: draft.from }); setErrors(previous => ({ from: previous.to, to: previous.from })); }} />
    <DateInput ref={dateInputRef} className="date-field vacation-date-picker" label="Travel dates" isRange includeYear disableTyping
      firstInputPlaceholder="Depart" secondInputPlaceholder="Return" firstInputValue={draft.depart ?? ''} secondInputValue={draft.return ?? ''}
      calendarOpen={calendarOpen} onCalendarIconClick={() => onOpenCalendar()} onInputClick={onOpenCalendar}
      onKeyDown={event => { if (event.key === 'Enter') {
        event.preventDefault(); onOpenCalendar(event.currentTarget.dataset.testid === 'date-input-second' ? 'second' : 'first');
      } }}
      onChange={event => {
        const [month, day, year] = event.value.split('/');
        const value = /^\d{4}-\d{2}-\d{2}$/.test(event.value) ? event.value
          : event.isValid ? `${year.length === 2 ? `20${year}` : year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : null;
        change({ [event.field === 'first' ? 'depart' : 'return']: value });
      }} />
    <div className="booking-select vacation-passengers-field">
      <Icon icon="operation:account" size={24} />
      <div className="vacation-select-content">
        <span className="vacation-select-label" aria-hidden="true">Number of passengers</span>
        <Select ariaLabel="Number of passengers" name="vacation-passengers" value={draft.passengers}
          onChange={event => change({ passengers: event.target.value })}
          options={[1, 2, 3, 4, 5, 6].map(count => ({ value: String(count), label: `${count} ${count === 1 ? 'passenger' : 'passengers'}` }))} />
      </div>
      <img className="dropdown-chevron" src="/assets/dropdown-chevron.svg" alt="" />
    </div>
    <div className="booking-select vacation-fare-field">
      <Icon icon="airport:seat" size={24} />
      <div className="vacation-select-content">
        <span className="vacation-select-label" aria-hidden="true">Fare preference</span>
        <Select ariaLabel="Fare preference" name="vacation-fare" value={draft.fare} options={fares}
          onChange={event => change({ fare: event.target.value })} />
      </div>
      <img className="dropdown-chevron" src="/assets/dropdown-chevron.svg" alt="" />
    </div>
    {submitted && <div className="demo-result" role="status">
      <p>Your vacation package draft from {draft.from} to {draft.to} for {draft.passengers} {draft.passengers === '1' ? 'passenger' : 'passengers'}, flying {fares.find(fare => fare.value === draft.fare)?.label}, is saved here. This is a design demo; details are not sent to American Airlines Vacations.</p>
      <a href="https://www.aavacations.com/" target="_blank" rel="noreferrer">Continue to American Airlines Vacations <img src="/assets/external-link.svg" alt="(opens in a new tab)" /></a>
    </div>}
    <div className="vacation-search-footer">
      <Button className="vacation-search-submit" type="submit" size="fullwidth"
        trailingIcon={<img className="vacation-external-icon" src="/assets/external-link.svg" alt="" />}>Search</Button>
    </div>
  </form>;
}
