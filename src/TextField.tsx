import { useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon } from '@aileron/react-components';

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'placeholder' | 'className'> & {
  label: string;
  value?: string;
  onValueChange?: (value: string) => void;
  /** Shown in the Figma error state when a required field is submitted empty. */
  requiredMessage?: string;
  trailing?: ReactNode;
  className?: string;
};

export default function TextField({ label, value, onValueChange, requiredMessage, trailing, className = '', onFocus, onBlur, onInvalid, 'aria-describedby': describedBy, ...input }: TextFieldProps) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const current = value ?? draft;
  const raised = focused || current !== '';
  const describedByIds = [describedBy, error ? errorId : undefined].filter(Boolean).join(' ') || undefined;

  return <div className={`text-field ${className}`.trim()} data-raised={raised} data-invalid={!!error}>
    <div className="text-field-box" onClick={event => {
      if (!(event.target as HTMLElement).closest('button, input')) inputRef.current?.focus();
    }}>
      <span className="text-field-content">
        {raised && <span className="text-field-label" aria-hidden="true">
          {error && <span className="field-error-icon"><Icon icon="signal:error" outlined size={16} /></span>}{label}
        </span>}
        <span className="text-field-value">
          {!raised && error && <span className="field-error-icon"><Icon icon="signal:error" outlined size={16} /></span>}
          <input {...input} ref={inputRef} aria-label={label} placeholder={focused ? '' : label} value={current}
            aria-invalid={!!error} aria-describedby={describedByIds}
            onChange={event => { if (value === undefined) setDraft(event.target.value); onValueChange?.(event.target.value); setError(''); }}
            onFocus={event => { setFocused(true); onFocus?.(event); }}
            onBlur={event => { setFocused(false); onBlur?.(event); }}
            onInvalid={event => {
              // Replace the browser bubble with the ADS error state.
              event.preventDefault();
              setError(requiredMessage ?? `Enter ${label.toLowerCase()}.`);
              const form = event.currentTarget.form;
              if (form?.querySelector(':invalid') === event.currentTarget) event.currentTarget.focus();
              onInvalid?.(event);
            }} />
        </span>
      </span>
      {trailing}
    </div>
    {error && <p id={errorId} className="text-field-caption">{error}</p>}
  </div>;
}
