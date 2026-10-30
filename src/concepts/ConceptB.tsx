import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Icon } from '@aileron/react-components';
import { AirportCombobox } from './shared/AirportCombobox';
import { DatesDialog } from './shared/DatesDialog';
import { SiteHeader } from './shared/SiteHeader';
import { DisruptionNotice, SiteFooter } from './shared/Chrome';
import { formatDates, searchSummary, useBookingDraft } from './shared/booking';
import { asset, cardAd, findAirport, links, popularFrom, readSimMode } from './shared/data';
import { setVariant, track, trackOnce, useImpression } from './shared/analytics';
import { useSessionState } from './shared/useSessionState';
import './shared/concepts.css';
import './concept-b.css';

setVariant('concept-b');

const codeOnly = (airport: { code: string }) => airport.code;

function TripLine() {
  const [form, setForm] = useSessionState('aa-concept-b-trip', { code: '', lastName: '' });
  const [errors, setErrors] = useState<{ code?: string; lastName?: string }>({});
  const [done, setDone] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!/^[A-Z0-9]{6}$/.test(form.code)) next.code = form.code ? 'Confirmation codes are 6 letters or numbers.' : 'Enter your 6-character confirmation code.';
    if (!form.lastName.trim()) next.lastName = 'Enter the last name on the reservation.';
    setErrors(next);
    track('shortcut_click', { task: 'trip', placement: 'board-inline' });
    track('service_lookup_submit', { task: 'trip', valid: !Object.keys(next).length });
    if (next.code) codeRef.current?.focus();
    else if (next.lastName) nameRef.current?.focus();
    setDone(!Object.keys(next).length);
  };
  const errorText = errors.code ?? errors.lastName;

  return <form className="b-line" onSubmit={submit} noValidate aria-labelledby="b-trip-title">
    <h2 id="b-trip-title" className="b-label"><Icon icon="airport:boarding-pass" size={16} />Check in · Your trips</h2>
    <div className="b-inline b-inline-trip">
      <label className={`b-field${errors.code ? ' b-field-invalid' : ''}`}>
        <span className="b-field-label">Confirmation<span className="visually-hidden"> code</span></span>
        <input data-fold="trip" ref={codeRef} value={form.code} placeholder="ABC123" autoCapitalize="characters" autoComplete="off" spellCheck={false}
          aria-invalid={errors.code ? true : undefined} aria-describedby={errors.code ? 'b-trip-error' : undefined}
          onFocus={() => track('field_focus', { field: 'trip_code' })}
          onChange={event => { setForm({ ...form, code: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) }); setErrors({}); setDone(false); }} />
      </label>
      <label className={`b-field${errors.lastName ? ' b-field-invalid' : ''}`}>
        <span className="b-field-label">Last name</span>
        <input ref={nameRef} value={form.lastName} autoComplete="family-name"
          aria-invalid={errors.lastName ? true : undefined} aria-describedby={errors.lastName ? 'b-trip-error' : undefined}
          onFocus={() => track('field_focus', { field: 'trip_last_name' })}
          onChange={event => { setForm({ ...form, lastName: event.target.value }); setErrors({}); setDone(false); }} />
      </label>
      <button type="submit" className="b-go" aria-label="Find trip"><Icon icon="navigation:arrow-single-right" size={24} /></button>
    </div>
    {errorText && <p id="b-trip-error" className="field-error"><Icon icon="signal:error" size={16} />{errorText}</p>}
    {done && <div className="demo-note" role="status">
      <p>Design demo: trip <strong>{form.code}</strong> would open here, with check-in if departure is within 24 hours.</p>
      <a href={links.trips}>Continue on aa.com <Icon icon="navigation:arrow-single-right" size={16} /></a>
    </div>}
  </form>;
}

const dayLabel = { yesterday: 'Yesterday', today: 'Today', tomorrow: 'Tomorrow' } as const;

