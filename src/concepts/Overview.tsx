import { useCallback, useEffect, useRef, useState } from 'react';
import { measureFold, type FoldResult } from './shared/fold';
import type { AnalyticsEvent } from './shared/analytics';
import './overview.css';

const viewports = [
  { id: 'se', width: 375, height: 548, label: '375 × 548', note: 'iPhone SE, Safari bars' },
  { id: 'android', width: 360, height: 640, label: '360 × 640', note: 'Android baseline' },
  { id: 'iphone', width: 390, height: 664, label: '390 × 664', note: 'iPhone 15, Safari bars' },
  { id: 'max', width: 430, height: 740, label: '430 × 740', note: 'Pro Max, Safari bars' },
];
const scenarios = [
  { id: 'normal', label: 'Normal', query: '' },
  { id: 'irregular', label: 'Irregular operations', query: 'ops=irregular' },
  { id: 'offline', label: 'Autocomplete offline', query: 'sim=offline' },
  { id: 'slow', label: 'Slow network', query: 'sim=slow' },
];

const concepts = [
  {
    id: 'a', name: 'One Canvas', thesis: 'One question at a time. The page turns into whichever task you pick.',
    bet: 'Fewer competing elements means a faster first entry. Trips and status replace the booking form in place, so you never leave the page, and your search draft is kept.',
    beyond: 'No tabs, no launcher, no hero banner. Servicing is offered as “Already booked?” rather than as a navigation category.',
    moves: 'Booking starts · ease rating · perceived modernity',
    risk: 'Servicing sits under booking, so returning travelers may scan past it. Measure time to first task for check-in against B.',
    pattern: 'Hairline airport combobox, in-place task swap.',
  },
  {
    id: 'b', name: 'Departure Board', thesis: 'All three tasks are open and typeable at once on one panel, in the language of airport signage.',
    bet: 'Entering a confirmation code or flight number right on the homepage removes a page load and a decision for travelers flying today.',
    beyond: 'Lookups happen on the homepage itself. Airport codes are the main element, and a disruption alert takes over the top row.',
    moves: 'Service completion · speed to task · day-of-travel confidence',
    risk: 'The dark, dense layout moves away from the brand’s light surfaces, and a busy first screen may slow shoppers. Measure booking starts against A.',
    pattern: 'Board cells, inline trip and status lookups, status row.',
  },
  {
    id: 'c', name: 'Thumb Dock', thesis: 'A mobile site that behaves like the app. Tasks stay within thumb reach wherever you scroll.',
    bet: 'A suggested origin, one-tap destinations, and a search button that’s always visible cut the steps to a valid search.',
    beyond: 'A fixed bottom bar whose main button shows your trip (“Search DFW → CUN”). Trips and status open in bottom sheets.',
    moves: 'Conversion · booking starts · speed to task',
    risk: 'The dock takes 68px from every screen. The suggested origin needs a privacy review of IP location, a confidence threshold, and a fallback.',
    pattern: 'Task dock, bottom sheet, destination chips.',
  },
];

