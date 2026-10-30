import { useState, type FocusEventHandler, type KeyboardEventHandler } from 'react';
import { Button, Icon } from '@aileron/react-components';
import { airports, findAirport } from './concepts/shared/data';

type Side = 'from' | 'to';
type AirportInputProps = {
  side: Side;
  value: string;
  error?: string;
  expanded: boolean;
  idPrefix: string;
  disclosureControls: string | null;
  onValueChange: (value: string) => void;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

const labels: Record<Side, string> = { from: 'From', to: 'To' };

const normalizeAirport = (value: string) => {
  const query = value.trim();
  const match = findAirport(query) ?? airports.find(airport => airport.city.toLowerCase() === query.toLowerCase());
  return match ? match.code : query;
};

function ErrorIcon() {
  return <span className="field-error-icon"><Icon icon="signal:error" outlined size={16} /></span>;
}

function AirportInput({ side, value, error, expanded, idPrefix, disclosureControls, onValueChange, onFocus, onKeyDown }: AirportInputProps) {
  const [focused, setFocused] = useState(false);
  const label = labels[side];
  const airport = focused ? null : findAirport(value);
  const raised = focused || value !== '';
  return <label className={`airport-field airport-field-${side}`} data-raised={raised} data-focused={focused} data-invalid={!!error}>
    {raised && <span className="airport-field-label" aria-hidden="true">{error && <ErrorIcon />}{label}</span>}
    <span className="airport-field-value">
      {!raised && error && <ErrorIcon />}
      <span className="airport-field-sizer" data-value={value}>
        <input size={1} aria-label={label} placeholder={focused ? '' : label} value={value} autoComplete="off" spellCheck={false}
          aria-invalid={!!error} aria-describedby={error ? `${idPrefix}-${side}-error` : undefined}
          aria-controls={disclosureControls ?? undefined} aria-expanded={disclosureControls ? expanded : undefined}
          onChange={event => onValueChange(event.target.value)}
          onFocus={event => { setFocused(true); onFocus?.(event); }}
          onBlur={() => { setFocused(false); const next = normalizeAirport(value); if (next !== value) onValueChange(next); }}
          onKeyDown={onKeyDown} />
      </span>
      {airport && <span className="airport-field-city">{airport.city}</span>}
    </span>
  </label>;
}

type RouteFieldProps = {
  from: string;
  to: string;
  errors: Partial<Record<Side, string>>;
  expanded: boolean;
  idPrefix?: string;
  disclosureControls?: string | null;
  onChange: (side: Side, value: string) => void;
  onSwap: () => void;
  onAirportFocus?: FocusEventHandler<HTMLInputElement>;
  onToKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  onLeave?: () => void;
};

export default function RouteField({ from, to, errors, expanded, idPrefix = 'route', disclosureControls = 'search-options', onChange, onSwap, onAirportFocus, onToKeyDown, onLeave }: RouteFieldProps) {
  return <div className="route-field">
    <div className="route-fields" onBlurCapture={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onLeave?.();
    }}>
      <AirportInput side="from" value={from} error={errors.from} expanded={expanded} idPrefix={idPrefix} disclosureControls={disclosureControls} onFocus={onAirportFocus}
        onValueChange={value => onChange('from', value)} />
      <Button className="swap-button" variant="ghost" size="sm" iconOnly ariaLabel="Swap origin and destination"
        leadingIcon={<span className="route-swap-icon" aria-hidden="true" />} onClick={onSwap} />
      <AirportInput side="to" value={to} error={errors.to} expanded={expanded} idPrefix={idPrefix} disclosureControls={disclosureControls} onFocus={onAirportFocus} onKeyDown={onToKeyDown}
        onValueChange={value => onChange('to', value)} />
    </div>
    {(errors.from || errors.to) && <div className="route-field-captions">
      <p id={`${idPrefix}-from-error`}>{errors.from}</p>
      <p id={`${idPrefix}-to-error`}>{errors.to}</p>
    </div>}
  </div>;
}
