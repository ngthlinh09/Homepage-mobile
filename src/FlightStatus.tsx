import { useState, type FormEvent, type RefObject } from 'react';
import { Button, DateInput, type DateInputHandle } from '@aileron/react-components';
import LookupModeSwitcher from './LookupModeSwitcher';
import RouteField from './RouteField';
import TextField from './TextField';

const modes = [
  { id: 'cities', label: 'Cities' },
  { id: 'number', label: 'Flight number' },
] as const;
export type FlightStatusMode = typeof modes[number]['id'];
export type FlightStatusDates = { start: string | null; end: string | null };

type FlightStatusProps = {
  persistentSearch?: boolean;
  mode: FlightStatusMode;
  onModeChange: (mode: FlightStatusMode) => void;
  dates: FlightStatusDates;
  dateInputRef: RefObject<DateInputHandle | null>;
  calendarOpen: boolean;
  onOpenCalendar: (field?: 'first' | 'second') => void;
  onDateChange: (field: 'first' | 'second', value: string | null) => void;
};

export default function FlightStatus({ persistentSearch = false, mode, onModeChange, dates, dateInputRef, calendarOpen, onOpenCalendar, onDateChange }: FlightStatusProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [routeErrors, setRouteErrors] = useState<{ from?: string; to?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const ready = Boolean((mode === 'cities' ? from.trim() && to.trim() : flightNumber.trim()) && dates.start && dates.end);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(false);
    if (mode === 'cities') {
      const errors = {
        from: from.trim() ? undefined : 'Enter a departure airport.',
        to: to.trim() ? undefined : 'Enter an arrival airport.',
      };
      setRouteErrors(errors);
      if (errors.from || errors.to) {
        event.currentTarget.querySelector<HTMLInputElement>(`[aria-label="${errors.from ? 'From' : 'To'}"]`)?.focus();
        return;
      }
    }
    if (!dateInputRef.current?.getDateState().isValid) {
      dateInputRef.current?.validateAll();
      dateInputRef.current?.containerEl?.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    setSubmitted(true);
  };

  return <form className="trip-lookup flight-status-lookup" data-status-mode={mode} onSubmit={submit}
    onKeyDown={event => {
      if (event.key === 'Enter' && !event.defaultPrevented && (event.target as HTMLElement).tagName === 'INPUT') {
        event.preventDefault(); event.currentTarget.requestSubmit();
      }
    }}>
    <LookupModeSwitcher id="flight-status" label="Flight status search type" modes={modes} value={mode}
      onChange={next => { onModeChange(next); setSubmitted(false); }} />
    <div id="flight-status-panel" className="trip-lookup-fields" role="tabpanel" aria-labelledby={`flight-status-tab-${mode}`}>
      {mode === 'cities' ? <RouteField from={from} to={to} errors={routeErrors} expanded={false}
        idPrefix="status-route" disclosureControls={null}
        onChange={(side, value) => {
          if (side === 'from') setFrom(value); else setTo(value);
          setRouteErrors(errors => ({ ...errors, [side]: undefined })); setSubmitted(false);
        }}
        onSwap={() => { setFrom(to); setTo(from); setRouteErrors(errors => ({ from: errors.to, to: errors.from })); setSubmitted(false); }} />
        : <TextField className="status-flight-number-field" label="Flight number" name="flight" inputMode="numeric"
            pattern="[0-9]{1,4}" maxLength={4} required requiredMessage="Enter a flight number."
            value={flightNumber} onValueChange={value => { setFlightNumber(value); setSubmitted(false); }} />}
      <DateInput key={mode} ref={dateInputRef} className="date-field status-range-picker" label="Flight dates" isRange includeYear
        yearFormat="short" displayFormat="parsed" disableTyping enablePastSelection calendarOpen={calendarOpen}
        firstInputPlaceholder="Depart" secondInputPlaceholder="Return" firstInputValue={dates.start ?? ''} secondInputValue={dates.end ?? ''}
        onCalendarIconClick={() => onOpenCalendar()} onInputClick={onOpenCalendar}
        onKeyDown={event => { if (event.key === 'Enter') {
          event.preventDefault(); onOpenCalendar(event.currentTarget.dataset.testid === 'date-input-second' ? 'second' : 'first');
        } }}
        onChange={event => {
          const [month, day, year] = event.value.split('/');
          const value = /^\d{4}-\d{2}-\d{2}$/.test(event.value) ? event.value
            : event.isValid ? `${year.length === 2 ? `20${year}` : year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : null;
          onDateChange(event.field, value); setSubmitted(false);
        }} />
    </div>
    {(persistentSearch || ready) && <Button className="trip-lookup-submit" type="submit" size="fullwidth">{persistentSearch ? 'Search' : 'Find flight'}</Button>}
    {submitted && <div className="demo-result" role="status">
      <p>This is a design demo. Continue on American Airlines to look up live flight status.</p>
      <a href="https://www.aa.com/travelInformation/flights/status">Continue to aa.com</a>
    </div>}
  </form>;
}
