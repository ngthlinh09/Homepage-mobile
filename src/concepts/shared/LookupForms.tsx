import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '@aileron/react-components';
import { links } from './data';
import { track } from './analytics';
import { useSessionState } from './useSessionState';

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  inputRef?: React.Ref<HTMLInputElement>;
};

export function TextField({ label, value, onChange, error, hint, inputProps, inputRef }: FieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return <div className={`text-field${error ? ' text-field-invalid' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <input ref={inputRef} id={id} value={value} aria-invalid={error ? true : undefined} aria-describedby={describedBy}
      onChange={event => onChange(event.target.value)} {...inputProps} />
    {hint && <p id={`${id}-hint`} className="text-field-hint">{hint}</p>}
    {error && <p id={`${id}-error`} className="text-field-error"><Icon icon="signal:error" size={16} />{error}</p>}
  </div>;
}

function DemoResult({ children, href }: { children: ReactNode; href: string }) {
  return <div className="demo-note" role="status">
    <p>{children}</p>
    <a href={href}>Continue on aa.com <Icon icon="navigation:arrow-single-right" size={16} /></a>
  </div>;
}

export function TripLookup({ variant, submitLabel = 'Find your trip', autoFocus }: { variant: string; submitLabel?: string; autoFocus?: boolean }) {
  const [form, setForm] = useSessionState(`aa-${variant}-trip`, { lastName: '', code: '' });
  const [errors, setErrors] = useState<{ lastName?: string; code?: string }>({});
  const [done, setDone] = useState(false);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!form.lastName.trim()) next.lastName = 'Enter the last name on the reservation.';
    if (!/^[A-Z0-9]{6}$/.test(form.code)) next.code = form.code ? 'Confirmation codes are 6 letters or numbers.' : 'Enter your 6-character confirmation code.';
    setErrors(next);
    if (next.lastName) lastNameRef.current?.focus();
    else if (next.code) codeRef.current?.focus();
    track('service_lookup_submit', { task: 'trip', valid: !Object.keys(next).length });
    setDone(!Object.keys(next).length);
  };

  return <form className="lookup" onSubmit={submit} noValidate>
    <TextField label="Last name" value={form.lastName} error={errors.lastName} inputRef={lastNameRef}
      onChange={lastName => { setForm({ ...form, lastName }); setErrors({ ...errors, lastName: undefined }); setDone(false); }}
      inputProps={{ autoComplete: 'family-name', autoFocus, onFocus: () => track('field_focus', { field: 'trip_last_name' }) }} />
    <TextField label="Confirmation code" value={form.code} error={errors.code} hint="6 characters, on your receipt email" inputRef={codeRef}
      onChange={code => { setForm({ ...form, code: code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) }); setErrors({ ...errors, code: undefined }); setDone(false); }}
      inputProps={{ autoCapitalize: 'characters', autoComplete: 'off', spellCheck: false, onFocus: () => track('field_focus', { field: 'trip_code' }) }} />
    <button className="lookup-submit" type="submit">{submitLabel}</button>
    {done && <DemoResult href={links.trips}>Design demo: trip <strong>{form.code}</strong> for {form.lastName.trim()} would open here, with check-in if it’s within 24 hours of departure.</DemoResult>}
  </form>;
}

export type StatusQuery = { flight: string; day: 'yesterday' | 'today' | 'tomorrow' };

export function StatusLookup({ variant, submitLabel = 'Check status', renderResult, autoFocus }: {
  variant: string;
  submitLabel?: string;
  autoFocus?: boolean;
  renderResult?: (query: StatusQuery) => ReactNode;
}) {
  const [form, setForm] = useSessionState<StatusQuery>(`aa-${variant}-status`, { flight: '', day: 'today' });
  const [error, setError] = useState('');
  const [result, setResult] = useState<StatusQuery | null>(null);
  const flightRef = useRef<HTMLInputElement>(null);
  const dayId = useId();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const valid = /^\d{1,4}$/.test(form.flight);
    setError(valid ? '' : form.flight ? 'Flight numbers are 1 to 4 digits.' : 'Enter a flight number.');
    track('service_lookup_submit', { task: 'status', valid });
    if (!valid) { flightRef.current?.focus(); setResult(null); return; }
    setResult(form);
  };

  return <form className="lookup" onSubmit={submit} noValidate>
    <div className="lookup-row">
      <TextField label="Flight number" value={form.flight} error={error} inputRef={flightRef}
        onChange={flight => { setForm({ ...form, flight: flight.replace(/^aa\s*/i, '').replace(/\D/g, '').slice(0, 4) }); setError(''); setResult(null); }}
        inputProps={{ inputMode: 'numeric', autoComplete: 'off', placeholder: 'e.g. 2245', autoFocus, onFocus: () => track('field_focus', { field: 'status_flight' }) }} />
      <div className="text-field">
        <label htmlFor={dayId}>Date</label>
        <select id={dayId} value={form.day} onChange={event => { setForm({ ...form, day: event.target.value as StatusQuery['day'] }); setResult(null); }}>
          <option value="yesterday">Yesterday</option>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
        </select>
      </div>
    </div>
    <button className="lookup-submit" type="submit">{submitLabel}</button>
    {result && (renderResult ? renderResult(result)
      : <DemoResult href={links.status}>Design demo: live status for AA {result.flight} ({result.day}) would appear here.</DemoResult>)}
  </form>;
}