function FrameCard({ concept, viewport, scenario, reloadKey }: {
  concept: typeof concepts[number]; viewport: typeof viewports[number]; scenario: typeof scenarios[number]; reloadKey: number;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [results, setResults] = useState<FoldResult[] | null>(null);

  const measure = useCallback(async () => {
    const win = frame.current?.contentWindow;
    const doc = frame.current?.contentDocument;
    if (!win || !doc) return;
    await doc.fonts.ready;
    window.setTimeout(() => setResults(measureFold(doc, win)), 900);
  }, []);

  useEffect(() => { setResults(null); }, [viewport.id, scenario.id, reloadKey]);

  const src = `/concepts/${concept.id}${scenario.query ? `?${scenario.query}` : ''}`;
  const passed = results?.filter(result => result.ok).length ?? 0;

  return <article className="ov-concept" aria-labelledby={`ov-${concept.id}-title`} style={{ width: `min(100%, ${viewport.width + 16}px)` }}>
    <header className="ov-concept-head">
      <span className="ov-letter" aria-hidden="true">{concept.id.toUpperCase()}</span>
      <div>
        <h2 id={`ov-${concept.id}-title`}><span className="visually-hidden">Concept {concept.id.toUpperCase()}: </span>{concept.name}</h2>
        <p>{concept.thesis}</p>
      </div>
    </header>
    <div className="ov-frame" style={{ width: viewport.width + 16 }}>
      <iframe key={`${viewport.id}-${scenario.id}-${reloadKey}`} ref={frame} title={`Concept ${concept.id.toUpperCase()}, ${concept.name}, at ${viewport.label}`}
        src={src} width={viewport.width} height={viewport.height} onLoad={measure} />
    </div>
    <div className="ov-fold" aria-live="polite">
      <p className="ov-fold-title">
        Above-the-fold check · {viewport.label}
        {results && <span className={passed === results.length ? 'ov-pass' : 'ov-warn'}>{passed}/{results.length}</span>}
      </p>
      {!results ? <p className="ov-fold-pending">Measuring…</p> : <ul>
        {results.map(result => {
          const yields = !result.ok && result.key === 'ad-headline' && scenario.id === 'irregular';
          return <li key={result.key} className={result.ok ? 'ok' : yields ? 'yield' : 'fail'}>
            <span className="ov-mark" aria-hidden="true">{result.ok ? '✓' : yields ? '↓' : '✕'}</span>
            {result.label}
            <span className="ov-px">{result.ok ? `ends ${result.bottom}px / ${result.limit}` : yields ? 'gives way to the alert (by design)' : `ends ${result.bottom ?? '—'}px, limit ${result.limit}`}</span>
          </li>;
        })}
      </ul>}
    </div>
    <dl className="ov-facts">
      <div><dt>Bet</dt><dd>{concept.bet}</dd></div>
      <div><dt>Beyond convention</dt><dd>{concept.beyond}</dd></div>
      <div><dt>Metrics it should move</dt><dd>{concept.moves}</dd></div>
      <div><dt>Risk to test</dt><dd>{concept.risk}</dd></div>
      <div><dt>New pattern work</dt><dd>{concept.pattern}</dd></div>
    </dl>
    <a className="ov-open" href={`/concepts/${concept.id}`} target="_blank" rel="noreferrer">Open concept {concept.id.toUpperCase()} full screen</a>
  </article>;
}

function EventLog() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  useEffect(() => {
    const onMessage = (message: MessageEvent) => {
      if (message.origin !== window.location.origin || message.data?.type !== 'aa-analytics') return;
      setEvents(current => [message.data.payload as AnalyticsEvent, ...current].slice(0, 14));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  const detail = (event: AnalyticsEvent) => Object.entries(event)
    .filter(([key]) => !['event', 'variant', 'viewport', 'timestamp'].includes(key))
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`).join(' · ');

  return <section className="ov-log" aria-labelledby="ov-log-title">
    <h2 id="ov-log-title">Live analytics events (FR-7)</h2>
    <p>Interact with any concept above. Each event includes the variant and viewport, so experiment results can be broken down by device height.</p>
    {events.length === 0 ? <p className="ov-log-empty">No interactions yet. Focus a field or tap a shortcut.</p>
      : <table>
        <thead><tr><th scope="col">Variant</th><th scope="col">Event</th><th scope="col">Details</th><th scope="col">Viewport</th></tr></thead>
        <tbody>{events.map(event => <tr key={`${event.timestamp}-${event.event}-${event.variant}`}>
          <td><span className={`ov-variant ov-variant-${event.variant.slice(-1)}`}>{event.variant.replace('concept-', '').toUpperCase()}</span></td>
          <td className="ov-event">{event.event}</td>
          <td className="ov-detail">{detail(event) || '—'}</td>
          <td className="ov-detail">{event.viewport.width}×{event.viewport.height}</td>
        </tr>)}</tbody>
      </table>}
  </section>;
}

const requirements = [
  ['FR-1 Booking fields work on load', 'From and To work on load, with no tab or drawer', 'From and To are large code cells you can type in', 'Origin is suggested; To is ready, with one-tap destinations'],
  ['FR-2 Tasks above the fold', '“Already booked?” pair sits under Search', 'Inline trip and status rows sit under booking', 'Fixed dock, visible at every height and scroll position'],
  ['FR-3 Card headline visible', 'Short note after the tasks, labeled “Ad”', 'White ad strip, set apart from the dark task panel', 'Compact card sitting above the dock'],
  ['FR-5 Accessible interaction', 'ARIA 1.2 combobox, 44px targets, errors linked to fields, focus moves to the new task heading on switch', 'Same, plus visible field labels in every cell', 'Same, plus a skip link to the dock; sheets return focus to the button that opened them'],
  ['FR-6 Resilient states', 'Loading, no results, offline code fallback, validation; draft kept for the session', 'Same, plus a disruption row that takes over the top', 'Same; sheet inputs survive close and reopen'],
];

export default function Overview() {
  const [viewportId, setViewportId] = useState('se');
  const [scenarioId, setScenarioId] = useState('normal');
  const [reloadKey, setReloadKey] = useState(0);
  const viewport = viewports.find(item => item.id === viewportId)!;
  const scenario = scenarios.find(item => item.id === scenarioId)!;

  useEffect(() => { document.title = 'Homepage concepts — American Airlines'; }, []);

  const reset = () => {
    Object.keys(sessionStorage).filter(key => key.startsWith('aa-')).forEach(key => sessionStorage.removeItem(key));
    setReloadKey(key => key + 1);
  };

  return <div className="ov">
    <header className="ov-head">
      <p className="ov-kicker">American Airlines · Homepage redesign · PRD draft v0.1</p>
      <h1>Three ways to make the homepage start the trip</h1>
      <p className="ov-lede">All three concepts meet the same MVP rules. From and To work as soon as the page loads. Book, Trips / check-in, and Flight status are visible without scrolling. The card ad’s headline sentence is fully readable. Only the organizing model changes between them.</p>
      <a className="ov-baseline" href="/">Compare with the current homepage</a>
    </header>

    <div className="ov-controls">
      <fieldset>
        <legend>Viewport (visible area after browser bars)</legend>
        <div className="ov-chips">{viewports.map(item => <label key={item.id} className={item.id === viewportId ? 'on' : ''}>
          <input type="radio" name="viewport" value={item.id} checked={item.id === viewportId} onChange={() => setViewportId(item.id)} />
          <strong>{item.label}</strong><span>{item.note}</span>
        </label>)}</div>
      </fieldset>
      <fieldset>
        <legend>Scenario</legend>
        <div className="ov-chips">{scenarios.map(item => <label key={item.id} className={item.id === scenarioId ? 'on' : ''}>
          <input type="radio" name="scenario" value={item.id} checked={item.id === scenarioId} onChange={() => setScenarioId(item.id)} />
          <strong>{item.label}</strong>
        </label>)}</div>
      </fieldset>
      <button type="button" className="ov-reset" onClick={reset}>Reset demo data</button>
    </div>

    <div className="ov-concepts">
      {concepts.map(concept => <FrameCard key={concept.id} concept={concept} viewport={viewport} scenario={scenario} reloadKey={reloadKey} />)}
    </div>

    <EventLog />

    <section className="ov-matrix" aria-labelledby="ov-matrix-title">
      <h2 id="ov-matrix-title">How each concept meets the MVP</h2>
      <div className="ov-table-wrap">
        <table>
          <thead><tr><th scope="col">Requirement</th><th scope="col">A · One Canvas</th><th scope="col">B · Departure Board</th><th scope="col">C · Thumb Dock</th></tr></thead>
          <tbody>{requirements.map(([requirement, ...cells]) => <tr key={requirement}>
            <th scope="row">{requirement}</th>{cells.map((cell, index) => <td key={index}>{cell}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="ov-rec" aria-labelledby="ov-rec-title">
      <h2 id="ov-rec-title">Recommendation for the prototype test</h2>
      <p><strong>Test C against B.</strong> They make opposite bets. C is built for shoppers, B for travelers who already have a trip. The result will show the real traffic mix behind the PRD’s “mixed intent” tradeoff, which a stakeholder debate can’t settle. Keep A as the low-risk fallback, and carry its in-place task swap into whichever concept wins.</p>
      <p>Before the test, the PRD needs answers to three open questions: the formal viewport matrix (the strict case used here is 375 × 548), whether FR-3 counts an impression or a readable headline, and legal approval of the shortened ad copy.</p>
    </section>

    <footer className="ov-foot">
      <p>Design prototypes. Airport search, trip lookups, and status results are simulated; any sample flight data is labeled. Not connected to American Airlines services.</p>
    </footer>
  </div>;
}
