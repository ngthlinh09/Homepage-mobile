import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
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
import './concept-c.css';

setVariant('concept-c');

const format = (airport: Airport) => `${airport.city} (${airport.code})`;
type SheetName = 'trip' | 'status' | null;

function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return <dialog ref={dialog} className="c-sheet" aria-label={title}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className="c-sheet-handle" aria-hidden="true" />
    <div className="c-sheet-heading">
      <h2>{title}</h2>
      <button type="button" className="icon-button" aria-label={`Close ${title}`} onClick={onClose}><Icon icon="action:close" size={24} /></button>
    </div>
    {open && children}
  </dialog>;
}

export default function ConceptC() {
  const sim = useMemo(readSimMode, []);
  const { draft, update, swap, errors, validate } = useBookingDraft('aa-concept-c-draft', { from: airportValue('DFW', format) });
  const [suggestedOrigin, setSuggestedOrigin] = useState(() => draft.from.airport?.code === 'DFW');
  const [datesOpen, setDatesOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [result, setResult] = useState('');
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);
  const datesRef = useRef<HTMLButtonElement>(null);
  const adRef = useRef<HTMLElement>(null);
  const sheetTrigger = useRef<HTMLButtonElement | null>(null);

  useImpression(adRef, 'card_impression', { placement: 'hero-card' });
  useEffect(() => {
    trackOnce('impression', 'homepage_impression', { irregularOps: sim.irregularOps });
    if (suggestedOrigin) trackOnce('origin_prefill', 'origin_prefilled', { code: 'DFW', source: 'nearest-airport' });
  }, [sim, suggestedOrigin]);

  const origin = draft.from.airport;
  const starters = (popularFrom[origin?.code ?? 'default'] ?? popularFrom.default)
    .filter(code => code !== origin?.code).map(code => findAirport(code)!);

  const advanceToDates = () => {
    if (!draft.depart) window.setTimeout(() => setDatesOpen(true), 120);
  };

  const pickStarter = (airport: Airport) => {
    update({ to: { query: format(airport), airport } });
    setResult('');
    track('destination_starter', { code: airport.code, placement: 'starter-chips' });
    trackOnce('booking_start', 'booking_start', { field: 'destination', code: airport.code });
    advanceToDates();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    track('search_submit', { valid: !Object.keys(found).length, placement: 'dock', trip: draft.trip, travelers: draft.travelers });
    if (found.from) fromRef.current?.focus();
    else if (found.to) toRef.current?.focus();
    else if (found.dates) { datesRef.current?.focus(); setDatesOpen(true); }
    else setResult(searchSummary(draft));
  };

  const openSheet = (name: Exclude<SheetName, null>, trigger: HTMLButtonElement) => {
    sheetTrigger.current = trigger;
    setSheet(name);
    track('shortcut_click', { task: name, placement: 'dock' });
  };
  const closeSheet = () => { setSheet(null); sheetTrigger.current?.focus(); };

  const route = draft.from.airport && draft.to.airport ? `${draft.from.airport.code} → ${draft.to.airport.code}` : '';

  return <div className="concept concept-c">
    <a className="skip-link" href="#c-main">Skip to main content</a>
    <a className="skip-link" href="#c-dock">Skip to quick tasks</a>
    <SiteHeader />
    <main id="c-main">
      {sim.irregularOps && <DisruptionNotice className="c-disruption" />}
      <section className="c-hero" aria-labelledby="c-title">
        <h1 id="c-title" className="c-title">Where are you headed?</h1>
        <form id="c-book-form" onSubmit={submit} noValidate aria-labelledby="c-title">
          <div className="c-card">
            <div className="c-route">
              <AirportCombobox foldKey="book-from" label="From" field="origin" sim={sim} value={draft.from} inputRef={fromRef}
                onChange={from => { update({ from }); setSuggestedOrigin(false); setResult(''); }}
                placeholder="City or airport" formatSelected={format} className="c-row" error={errors.from}
                hint={suggestedOrigin && draft.from.airport ? 'Nearest airport' : undefined} />
              <button type="button" className="c-swap" aria-label="Swap From and To"
                onClick={() => { swap(); setSuggestedOrigin(false); setResult(''); track('swap_airports'); }}>
                <Icon icon="navigation:arrow-double-vertical" size={24} />
              </button>
              <AirportCombobox foldKey="book-to" label="To" field="destination" sim={sim} value={draft.to} inputRef={toRef}
                onChange={to => { update({ to }); setResult(''); }} placeholder="Where to?" formatSelected={format}
                className="c-row" error={errors.to}
                suggestions={starters.slice(0, 5)} suggestionsLabel={origin ? `Popular from ${origin.city}` : 'Popular destinations'} />
            </div>
            <div className="c-card-foot">
              <button ref={datesRef} type="button" className={`c-half${errors.dates ? ' c-half-invalid' : ''}`}
                aria-describedby={errors.dates ? 'c-dates-error' : undefined} onClick={() => setDatesOpen(true)}>
                <Icon icon="operation:calendar" size={24} />
                <span><span className="visually-hidden">Travel dates: </span>{formatDates(draft) || 'Add dates'}</span>
              </button>
              <label className="c-half c-travelers">
                <Icon icon="operation:account" size={24} />
                <span className="visually-hidden">Travelers</span>
                <select value={draft.travelers} onChange={event => { update({ travelers: Number(event.target.value) }); setResult(''); }}>
                  {Array.from({ length: 9 }, (_, index) => index + 1).map(count =>
                    <option key={count} value={count}>{count} {count === 1 ? 'traveler' : 'travelers'}</option>)}
                </select>
              </label>
            </div>
          </div>
          {errors.dates && <p id="c-dates-error" className="field-error"><Icon icon="signal:error" size={16} />{errors.dates}</p>}
          {result && <div className="demo-note c-result" role="status">
            <p>Design demo: {result}. Fares and seats load on aa.com.</p>
            <a href={links.flights} onClick={() => track('search_continue')}>Continue on aa.com <Icon icon="navigation:arrow-single-right" size={16} /></a>
          </div>}
        </form>
        <div className="c-starters">
          <p id="c-starters-label" className="c-starters-label">{origin ? `Popular from ${origin.code}` : 'Popular destinations'}</p>
          <ul aria-labelledby="c-starters-label">
            {starters.map(airport => <li key={airport.code}>
              <button type="button" aria-pressed={draft.to.airport?.code === airport.code} onClick={() => pickStarter(airport)}>
                {airport.city}<span>{airport.code}</span>
              </button>
            </li>)}
          </ul>
        </div>
      </section>

      <aside className="c-ad" ref={adRef} aria-labelledby="c-ad-title">
        <img className="c-ad-art" src={asset('credit-card-offer.png')} alt="" width="72" height="72" />
        <div>
          <p className="c-ad-eyebrow"><span className="c-ad-tag">Ad</span>{cardAd.eyebrow}</p>
          <h2 id="c-ad-title" className="c-ad-headline ad-headline" data-fold="ad-headline">{cardAd.headline}</h2>
          <p className="c-ad-body">{cardAd.body} {cardAd.legal}</p>
          <a href={links.cards} onClick={() => track('card_click', { placement: 'hero-card' })}>{cardAd.cta}<Icon icon="navigation:arrow-single-right" size={16} /></a>
        </div>
      </aside>

      <section className="c-more" aria-labelledby="c-more-title">
        <h2 id="c-more-title">Plan the whole trip</h2>
        <a className="c-story" href={links.offers}>
          <img src={asset('flight-deals.png')} alt="Rock formation on a beach at sunset" loading="lazy" />
          <span className="c-story-text"><strong>A little getaway. A lot to discover.</strong>Explore flight deals</span>
        </a>
        <ul className="c-links">
          <li><a href="https://www.aavacations.com/"><Icon icon="transportation:flight-angled-right-alt" size={24} />Vacation packages<Icon icon="navigation:new-window" size={16} /></a></li>
          <li><a href="https://www.aadvantagehotels.com/"><Icon icon="transportation:hotel-alt" size={24} />Hotels<Icon icon="navigation:new-window" size={16} /></a></li>
          <li><a href="https://www.aa.com/car"><Icon icon="transportation:taxi-alt" size={24} />Cars<Icon icon="navigation:new-window" size={16} /></a></li>
        </ul>
      </section>
      <SiteFooter className="c-footer" />
    </main>

    <nav id="c-dock" data-fold-obstruction className="c-dock" aria-label="Quick tasks">
      <button type="button" data-fold="trip" className="c-dock-task" onClick={event => openSheet('trip', event.currentTarget)}>
        <Icon icon="airport:boarding-pass" size={24} /><span>Trips &amp; check-in</span>
      </button>
      <button type="button" data-fold="status" className="c-dock-task" onClick={event => openSheet('status', event.currentTarget)}>
        <Icon icon="airport:flight-status" size={24} /><span>Flight status</span>
      </button>
      <button type="submit" form="c-book-form" className="c-dock-primary">
        <Icon icon="operation:search" size={24} />
        <span>{route ? <>Search <span className="c-dock-route">{route}</span></> : 'Search flights'}</span>
      </button>
    </nav>

    <Sheet open={sheet === 'trip'} title="Trips & check-in" onClose={closeSheet}><TripLookup variant="concept-c" autoFocus /></Sheet>
    <Sheet open={sheet === 'status'} title="Flight status" onClose={closeSheet}><StatusLookup variant="concept-c" autoFocus /></Sheet>
    <DatesDialog open={datesOpen} className="c-dates" onClose={() => { setDatesOpen(false); datesRef.current?.focus(); }} draft={draft} update={patch => { update(patch); setResult(''); }} />
  </div>;
}
