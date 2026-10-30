import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Icon } from '@aileron/react-components';
import { AirportCombobox } from './shared/AirportCombobox';
import { DatesDialog } from './shared/DatesDialog';
import { SiteHeader } from './shared/SiteHeader';
import { DisruptionNotice, SiteFooter } from './shared/Chrome';
import { StatusLookup, TripLookup } from './shared/LookupForms';
import { airportValue, formatDates, searchSummary, useBookingDraft } from './shared/booking';
import { asset, cardAd, findAirport, links, popularFrom, readSimMode, type Airport } from './shared/data';
import { setVariant, track, trackOnce, useImpression } from './shared/analytics';
import './shared/concepts.css';
import './concept-a.css';

setVariant('concept-a');

type Mode = 'book' | 'trip' | 'status';
const modes: Record<Mode, { title: string; lead: string; switchLabel: string; icon: string }> = {
  book: { title: 'Where to next?', lead: '', switchLabel: 'Book a flight', icon: 'transportation:flight-angled-right-alt' },
  trip: { title: 'Find your trip', lead: 'Check in, change seats, or manage your reservation.', switchLabel: 'Trips & check-in', icon: 'airport:boarding-pass' },
  status: { title: 'Track a flight', lead: 'Departure, arrival, and gate information.', switchLabel: 'Flight status', icon: 'airport:flight-status' },
};
const format = (airport: Airport) => `${airport.city} (${airport.code})`;

