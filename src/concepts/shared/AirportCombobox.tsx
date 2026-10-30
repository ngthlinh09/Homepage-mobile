import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react';
import { Icon } from '@aileron/react-components';
import { searchAirports, type Airport, type SimMode, findAirport } from './data';
import type { AirportValue } from './booking';
import { track, trackOnce } from './analytics';

type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

type Props = {
  label: string;
  value: AirportValue;
  onChange: (value: AirportValue) => void;
  field: 'origin' | 'destination';
  sim: SimMode;
  placeholder?: string;
  error?: string;
  hint?: ReactNode;
  suggestions?: Airport[];
  suggestionsLabel?: string;
  formatSelected?: (airport: Airport) => string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  labelHidden?: boolean;
  onSelected?: (airport: Airport) => void;
  /** Render the error elsewhere (by id) while keeping aria-invalid and aria-describedby on the input. */
  externalErrorId?: string;
  /** Marks the input for the above-the-fold viewport check. */
  foldKey?: string;
};

const defaultFormat = (airport: Airport) => `${airport.city} (${airport.code})`;

export function AirportCombobox({
  label, value, onChange, field, sim, placeholder, error, hint, suggestions = [], suggestionsLabel,
  formatSelected = defaultFormat, className = '', inputRef, labelHidden, onSelected, externalErrorId, foldKey,
}: Props) {
  const id = useId();
  const inputId = `${id}-input`;
  const listId = `${id}-list`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [results, setResults] = useState<Airport[]>([]);
  const [active, setActive] = useState(-1);
  const [announcement, setAnnouncement] = useState('');
  const localInput = useRef<HTMLInputElement | null>(null);
  const request = useRef<AbortController | null>(null);

  const query = value.query;
  const typing = !value.airport && query.trim().length > 0;
  const fallbackCode = status === 'error' && /^[a-z]{3}$/i.test(query.trim());
  const options: Airport[] = typing
    ? fallbackCode ? [{ code: query.trim().toUpperCase(), city: query.trim().toUpperCase(), name: 'Use this airport code', region: '' }] : results
    : suggestions;
  const showSuggestions = !typing && suggestions.length > 0;

  useEffect(() => {
    if (!typing) { setStatus('idle'); setResults([]); return; }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStatus('loading');
    const debounce = window.setTimeout(() => {
      searchAirports(query, sim, controller.signal)
        .then(found => {
          setResults(found);
          setStatus(found.length ? 'ready' : 'empty');
          setActive(found.length ? 0 : -1);
          setAnnouncement(found.length ? `${found.length} airport${found.length === 1 ? '' : 's'} found. Use up and down arrows to review.` : `No airports match ${query}.`);
          if (!found.length) track('autocomplete_no_result', { field, queryLength: query.length });
        })
        .catch(reason => {
          if (reason?.name === 'AbortError') return;
          setStatus('error');
          setResults([]);
          setActive(-1);
          setAnnouncement('Airport suggestions are unavailable. You can type a three-letter airport code.');
          track('autocomplete_error', { field });
        });
    }, 120);
    return () => { window.clearTimeout(debounce); controller.abort(); };
  }, [query, typing, sim, field]);

  const select = (airport: Airport, method: 'click' | 'keyboard' | 'blur') => {
    const known = findAirport(airport.code) ?? airport;
    onChange({ query: formatSelected(known), airport: known });
    setOpen(false);
    setActive(-1);
    setAnnouncement(`${known.city}, ${known.code} selected.`);
    track('airport_selected', { field, code: known.code, method, fromSuggestion: showSuggestions });
    trackOnce('booking_start', 'booking_start', { field, code: known.code });
    onSelected?.(known);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive(current => options.length ? (current + 1) % options.length : -1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActive(current => options.length ? (current <= 0 ? options.length - 1 : current - 1) : -1);
    } else if (event.key === 'Enter' && open && active >= 0 && options[active]) {
      event.preventDefault();
      select(options[active], 'keyboard');
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const onBlur = () => {
    window.setTimeout(() => {
      if (document.activeElement === localInput.current) return;
      setOpen(false);
      if (!value.airport && /^[a-z]{3}$/i.test(query.trim())) {
        const exact = findAirport(query.trim());
        if (exact) select(exact, 'blur');
      }
    }, 0);
  };

  const setRefs = (element: HTMLInputElement | null) => {
    localInput.current = element;
    if (typeof inputRef === 'function') inputRef(element);
    else if (inputRef) (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = element;
  };

  const describedBy = [hint ? hintId : '', error ? externalErrorId ?? errorId : ''].filter(Boolean).join(' ') || undefined;
  const expanded = open && (options.length > 0 || status === 'loading' || status === 'empty' || status === 'error');
  const statusText = status === 'loading' ? 'Searching airports…'
    : status === 'empty' ? `No airports match “${query.trim()}”. Try a city name or a 3-letter code.`
    : status === 'error' ? 'Airport suggestions are unavailable right now. Type a 3-letter airport code to continue.'
    : '';

  return <div className={`ac ${className}${error ? ' ac-invalid' : ''}${value.airport ? ' ac-filled' : ''}`}>
    <label htmlFor={inputId} className={labelHidden ? 'visually-hidden' : 'ac-label'}>{label}</label>
    <div className="ac-control">
      <input
        ref={setRefs}
        id={inputId}
        data-fold={foldKey}
        className="ac-input"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        autoCapitalize="words"
        spellCheck={false}
        enterKeyHint="next"
        placeholder={placeholder}
        value={query}
        onFocus={event => {
          track('field_focus', { field });
          setOpen(true);
          if (value.airport) event.currentTarget.select();
        }}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onChange={event => {
          onChange({ query: event.target.value, airport: null });
          setOpen(true);
          setActive(-1);
        }}
      />
      {query && <button type="button" className="ac-clear" aria-label={`Clear ${label}`}
        onClick={() => { onChange({ query: '', airport: null }); localInput.current?.focus(); setOpen(true); }}>
        <Icon icon="action:close" size={16} />
      </button>}
    </div>
    {hint && <div id={hintId} className="ac-hint">{hint}</div>}
    {error && !externalErrorId && <p id={errorId} className="ac-error"><Icon icon="signal:error" size={16} />{error}</p>}
    <div className="ac-popup" hidden={!expanded}>
      {showSuggestions && suggestionsLabel && <p className="ac-popup-heading" id={`${listId}-heading`}>{suggestionsLabel}</p>}
      <ul id={listId} role="listbox" aria-label={showSuggestions && suggestionsLabel ? suggestionsLabel : `${label} airports`}>
        {options.map((airport, index) => <li
          key={`${airport.code}-${index}`}
          id={`${listId}-${index}`}
          role="option"
          aria-selected={index === active}
          className={`ac-option${index === active ? ' ac-option-active' : ''}`}
          onMouseDown={event => event.preventDefault()}
          onClick={() => select(airport, 'click')}
          onMouseMove={() => setActive(index)}
        >
          <span className="ac-option-code">{airport.code}</span>
          <span className="ac-option-text">
            <span className="ac-option-city">{airport.city}{airport.region ? `, ${airport.region}` : ''}</span>
            <span className="ac-option-name">{airport.name}</span>
          </span>
        </li>)}
      </ul>
      {statusText && <p className={`ac-popup-status ac-popup-status-${status}`}>
        {status === 'loading' && <span className="ac-spinner" aria-hidden="true" />}
        {status === 'error' && <Icon icon="signal:warning" size={16} />}
        {statusText}
      </p>}
    </div>
    <div className="visually-hidden" role="status" aria-live="polite">{announcement}</div>
  </div>;
}