function StatusLine() {
  const [form, setForm] = useSessionState<{ flight: string; day: keyof typeof dayLabel }>('aa-concept-b-status', { flight: '', day: 'today' });
  const [error, setError] = useState('');
  const [result, setResult] = useState<typeof form | null>(null);
  const flightRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const valid = /^\d{1,4}$/.test(form.flight);
    setError(valid ? '' : form.flight ? 'Flight numbers are 1 to 4 digits.' : 'Enter a flight number.');
    track('shortcut_click', { task: 'status', placement: 'board-inline' });
    track('service_lookup_submit', { task: 'status', valid });
    if (!valid) { flightRef.current?.focus(); setResult(null); return; }
    setResult(form);
  };

  return <form className="b-line" onSubmit={submit} noValidate aria-labelledby="b-status-title">
    <h2 id="b-status-title" className="b-label"><Icon icon="airport:flight-status" size={16} />Flight status</h2>
    <div className="b-inline b-inline-status">
      <label className={`b-field b-field-flight${error ? ' b-field-invalid' : ''}`}>
        <span className="b-field-label">Flight number</span>
        <span className="b-field-prefix" aria-hidden="true">AA</span>
        <input data-fold="status" ref={flightRef} value={form.flight} inputMode="numeric" autoComplete="off" placeholder="2245"
          aria-invalid={error ? true : undefined} aria-describedby={error ? 'b-status-error' : undefined}
          onFocus={() => track('field_focus', { field: 'status_flight' })}
          onChange={event => { setForm({ ...form, flight: event.target.value.replace(/^aa\s*/i, '').replace(/\D/g, '').slice(0, 4) }); setError(''); setResult(null); }} />
      </label>
      <label className="b-field b-field-select">
        <span className="b-field-label">Date</span>
        <select value={form.day} onChange={event => { setForm({ ...form, day: event.target.value as typeof form.day }); setResult(null); }}>
          {Object.entries(dayLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <button type="submit" className="b-go" aria-label="Track flight"><Icon icon="navigation:arrow-single-right" size={24} /></button>
    </div>
    {error && <p id="b-status-error" className="field-error"><Icon icon="signal:error" size={16} />{error}</p>}
    {result && <div className="b-status-result" role="status">
      <p className="b-status-sample">Illustrative data · design demo</p>
      <div className="b-status-row">
        <span className="b-status-flight">AA {result.flight}</span>
        <span className="b-status-route">DFW <Icon icon="transportation:flight-angled-right-alt" size={16} /> ORD</span>
        <span className="b-status-pill">On time</span>
      </div>
      <dl className="b-status-meta">
        <div><dt>Departs</dt><dd>2:05 PM</dd></div>
        <div><dt>Gate</dt><dd>C12</dd></div>
        <div><dt>Arrives</dt><dd>4:20 PM</dd></div>
      </dl>
      <a href={links.status}>Live status on aa.com <Icon icon="navigation:arrow-single-right" size={16} /></a>
    </div>}
  </form>;
}

export default function ConceptB() {
  const sim = useMemo(readSimMode, []);
  const { draft, update, swap, errors, validate } = useBookingDraft('aa-concept-b-draft');
  const [datesOpen, setDatesOpen] = useState(false);
  const [result, setResult] = useState('');
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const datesRef = useRef<HTMLButtonElement>(null);
  const adRef = useRef<HTMLElement>(null);

  useImpression(adRef, 'card_impression', { placement: 'board-announcement' });
  useEffect(() => { trackOnce('impression', 'homepage_impression', { irregularOps: sim.irregularOps }); }, [sim]);

  const origin = draft.from.airport;
  const suggestions = (popularFrom[origin?.code ?? 'default'] ?? popularFrom.default)
    .filter(code => code !== origin?.code).map(code => findAirport(code)!).slice(0, 5);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    track('search_submit', { valid: !Object.keys(found).length, trip: draft.trip, travelers: draft.travelers });
    if (found.from) fromRef.current?.focus();
    else if (found.to) toRef.current?.focus();
    else if (found.dates) datesRef.current?.focus();
    else setResult(searchSummary(draft));
  };

  return <div className="concept concept-b">
    <a className="skip-link" href="#b-main">Skip to main content</a>
    <SiteHeader tone="dark" />
    <main id="b-main">
      <h1 className="visually-hidden">American Airlines: book, check in, and track flights</h1>
      {sim.irregularOps && <DisruptionNotice className="b-disruption" />}

      <section className="b-board b-book" aria-labelledby="b-book-title">
        <div className="b-head">
          <h2 id="b-book-title" className="b-label"><Icon icon="transportation:flight-angled-right-alt" size={16} />Book a flight</h2>
          <label className="b-trip">
            <span className="visually-hidden">Trip type</span>
            <select value={draft.trip} onChange={event => { update({ trip: event.target.value as 'round' | 'oneway', ret: null }); setResult(''); track('trip_type_change', { trip: event.target.value }); }}>
              <option value="round">Round trip</option>
              <option value="oneway">One way</option>
            </select>
          </label>
        </div>
        <form onSubmit={submit} noValidate aria-labelledby="b-book-title">
          <div className="b-route">
            <AirportCombobox foldKey="book-from" label="From" field="origin" sim={sim} value={draft.from} inputRef={fromRef}
              onChange={from => { update({ from }); setResult(''); }} placeholder="City or code" formatSelected={codeOnly}
              className="b-cell" hint={origin ? origin.city : 'Departing'} error={errors.from} externalErrorId="b-from-error" />
            <button type="button" className="b-swap" aria-label="Swap From and To" onClick={() => { swap(); setResult(''); track('swap_airports'); }}>
              <Icon icon="navigation:arrow-double-horizontal" size={24} />
            </button>
            <AirportCombobox foldKey="book-to" label="To" field="destination" sim={sim} value={draft.to} inputRef={toRef}
              onChange={to => { update({ to }); setResult(''); }} placeholder="City or code" formatSelected={codeOnly}
              className="b-cell" hint={draft.to.airport ? draft.to.airport.city : 'Arriving'} error={errors.to} externalErrorId="b-to-error"
              suggestions={suggestions} suggestionsLabel={origin ? `Popular from ${origin.city}` : 'Popular destinations'} />
          </div>
          {errors.from && <p className="field-error" id="b-from-error"><Icon icon="signal:error" size={16} />From: {errors.from}</p>}
          {errors.to && <p className="field-error" id="b-to-error"><Icon icon="signal:error" size={16} />To: {errors.to}</p>}
          <div className="b-controls">
            <button ref={datesRef} type="button" className={`b-field b-dates${errors.dates ? ' b-field-invalid' : ''}`}
              aria-describedby={errors.dates ? 'b-dates-error' : undefined} onClick={() => setDatesOpen(true)}>
              <span className="b-field-label">{draft.trip === 'round' ? 'Depart – return' : 'Depart'}</span>
              <span className={draft.depart ? 'b-field-value' : 'b-field-value b-field-empty'}>{formatDates(draft) || 'Add dates'}</span>
            </button>
            <label className="b-field b-field-select b-travelers">
              <span className="b-field-label">Travelers</span>
              <select value={draft.travelers} onChange={event => { update({ travelers: Number(event.target.value) }); setResult(''); }}>
                {Array.from({ length: 9 }, (_, index) => index + 1).map(count => <option key={count} value={count}>{count}</option>)}
              </select>
            </label>
            <button type="submit" className="b-search">Search</button>
          </div>
          {errors.dates && <p id="b-dates-error" className="field-error"><Icon icon="signal:error" size={16} />{errors.dates}</p>}
          {result && <div className="demo-note" role="status">
            <p>Design demo: {result}. Fares and seats load on aa.com.</p>
            <a href={links.flights} onClick={() => track('search_continue')}>Continue on aa.com <Icon icon="navigation:arrow-single-right" size={16} /></a>
          </div>}
        </form>
      </section>

      <div className="b-board b-service">
        <TripLine />
        <StatusLine />
      </div>

      <aside className="b-ad" ref={adRef} aria-labelledby="b-ad-title">
        <div className="b-ad-copy">
          <p className="b-ad-eyebrow"><span className="b-ad-tag">Ad</span>{cardAd.eyebrow}</p>
          <h2 id="b-ad-title" className="b-ad-headline ad-headline" data-fold="ad-headline">{cardAd.headline}</h2>
          <p className="b-ad-body">{cardAd.body} {cardAd.legal}</p>
          <a href={links.cards} onClick={() => track('card_click', { placement: 'board-announcement' })}>{cardAd.cta}<Icon icon="navigation:arrow-single-right" size={16} /></a>
        </div>
        <img className="b-ad-art" src={asset('credit-card-offer.png')} alt="" width="96" height="72" />
      </aside>

      <section className="b-before" aria-labelledby="b-before-title">
        <h2 id="b-before-title">Before you fly</h2>
        <ul>
          <li><a href={links.trips}><Icon icon="airport:boarding-pass" size={24} /><span><strong>Check-in opens 24 hours before departure</strong>Get your boarding pass and choose seats.</span></a></li>
          <li><a href={links.bags}><Icon icon="airport:baggage-suitcase" size={24} /><span><strong>Bags and fees</strong>Allowances by route and fare.</span></a></li>
          <li><a href={links.alerts}><Icon icon="signal:warning" size={24} /><span><strong>Travel alerts</strong>Weather and operational updates.</span></a></li>
          <li><a href={links.aadvantage}><Icon icon="aadvantage:account-summary" size={24} /><span><strong>AAdvantage®</strong>Miles, status, and Loyalty Points.</span></a></li>
        </ul>
      </section>
    </main>
    <SiteFooter className="b-footer" />
    <DatesDialog open={datesOpen} onClose={() => { setDatesOpen(false); datesRef.current?.focus(); }} draft={draft} update={patch => { update(patch); setResult(''); }} />
  </div>;
}