export default function ConceptA() {
  const sim = useMemo(readSimMode, []);
  const { draft, update, swap, errors, validate } = useBookingDraft('aa-concept-a-draft');
  const [mode, setMode] = useState<Mode>('book');
  const [datesOpen, setDatesOpen] = useState(false);
  const [result, setResult] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const datesRef = useRef<HTMLButtonElement>(null);
  const adRef = useRef<HTMLElement>(null);
  const switched = useRef(false);

  useImpression(adRef, 'card_impression', { placement: 'postscript' });
  useEffect(() => { trackOnce('impression', 'homepage_impression', { irregularOps: sim.irregularOps }); }, [sim]);
  useEffect(() => { if (switched.current) titleRef.current?.focus(); }, [mode]);

  const origin = draft.from.airport;
  const popular = (popularFrom[origin?.code ?? 'default'] ?? popularFrom.default)
    .filter(code => code !== origin?.code).map(code => findAirport(code)!).slice(0, 5);

  const switchMode = (next: Mode) => {
    switched.current = true;
    setMode(next);
    setResult('');
    track('shortcut_click', { task: next, placement: 'or-row' });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    track('search_submit', { valid: !Object.keys(found).length, trip: draft.trip, travelers: draft.travelers });
    if (found.from) fromRef.current?.focus();
    else if (found.to) toRef.current?.focus();
    else if (found.dates) datesRef.current?.focus();
    else setResult(searchSummary(draft));
  };

  const pickDestination = (code: string) => {
    update({ to: airportValue(code, format) });
    track('destination_starter', { code, placement: 'popular-list' });
    trackOnce('booking_start', 'booking_start', { field: 'destination', code });
    if (mode !== 'book') setMode('book');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => datesRef.current?.focus({ preventScroll: true }), 50);
  };

  const others = (Object.keys(modes) as Mode[]).filter(item => item !== mode);

  return <div className="concept concept-a">
    <a className="skip-link" href="#a-main">Skip to main content</a>
    <SiteHeader />
    {sim.irregularOps && <DisruptionNotice className="a-disruption" />}
    <main id="a-main">
      <section className="a-task" aria-labelledby="a-title">
        <h1 id="a-title" ref={titleRef} tabIndex={-1} className="a-title">{modes[mode].title}</h1>
        {modes[mode].lead && <p className="a-lead">{modes[mode].lead}</p>}

        {mode === 'book' && <form className="a-book" onSubmit={submit} noValidate aria-labelledby="a-title">
          <div className="a-route">
            <AirportCombobox foldKey="book-from" label="From" field="origin" sim={sim} value={draft.from} inputRef={fromRef}
              onChange={from => { update({ from }); setResult(''); }} placeholder="City or airport" error={errors.from}
              formatSelected={format} className="a-line" />
            <button type="button" className="a-swap" aria-label="Swap From and To"
              onClick={() => { swap(); setResult(''); track('swap_airports'); }}>
              <Icon icon="navigation:arrow-double-vertical" size={24} />
            </button>
            <AirportCombobox foldKey="book-to" label="To" field="destination" sim={sim} value={draft.to} inputRef={toRef}
              onChange={to => { update({ to }); setResult(''); }} placeholder="City or airport" error={errors.to}
              formatSelected={format} className="a-line"
              suggestions={popular} suggestionsLabel={origin ? `Popular from ${origin.city}` : 'Popular destinations'} />
          </div>
          <div className="a-meta">
            <button ref={datesRef} type="button" className={`a-token${errors.dates ? ' a-token-invalid' : ''}`}
              aria-describedby={errors.dates ? 'a-dates-error' : undefined} onClick={() => setDatesOpen(true)}>
              <Icon icon="operation:calendar" size={24} />
              <span className="a-token-text">
                <span className="visually-hidden">Travel dates: </span>
                <span className={draft.depart ? 'a-token-value' : 'a-token-placeholder'}>{formatDates(draft) || 'Add dates'}</span>
                <span className="a-token-sub">{draft.trip === 'round' ? 'Round trip' : 'One way'}</span>
              </span>
            </button>
            <label className="a-token a-travelers">
              <Icon icon="operation:account" size={24} />
              <span className="visually-hidden">Travelers</span>
              <select value={draft.travelers} onChange={event => { update({ travelers: Number(event.target.value) }); setResult(''); }}>
                {Array.from({ length: 9 }, (_, index) => index + 1).map(count =>
                  <option key={count} value={count}>{count} {count === 1 ? 'traveler' : 'travelers'}</option>)}
              </select>
            </label>
          </div>
          {errors.dates && <p id="a-dates-error" className="field-error"><Icon icon="signal:error" size={16} />{errors.dates}</p>}
          <button type="submit" className="a-primary">Search flights</button>
          {result && <div className="demo-note" role="status">
            <p>Design demo: your search ({result}) is ready. Fares and seats load on aa.com.</p>
            <a href={links.flights} onClick={() => track('search_continue')}>Continue on aa.com <Icon icon="navigation:arrow-single-right" size={16} /></a>
          </div>}
        </form>}

        {mode === 'trip' && <div className="a-service"><TripLookup variant="concept-a" /></div>}
        {mode === 'status' && <div className="a-service"><StatusLookup variant="concept-a" /></div>}

        <nav className="a-or" aria-label="Other tasks">
          <p className="a-or-label">{mode === 'book' ? 'Already booked?' : 'Or'}</p>
          <div className="a-or-actions">
            {others.map(item => <button key={item} data-fold={item} type="button" className="a-alt" onClick={() => switchMode(item)}>
              <Icon icon={modes[item].icon} size={24} />{modes[item].switchLabel}
            </button>)}
          </div>
        </nav>
      </section>

      <aside className="a-ad" ref={adRef} aria-labelledby="a-ad-title">
        <img className="a-ad-art" src={asset('credit-card-offer.png')} alt="" width="88" height="88" />
        <div className="a-ad-copy">
          <p className="a-ad-eyebrow"><span className="a-ad-tag">Ad</span>{cardAd.eyebrow}</p>
          <h2 id="a-ad-title" className="a-ad-headline ad-headline" data-fold="ad-headline">{cardAd.headline}</h2>
          <p className="a-ad-body">{cardAd.body} {cardAd.legal}</p>
          <a className="a-ad-link" href={links.cards} onClick={() => track('card_click', { placement: 'postscript' })}>
            {cardAd.cta}<Icon icon="navigation:arrow-single-right" size={16} />
          </a>
        </div>
      </aside>

      <section className="a-popular" aria-labelledby="a-popular-title">
        <h2 id="a-popular-title">{origin ? `Popular from ${origin.city}` : 'Popular destinations'}</h2>
        <p>Pick a destination to start your search.</p>
        <ul>
          {popular.map(airport => <li key={airport.code}>
            <button type="button" onClick={() => pickDestination(airport.code)}>
              <span className="a-popular-city">{airport.city}</span>
              <span className="a-popular-code">{airport.code}</span>
              <Icon icon="navigation:arrow-single-right" size={24} />
            </button>
          </li>)}
        </ul>
      </section>

      <section className="a-story" aria-labelledby="a-story-title">
        <img src={asset('flight-deals.png')} alt="Rock formation on a beach at sunset" loading="lazy" />
        <div>
          <h2 id="a-story-title">A little getaway. A lot to discover.</h2>
          <p>Find great fares for your next adventure.</p>
          <a href={links.offers}>Explore flight deals <Icon icon="navigation:arrow-single-right" size={16} /></a>
        </div>
      </section>
    </main>
    <SiteFooter />
    <DatesDialog open={datesOpen} onClose={() => { setDatesOpen(false); datesRef.current?.focus(); }} draft={draft} update={patch => { update(patch); setResult(''); }} />
  </div>;
}
