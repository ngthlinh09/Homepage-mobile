import { useState } from 'react';
import App from './App';
import { bookingTreatments, getBookingTreatment, type BookingTreatment } from './booking-treatments';
import { bookingVersions, getBookingDesignVersion, type BookingDesignVersion } from './booking-versions';
import './interaction-lab.css';

export default function InteractionLab() {
  const [treatment, setTreatment] = useState<BookingTreatment>(() => getBookingTreatment('baseline'));
  const [version, setVersion] = useState<BookingDesignVersion>(getBookingDesignVersion);
  const [resetKey, setResetKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const selected = version === 'v4' ? {
    instruction: 'Open any travel section. The current section closes first, then the new one opens. Expand booking options and use Show less to return to compact booking.',
    hypothesis: 'Dividers keep the travel tools together, while sequential accordion motion makes the one-open-at-a-time relationship clear.',
    watchFor: 'Does the closing-then-opening sequence make switching predictable while retaining drafts and keyboard focus?',
  } : version === 'v3' ? {
    instruction: 'Select an airport to open booking. Use the two shortcuts for trips and flight status. Close each panel to return home.',
    hypothesis: 'A compact homepage with focused search panels keeps the next task clear without crowding the page.',
    watchFor: 'Can people enter a task, complete it, and return home without losing their draft?',
  } : version === 'v2' ? {
    instruction: 'Book starts open. Open Your trip & check-in or Flight status to try the other tools.',
    hypothesis: 'Stacked cards make each travel task individually discoverable instead of relying on tabs.',
    watchFor: 'Does the stronger separation help people find their task, or does the extra height add friction?',
  } : bookingTreatments.find(item => item.id === treatment)!;

  const updateUrl = (nextVersion: BookingDesignVersion, nextTreatment: BookingTreatment) => {
    const url = new URL(window.location.href);
    url.searchParams.set('version', nextVersion);
    url.searchParams.set('reveal', nextVersion !== 'v1' ? 'baseline' : nextTreatment);
    window.history.replaceState(null, '', url);
  };

  const changeTreatment = (next: BookingTreatment) => {
    setTreatment(next);
    updateUrl(version, next);
  };

  return <div className="interaction-lab">
    <aside className="interaction-study-controls" aria-label="Interaction study controls">
      <p className="interaction-study-eyebrow">BOOKING DESIGN LAB</p>
      <h1>Same homepage.<br /> Different booking tools.</h1>
      <div className="interaction-study-picker interaction-version-picker">
        <label htmlFor="design-version">Design version</label>
        <select id="design-version" value={version} onChange={event => {
          const next = event.target.value as BookingDesignVersion;
          setVersion(next); updateUrl(next, treatment);
        }}>
          {bookingVersions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      {version === 'v1' && <div className="interaction-study-picker">
        <label htmlFor="reveal-treatment">Treatment</label>
        <select id="reveal-treatment" value={treatment} onChange={event => changeTreatment(event.target.value as BookingTreatment)}>
          {bookingTreatments.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>}
      <p className="interaction-study-instruction">{selected.instruction}</p>
      <div className="interaction-study-actions">
        <button type="button" onClick={() => setResetKey(key => key + 1)}>Reset interaction</button>
        <a href={`/?version=${version}&reveal=${version !== 'v1' ? 'baseline' : treatment}`}>Open clean preview ↗</a>
      </div>
      <p className="interaction-study-state" role="status">{version === 'v4'
        ? `One travel section at a time — booking options ${expanded ? 'expanded' : 'compact'}`
        : version === 'v3'
        ? expanded ? 'Search panel open — close to return home' : 'Homepage — ready to try'
        : version === 'v2'
        ? `Search options ${expanded ? 'expanded' : 'collapsed'} — reset to try again`
        : expanded ? 'Expanded — reset to try again' : 'Collapsed — ready to try'}</p>
      <div className="interaction-study-notes">
        <h2>What to test</h2>
        <p>{selected.hypothesis}</p>
        <h2>Watch for</h2>
        <p>{selected.watchFor}</p>
        <p className="interaction-study-scope">Controls stay outside the phone. Version 1 uses tabs; Version 2 uses stacked cards; Version 3 uses focused search panels; Version 4 uses a divider-based, exclusive accordion. Payment, advanced search, and the phone-contained calendar are shared. The ad and lower homepage use the same components.</p>
      </div>
    </aside>
    <div className="interaction-study-prototype">
      <App designVersion={version} expansionTreatment={version !== 'v1' ? 'baseline' : treatment} bookingResetKey={resetKey} onBookingExpansionChange={setExpanded} />
    </div>
  </div>;
}
