import { useState, type FormEvent, type RefObject } from 'react';
import { Button, DateInput, Icon, type DateInputHandle } from '@aileron/react-components';
import TextField from './TextField';
import LookupModeSwitcher from './LookupModeSwitcher';

const modes = [
  { id: 'trip', label: 'Find trip' },
  { id: 'credit', label: 'Find travel credit' },
] as const;
type LookupMode = typeof modes[number]['id'];

type TripLookupProps = {
  persistentSearch?: boolean;
  dateInputRef: RefObject<DateInputHandle | null>;
  startDate: string | null;
  endDate: string | null;
  calendarOpen: boolean;
  onOpenCalendar: (field?: 'first' | 'second') => void;
  onDateChange: (field: 'first' | 'second', value: string | null) => void;
};

export default function TripLookup({ persistentSearch = false, dateInputRef, startDate, endDate, calendarOpen, onOpenCalendar, onDateChange }: TripLookupProps) {
  const [mode, setMode] = useState<LookupMode>('trip');
  const [lastName, setLastName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const ready = Boolean(lastName.trim() && identifier.trim() && startDate && endDate);

  const changeMode = (next: LookupMode) => { setMode(next); setSubmitted(false); };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dateInputRef.current?.getDateState().isValid) {
      dateInputRef.current?.validateAll();
      dateInputRef.current?.containerEl?.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    setSubmitted(true);
  };
  const toIso = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const [month, day, year] = value.split('/');
    return `${year.length === 2 ? `20${year}` : year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  return <form className="trip-lookup" data-lookup-mode={mode} onSubmit={submit} onKeyDown={event => {
    if (event.key === 'Enter' && !event.defaultPrevented && (event.target as HTMLElement).tagName === 'INPUT') {
      event.preventDefault(); event.currentTarget.requestSubmit();
    }
  }}>
    <LookupModeSwitcher id="trip-lookup" label="Trip lookup type" modes={modes} value={mode} onChange={changeMode} />
    <div id="trip-lookup-panel" className="trip-lookup-fields" role="tabpanel" aria-labelledby={`trip-lookup-tab-${mode}`}>
      <div>
        <TextField className="trip-last-name-field" label="Last name" name="last-name" autoComplete="family-name" required
          requiredMessage="Enter the last name on the reservation." aria-describedby={helpOpen ? 'trip-name-help' : undefined}
          value={lastName} onValueChange={next => { setLastName(next); setSubmitted(false); }}
          trailing={<Button className="trip-name-help-button" variant="ghost" size="sm" iconOnly ariaLabel="About the last name"
            aria-expanded={helpOpen} aria-controls="trip-name-help" onClick={() => setHelpOpen(!helpOpen)}
            leadingIcon={<Icon icon="signal:information" outlined size={24} />} />} />
        {helpOpen && <p id="trip-name-help" className="trip-name-help" role="note">Use the last name exactly as it appears on your reservation or original ticket.</p>}
      </div>
      <DateInput ref={dateInputRef} className="date-field trip-date-picker" label={mode === 'credit' ? 'Date of birth' : 'Date'} isRange includeYear yearFormat="short"
        displayFormat="parsed" disableTyping enablePastSelection calendarOpen={calendarOpen}
        firstInputPlaceholder="Start" secondInputPlaceholder="End" firstInputValue={startDate ?? ''} secondInputValue={endDate ?? ''}
        onCalendarIconClick={() => onOpenCalendar()} onInputClick={onOpenCalendar}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onOpenCalendar(event.currentTarget.dataset.testid === 'date-input-second' ? 'second' : 'first'); } }}
        onChange={event => { onDateChange(event.field, event.isValid ? toIso(event.value) : null); setSubmitted(false); }} />
      <TextField className="trip-identifier-field" label={mode === 'credit' ? 'Travel credit number or ticket number' : 'Confirmation code or ticket number'} name={mode === 'credit' ? 'travel-credit-number' : 'confirmation'} maxLength={13}
        autoComplete="off" autoCapitalize="characters" spellCheck={false} required
        requiredMessage={mode === 'credit' ? 'Enter a travel credit number or ticket number.' : 'Enter a confirmation code or ticket number.'}
        value={identifier} onValueChange={next => { setIdentifier(next); setSubmitted(false); }} />
    </div>
    {(persistentSearch || ready) && <Button className="trip-lookup-submit" variant="primary" size="fullwidth" type="submit">{persistentSearch ? 'Search' : mode === 'trip' ? 'Find trip' : 'Find travel credit'}</Button>}
    {submitted && <div className="demo-result" role="status">
      <p>This is a design demo. Continue on American Airlines to {mode === 'trip' ? 'find your trip or check in' : 'look up your travel credit'}.</p>
      <a href={mode === 'trip' ? 'https://www.aa.com/reservation/view/find-your-reservation' : 'https://www.aa.com/i18n/customer-service/payment-options/travel-credit.jsp'}>Continue to aa.com</a>
    </div>}
  </form>;
}
