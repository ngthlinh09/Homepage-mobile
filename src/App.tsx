import { useEffect, useRef, useState, type ComponentRef, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Accordion, AccordionItem, Button, Calendar, Checkbox, DateInput, Icon, Select, type DateInputHandle } from '@aileron/react-components';
import PaymentSwitcher from './PaymentSwitcher';
import { getBookingTreatment, type BookingTreatment } from './booking-treatments';
import { getBookingDesignVersion, type BookingDesignVersion } from './booking-versions';
import PullToReveal from './PullToReveal';
import TripLookup from './TripLookup';
import FlightStatus, { type FlightStatusDates, type FlightStatusMode } from './FlightStatus';
import FocusedSearchDialog from './FocusedSearchDialog';
import ExclusiveTravelTools from './ExclusiveTravelTools';
import TravelCategories, { type BookingCategory } from './TravelCategories';
import VacationSearch, { type VacationDraft } from './VacationSearch';
import RouteField from './RouteField';
import TextField from './TextField';
import './styles.css';
import './booking-versions.css';
import './input-fields.css';
import './booking-version-3.css';
import './booking-version-4.css';

const asset = (name: string) => `/assets/${name}`;
const links = {
  login: 'https://www.aa.com/loyalty/login',
  flights: 'https://www.aa.com/booking/find-flights',
  trips: 'https://www.aa.com/reservation/view/find-your-reservation',
  status: 'https://www.aa.com/travelInformation/flights/status',
  alerts: 'https://www.aa.com/i18n/travel-info/travel-alerts.jsp',
  cards: 'https://www.aa.com/i18n/aadvantage-program/credit-cards/',
  offers: 'https://www.aa.com/i18n/travel-info/travel-offers.jsp',
};

function StatusBar() {
  // Presentation chrome from the supplied Figma frame, not the device's live status.
  return <div className="status-bar" aria-hidden="true">
    <span className="status-time">9:41</span>
    <div className="status-levels">
      <img src={asset('cellular.svg')} alt="" />
      <img src={asset('wifi.svg')} alt="" />
      <img src={asset('battery.svg')} alt="" />
    </div>
  </div>;
}

function Header({ designVersion }: { designVersion: BookingDesignVersion }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return <header className={`airline-header${designVersion !== 'v1' ? ' airline-header-v2' : ''}`}>
    <div className="header-content">
      <a href="https://www.aa.com/" aria-label="American Airlines home" className="brand">
        <img src={asset('american-airlines.png')} alt="American Airlines" width="158" height="36" />
      </a>
      <div className="header-actions">
        {designVersion !== 'v1'
          ? <Button className="v2-login-button" variant="primary" size="sm" href={links.login}>Log in</Button>
          : <a className="login-link" href={links.login}>Log in</a>}
        <button ref={menuButton} className="menu-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <Icon icon="action:close" size={24} /> : <img src={asset(designVersion !== 'v1' ? 'header-menu-v2.svg' : 'menu.svg')} alt="" />}
        </button>
      </div>
    </div>
    {menuOpen && <nav id="main-navigation" className="main-navigation" aria-label="Main navigation">
      <a href={links.flights}>Book a flight</a>
      <a href={links.trips}>Your trips / Check-in</a>
      <a href={links.status}>Flight status</a>
      <a href="https://www.aa.com/i18n/aadvantage-program/aadvantage-program.jsp">AAdvantage®</a>
    </nav>}
    {designVersion !== 'v1' && <img className="v2-header-divider" src={asset('header-divider-v2.svg')} alt="" />}
  </header>;
}

const tabs = ['Book', 'Your trips / Check-in', 'Flight status'] as const;
const paymentLabels: Record<string, string> = { cash: 'cash', 'cash-miles': 'cash + miles', miles: 'miles' };
type Tab = typeof tabs[number];
const bookingCards: { id: string; tab: Tab; label: string; icon: string }[] = [
  { id: 'book', tab: 'Book', label: 'Book', icon: 'operation:booking-search' },
  { id: 'trips', tab: 'Your trips / Check-in', label: 'Your trip & check-in', icon: 'airport:baggage-confirm' },
  { id: 'status', tab: 'Flight status', label: 'Flight status', icon: 'graphical:clock' },
];

function BookingReveal({ expanded, children }: { expanded: boolean; children: ReactNode }) {
  return <div className="booking-reveal" data-expanded={expanded} aria-hidden={!expanded} inert={!expanded}>
    <div className="booking-reveal-body">{children}</div>
  </div>;
}

type CalendarTarget = 'book' | 'trip' | 'status' | 'vacations';

function BookingWidget({ treatment, designVersion, onExpansionChange }: { treatment: BookingTreatment; designVersion: BookingDesignVersion; onExpansionChange?: (expanded: boolean) => void }) {
  const progressive = treatment !== 'baseline';
  const [tab, setTab] = useState<Tab>('Book');
  const [cardOpen, setCardOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [bookingCategory, setBookingCategory] = useState<BookingCategory>('flights');
  const [vacationVisited, setVacationVisited] = useState(false);
  const [vacationDraft, setVacationDraft] = useState<VacationDraft>({
    from: 'DFW', to: '', depart: null, return: null, passengers: '1', fare: 'coach',
  });
  const [focusedTool, setFocusedTool] = useState<Tab | null>(null);
  const [initialAirport, setInitialAirport] = useState<'From' | 'To' | null>(null);
  const focusedReturnRef = useRef<HTMLElement | null>(null);
  const homeHeadingRef = useRef<HTMLHeadingElement>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [routeErrors, setRouteErrors] = useState<{ from?: string; to?: string }>({});
  const [oneWay, setOneWay] = useState(false);
  const [passengers, setPassengers] = useState('1');
  const [payment, setPayment] = useState('cash');
  const [cabin, setCabin] = useState('any');
  const [departure, setDeparture] = useState<string | null>(null);
  const [returnDate, setReturnDate] = useState<string | null>(null);
  // Illustrative dates from the supplied trip-lookup Figma state.
  const [tripStartDate, setTripStartDate] = useState<string | null>('2027-01-20');
  const [tripEndDate, setTripEndDate] = useState<string | null>('2027-02-12');
  const [statusDate, setStatusDate] = useState<string | null>(null);
  const [statusMode, setStatusMode] = useState<FlightStatusMode>(designVersion === 'v3' ? 'number' : 'cities');
  const [statusDates, setStatusDates] = useState<Record<FlightStatusMode, FlightStatusDates>>({
    cities: { start: null, end: null },
    // Illustrative populated state from the supplied flight-number screenshot.
    number: { start: '2027-01-20', end: '2027-02-12' },
  });
  const activeStatusDates = statusDates[statusMode];
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>('book');
  const [calendarBounds, setCalendarBounds] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [message, setMessage] = useState('');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tripTypeRef = useRef<HTMLSelectElement>(null);
  const expandedFieldsRef = useRef<HTMLDivElement>(null);
  const expandedByKeyboardRef = useRef(false);
  const preserveCurrentFocusRef = useRef(false);
  const dateInputRef = useRef<DateInputHandle>(null);
  const tripDateInputRef = useRef<DateInputHandle>(null);
  const statusDateInputRef = useRef<DateInputHandle>(null);
  const vacationDateInputRef = useRef<DateInputHandle>(null);
  const calendarDialogRef = useRef<HTMLDialogElement>(null);
  const calendarRef = useRef<ComponentRef<typeof Calendar>>(null);
  const calendarEditingRef = useRef<'start' | 'end'>('start');
  const calendarUserActionRef = useRef(false);
  const bookingSectionRef = useRef<HTMLElement>(null);

  const measureCalendarBounds = () => {
    const phone = bookingSectionRef.current?.closest<HTMLElement>('[data-phone-viewport]');
    if (!phone) return null;
    const rect = phone.getBoundingClientRect();
    const viewportTop = window.visualViewport?.offsetTop ?? 0;
    const viewportBottom = Math.min(window.innerHeight, viewportTop + (window.visualViewport?.height ?? window.innerHeight));
    const left = Math.max(0, rect.left);
    const top = Math.max(viewportTop, rect.top);
    return {
      left, top,
      width: Math.max(1, Math.min(rect.right, window.innerWidth) - left),
      height: Math.max(1, Math.min(rect.bottom, viewportBottom) - top),
    };
  };

  useEffect(() => {
    if (designVersion === 'v3' || bookingCategory !== 'flights' || !expanded || preserveCurrentFocusRef.current) return;
    const frame = requestAnimationFrame(() => {
      const target = expandedByKeyboardRef.current ? tripTypeRef.current : expandedFieldsRef.current;
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [expanded]);

  useEffect(() => { onExpansionChange?.(designVersion === 'v3' ? focusedTool !== null : expanded); }, [expanded, focusedTool, designVersion, onExpansionChange]);

  const revealFromAirport = () => {
    if ((treatment !== 'airport-focus' && treatment !== 'baseline') || expanded) return;
    preserveCurrentFocusRef.current = true;
    setExpanded(true);
  };
  const revealFromControl = (keyboard: boolean) => {
    preserveCurrentFocusRef.current = false;
    expandedByKeyboardRef.current = keyboard;
    setExpanded(true);
  };
  const routeReady = from.trim().length > 0 && to.trim().length > 0;
  const revealCompletedRoute = () => {
    if (treatment !== 'route-ready' || expanded || !routeReady) return;
    preserveCurrentFocusRef.current = true;
    setExpanded(true);
  };

  useEffect(() => {
    if (!calendarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const updateBounds = () => {
      const next = measureCalendarBounds();
      if (next) setCalendarBounds(previous => previous && Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
    };
    updateBounds();
    calendarDialogRef.current?.showModal();
    calendarRef.current?.setEditing(calendarEditingRef.current);
    calendarRef.current?.jumpToDate(calendarEditingRef.current);
    const phone = bookingSectionRef.current?.closest('[data-phone-viewport]');
    const observer = new ResizeObserver(updateBounds);
    if (phone) observer.observe(phone);
    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds, { passive: true });
    window.visualViewport?.addEventListener('resize', updateBounds);
    window.visualViewport?.addEventListener('scroll', updateBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds);
      window.visualViewport?.removeEventListener('resize', updateBounds);
      window.visualViewport?.removeEventListener('scroll', updateBounds);
      document.body.style.overflow = previousOverflow;
    };
  }, [calendarOpen]);

  const openCalendar = (field: 'first' | 'second' = departure && !returnDate && !oneWay ? 'second' : 'first', target: CalendarTarget = 'book') => {
    const bounds = measureCalendarBounds();
    if (!bounds) return;
    setCalendarBounds(bounds);
    setCalendarTarget(target);
    calendarUserActionRef.current = false;
    calendarEditingRef.current = field === 'second' && (target === 'vacations' || target === 'trip' || (target === 'status' && designVersion !== 'v1') || (target === 'book' && !oneWay)) ? 'end' : 'start';
    setCalendarOpen(true);
  };
  const closeCalendar = () => {
    const input = { book: dateInputRef, trip: tripDateInputRef, status: statusDateInputRef, vacations: vacationDateInputRef }[calendarTarget].current;
    const trigger = input?.containerEl?.querySelector<HTMLButtonElement>('[data-testid="date-input-calendar-button"]');
    calendarDialogRef.current?.close();
    setCalendarOpen(false);
    requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  };
  const toIsoDate = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const [month, day, year] = value.split('/');
    return `${year.length === 2 ? `20${year}` : year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const selectTab = (next: Tab) => { setTab(next); setMessage(''); };
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[next]);
    tabRefs.current[next]?.focus();
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (tab === 'Book' && !expanded) {
      revealFromControl(true);
      return;
    }
    if (tab === 'Book') {
      const errors = {
        from: from.trim() ? undefined : 'Enter a departure airport.',
        to: to.trim() ? undefined : 'Enter an arrival airport.',
      };
      setRouteErrors(errors);
      if (errors.from || errors.to) {
        event.currentTarget.querySelector<HTMLInputElement>(`[aria-label="${errors.from ? 'From' : 'To'}"]`)?.focus();
        setMessage('');
        return;
      }
    }
    if (tab === 'Flight status' && !statusDateInputRef.current?.getDateState().isValid) {
      statusDateInputRef.current?.containerEl?.querySelector<HTMLInputElement>('input')?.focus();
      statusDateInputRef.current?.validateAll();
      return;
    }
    if (tab === 'Book' && !dateInputRef.current?.getDateState().isValid) {
      dateInputRef.current?.validateAll();
      event.currentTarget.querySelector<HTMLInputElement>('[data-testid="date-input-first"]')?.focus();
      return;
    }
    setMessage(tab === 'Book'
      ? `Your ${oneWay ? 'one-way' : 'round-trip'} search from ${from} to ${to} for ${passengers} ${passengers === '1' ? 'passenger' : 'passengers'}, paying with ${paymentLabels[payment]}, is ready. This is a design demo; continue on American Airlines for live availability.`
      : 'This is a design demo. Continue on American Airlines to look up live travel information.');
  };

  const bookResult = message && <div className="demo-result" role="status"><p>{message}</p><a href={links.flights}>Continue to aa.com <img src={asset('arrow-blue.svg')} alt="" /></a></div>;
  const changeBookingCategory = (next: BookingCategory) => {
    if (next === 'vacations') setVacationVisited(true);
    setBookingCategory(next); setMessage('');
  };
  const bookContent = <>
        <div className="booking-categories-fixed">
          <div className="booking-categories-body">
            <TravelCategories value={bookingCategory} onChange={changeBookingCategory} />
          </div>
        </div>
        <form className="flight-booking-form" aria-label="Flight search" hidden={bookingCategory !== 'flights'} onSubmit={submitSearch} noValidate>
          <RouteField from={from} to={to} errors={routeErrors} expanded={expanded}
            onChange={(side, value) => {
              if (side === 'from') setFrom(value); else setTo(value);
              setRouteErrors(errors => ({ ...errors, [side]: undefined })); setMessage('');
            }}
            onSwap={() => { setFrom(to); setTo(from); setRouteErrors(errors => ({ from: errors.to, to: errors.from })); setMessage(''); }}
            onAirportFocus={revealFromAirport} onLeave={revealCompletedRoute}
            onToKeyDown={event => {
              if (treatment === 'route-ready' && !expanded && routeReady && event.key === 'Tab' && !event.shiftKey) {
                event.preventDefault(); revealFromControl(true);
              }
            }} />
          <div className="booking-affordance" data-expanded={expanded} aria-hidden={expanded} inert={expanded}>
            <div className="booking-affordance-body">
              {!progressive && <div className="search-options-toggle">
                <Button variant="ghost" size="xs" className="more-options-button" aria-expanded={expanded} aria-controls="search-options"
                  leadingIcon={<Icon icon="navigation:chevron-down" size={16} />}
                  onClick={event => revealFromControl(event.detail === 0)}>Show all search options</Button>
              </div>}
              {treatment === 'airport-focus' && <div className="airport-focus-spacer" aria-hidden="true" />}
              {treatment === 'details-preview' && <button type="button" className="details-preview-button" aria-label="Add dates and passengers" aria-expanded={expanded} aria-controls="search-options" onClick={event => revealFromControl(event.detail === 0)}>
                <span><Icon icon="operation:calendar" size={16} />Add dates</span>
                <span className="details-preview-divider" aria-hidden="true" />
                <span><Icon icon="operation:account" size={16} />1 passenger</span>
                <Icon icon="navigation:chevron-down" size={16} />
              </button>}
              {treatment === 'attached-handle' && <div className="attached-handle-wrap">
                <button type="button" className="attached-handle-button" aria-label="Expand trip details" aria-expanded={expanded} aria-controls="search-options" onClick={event => revealFromControl(event.detail === 0)}>
                  <Icon icon="action:plus" size={16} /><Icon icon="navigation:chevron-down" size={16} />
                </button>
              </div>}
              {treatment === 'route-ready' && <div className="route-ready-hint" aria-hidden="true">Your dates come next</div>}
              {treatment === 'pull-reveal' && <PullToReveal expanded={expanded} onReveal={revealFromControl} />}
            </div>
          </div>
          <BookingReveal expanded={expanded}><div id="search-options" className="search-options" ref={expandedFieldsRef} tabIndex={-1}>
            <div className="booking-select trip-type-field">
              <Icon icon="navigation:arrow-multidirectional" size={24} outlined />
              <Select ref={tripTypeRef} ariaLabel="Trip type" name="trip-type" value={oneWay ? 'one-way' : 'round-trip'}
                onChange={event => { setOneWay(event.target.value === 'one-way'); setMessage(''); }}
                options={[{ label: 'Round trip', value: 'round-trip' }, { label: 'One way', value: 'one-way' }]} />
              <img className="dropdown-chevron" src={asset('dropdown-chevron.svg')} alt="" />
            </div>
            <DateInput ref={dateInputRef} className="date-field booking-date-picker" label={oneWay ? 'Departure date' : 'Travel dates'}
              isRange={!oneWay} includeYear disableTyping firstInputPlaceholder="Depart" secondInputPlaceholder="Return"
              firstInputValue={departure ?? ''} secondInputValue={returnDate ?? ''} calendarOpen={calendarOpen && calendarTarget === 'book'}
              onCalendarIconClick={() => openCalendar()}
              onInputClick={field => openCalendar(field)}
              onKeyDown={event => { if (event.key === 'Enter') {
                event.preventDefault();
                openCalendar(event.currentTarget.dataset.testid === 'date-input-second' ? 'second' : 'first');
              } }}
              onChange={event => {
                if (event.field === 'first') setDeparture(event.isValid ? toIsoDate(event.value) : null);
                else setReturnDate(event.isValid ? toIsoDate(event.value) : null);
                setMessage('');
              }} />
            <div className="booking-select passengers-field">
              <Icon icon="operation:account" size={24} />
              <Select ariaLabel="Passengers" name="passengers" value={passengers}
                onChange={event => { setPassengers(event.target.value); setMessage(''); }}
                options={[1, 2, 3, 4, 5, 6].map(n => ({ value: String(n), label: `${n} ${n === 1 ? 'passenger' : 'passengers'}` }))} />
              <img className="dropdown-chevron" src={asset('dropdown-chevron.svg')} alt="" />
            </div>
            <PaymentSwitcher value={payment} onChange={value => { setPayment(value); setMessage(''); }} />
            <Accordion className="advanced-search" iconPosition="right" borderTop={false} borderBottom={false}>
              <AccordionItem itemId="advanced-search" label="Advanced search" headingLevel={3}>
                <div className="advanced-search-fields">
                  <div className="booking-select cabin-field">
                    <Icon icon="airport:seat" size={24} />
                    <Select ariaLabel="Cabin" name="cabin" value={cabin} onChange={event => { setCabin(event.target.value); setMessage(''); }}
                      options={[{ value: 'any', label: 'Any cabin' }, { value: 'main', label: 'Main Cabin' }, { value: 'premium', label: 'Premium Economy' }, { value: 'business', label: 'Business / First' }]} />
                    <img className="dropdown-chevron" src={asset('dropdown-chevron.svg')} alt="" />
                  </div>
                  <Checkbox name="nonstop">Nonstop flights only</Checkbox>
                  <Checkbox name="nearby-airports">Include nearby airports</Checkbox>
                  <Checkbox name="flexible-dates">My dates are flexible</Checkbox>
                </div>
              </AccordionItem>
            </Accordion>
            {designVersion === 'v3' && bookResult}
            <Button className="search-flights-button" type="submit" size="fullwidth">Search flights</Button>
            {designVersion === 'v4' && <Button className="v4-show-less" variant="ghost" size="sm"
              leadingIcon={<Icon icon="navigation:chevron-up" size={16} />} aria-expanded={expanded} aria-controls="search-options"
              onClick={() => {
                setExpanded(false);
                requestAnimationFrame(() => {
                  const trigger = bookingSectionRef.current?.querySelector<HTMLButtonElement>('.more-options-button .button');
                  trigger?.focus({ preventScroll: true });
                  if (trigger && trigger.getBoundingClientRect().top < 16) trigger.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
                });
              }}>Show less</Button>}
          </div></BookingReveal>
          {designVersion !== 'v3' && bookResult}
        </form>
        {vacationVisited && <VacationSearch hidden={bookingCategory !== 'vacations'} draft={vacationDraft}
          onChange={patch => setVacationDraft(previous => ({ ...previous, ...patch }))} dateInputRef={vacationDateInputRef}
          calendarOpen={calendarOpen && calendarTarget === 'vacations'} onOpenCalendar={field => openCalendar(field ?? 'first', 'vacations')} />}
      </>;
  const lookupContent = (lookupTab: Exclude<Tab, 'Book'>) => <form className="lookup-form" onSubmit={submitSearch}>
        {lookupTab === 'Your trips / Check-in' ? <>
          <TextField key="last-name" label="Last name" name="last-name" autoComplete="family-name" required
            requiredMessage="Enter the last name on the reservation." onValueChange={() => setMessage('')} />
          <TextField key="confirmation" label="Confirmation code" name="confirmation" maxLength={6} autoCapitalize="characters" spellCheck={false} required
            requiredMessage="Enter your 6-character confirmation code." onValueChange={() => setMessage('')} />
        </> : <>
          <TextField key="flight" label="Flight number" name="flight" inputMode="numeric" required
            requiredMessage="Enter a flight number." onValueChange={() => setMessage('')} />
          <DateInput ref={statusDateInputRef} className="date-field status-date-picker" label="Flight date" includeYear disableTyping
            enablePastSelection firstInputPlaceholder="Flight date" firstInputValue={statusDate ?? ''}
            calendarOpen={calendarOpen && calendarTarget === 'status'}
            onCalendarIconClick={() => openCalendar('first', 'status')} onInputClick={() => openCalendar('first', 'status')}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); openCalendar('first', 'status'); } }}
            onChange={event => { setStatusDate(event.isValid ? toIsoDate(event.value) : null); setMessage(''); }} />
        </>}
        <Button type="submit" size="fullwidth">{lookupTab === 'Flight status' ? 'Find flight' : 'Find your trip'}</Button>
        {message && <div className="demo-result" role="status"><p>{message}</p><a href={lookupTab === 'Flight status' ? links.status : links.trips}>Continue to aa.com <img src={asset('arrow-blue.svg')} alt="" /></a></div>}
      </form>;

  const announcement = progressive && <span className="visually-hidden" role="status">{expanded ? 'Additional search fields are available below the airports.' : ''}</span>;
  const calendarDialog = <dialog className="booking-calendar-dialog" style={calendarBounds ?? undefined} ref={calendarDialogRef} aria-label="Choose travel dates"
    onPointerDownCapture={() => { calendarUserActionRef.current = true; }}
    onKeyDownCapture={() => { calendarUserActionRef.current = true; }}
    onCancel={event => { event.preventDefault(); closeCalendar(); }}>
    <div className="calendar-mobile-status-bar"><StatusBar /></div>
    <div className="calendar-dialog-heading"><h2>Choose travel dates</h2>
      <button type="button" className="menu-button" aria-label="Close calendar" onClick={closeCalendar}><Icon icon="action:close" size={24} /></button>
    </div>
    {calendarOpen && <Calendar ref={calendarRef} range={calendarTarget === 'vacations' || calendarTarget === 'trip' || (calendarTarget === 'status' && designVersion !== 'v1') || (calendarTarget === 'book' && !oneWay)}
      startDate={calendarTarget === 'vacations' ? vacationDraft.depart : calendarTarget === 'trip' ? tripStartDate : calendarTarget === 'status' ? designVersion !== 'v1' ? activeStatusDates.start : statusDate : departure}
      endDate={calendarTarget === 'vacations' ? vacationDraft.return : calendarTarget === 'trip' ? tripEndDate : calendarTarget === 'status' && designVersion !== 'v1' ? activeStatusDates.end : calendarTarget === 'book' && !oneWay ? returnDate : null}
      enablePastSelection={calendarTarget !== 'book' && calendarTarget !== 'vacations'}
      startDateName={calendarTarget === 'trip' ? 'Start date' : calendarTarget === 'status' && designVersion === 'v1' ? 'Flight date' : 'Depart'}
      endDateName={calendarTarget === 'trip' ? 'End date' : 'Return'} onClose={closeCalendar}
      onDateSelected={dates => {
        // ADS emits controlled-prop synchronization during mounting. Only apply
        // user selections, otherwise populated ranges can echo stale values.
        if (!calendarUserActionRef.current) return;
        if (calendarTarget === 'vacations') {
          setVacationDraft(previous => ({ ...previous, depart: dates.startDate, return: dates.endDate }));
          if (!dates.startDate && !dates.endDate) vacationDateInputRef.current?.resetInputs();
          else vacationDateInputRef.current?.setCalendarValues(dates.startDate ?? '', dates.endDate ?? '');
        } else if (calendarTarget === 'status') {
          if (designVersion !== 'v1') {
            setStatusDates(previous => ({ ...previous, [statusMode]: { start: dates.startDate, end: dates.endDate } }));
            if (!dates.startDate && !dates.endDate) statusDateInputRef.current?.resetInputs();
            else statusDateInputRef.current?.setCalendarValues(dates.startDate ?? '', dates.endDate ?? '');
          } else {
            setStatusDate(dates.startDate);
            if (!dates.startDate) statusDateInputRef.current?.resetInputs();
            else statusDateInputRef.current?.setCalendarValues(dates.startDate);
          }
        } else if (calendarTarget === 'trip') {
          setTripStartDate(dates.startDate); setTripEndDate(dates.endDate);
          if (!dates.startDate && !dates.endDate) tripDateInputRef.current?.resetInputs();
          else tripDateInputRef.current?.setCalendarValues(dates.startDate ?? '', dates.endDate ?? '');
        } else {
          setDeparture(dates.startDate); setReturnDate(dates.endDate);
          if (!dates.startDate && !dates.endDate) dateInputRef.current?.resetInputs();
          else dateInputRef.current?.setCalendarValues(dates.startDate ?? '', dates.endDate ?? '');
        }
        setMessage('');
      }} />}
  </dialog>;
  const sectionClassName = `booking-section booking-section-animated${expanded ? ' booking-section-expanded' : ''}${progressive ? ' booking-section-progressive' : ''}${designVersion === 'v2' ? ' booking-section-v2' : ''}`;

  if (designVersion === 'v4') return <section ref={bookingSectionRef} className={`${sectionClassName} booking-section-v4`} aria-label="Plan and manage your travel">
    <ExclusiveTravelTools onActiveChange={id => {
      setCardOpen(id !== null);
      if (id) selectTab(bookingCards.find(card => card.id === id)!.tab);
      if (id !== 'book') setExpanded(false);
    }} items={bookingCards.map(card => ({
      id: card.id, label: card.label, icon: card.icon,
      content: card.tab === 'Book' ? bookContent : card.tab === 'Your trips / Check-in'
        ? <TripLookup persistentSearch dateInputRef={tripDateInputRef} startDate={tripStartDate} endDate={tripEndDate}
            calendarOpen={calendarOpen && calendarTarget === 'trip'} onOpenCalendar={field => openCalendar(field ?? 'first', 'trip')}
            onDateChange={(field, value) => { if (field === 'first') setTripStartDate(value); else setTripEndDate(value); }} />
        : <FlightStatus persistentSearch mode={statusMode} onModeChange={setStatusMode} dates={activeStatusDates} dateInputRef={statusDateInputRef}
            calendarOpen={calendarOpen && calendarTarget === 'status'} onOpenCalendar={field => openCalendar(field ?? 'first', 'status')}
            onDateChange={(field, value) => setStatusDates(previous => ({
              ...previous, [statusMode]: { ...previous[statusMode], [field === 'first' ? 'start' : 'end']: value },
            }))} />,
    }))} />
    {calendarDialog}
  </section>;

  if (designVersion === 'v3') {
    const openTool = (next: Tab, trigger: HTMLElement, airport: 'From' | 'To' | null = null) => {
      focusedReturnRef.current = airport ? homeHeadingRef.current : trigger;
      setInitialAirport(airport); selectTab(next); setExpanded(true); setFocusedTool(next);
    };
    const closeTool = () => {
      setFocusedTool(null);
      requestAnimationFrame(() => focusedReturnRef.current?.focus({ preventScroll: true }));
    };
    return <section ref={bookingSectionRef} className="booking-section booking-section-v3" aria-label="Plan and manage your travel">
      <div className="v3-compact-booking" inert={focusedTool !== null} aria-hidden={focusedTool !== null ? true : undefined}>
        <h2 ref={homeHeadingRef} tabIndex={-1}>Where can we take you today?</h2>
        <TravelCategories value={bookingCategory} onChange={(next, trigger) => {
          changeBookingCategory(next);
          if (next === 'vacations') openTool('Book', trigger);
        }} />
        <RouteField from={bookingCategory === 'flights' ? from : vacationDraft.from} to={bookingCategory === 'flights' ? to : vacationDraft.to}
          errors={{}} expanded={false} idPrefix="compact-route" disclosureControls={null}
          onChange={(side, value) => {
            if (bookingCategory === 'vacations') setVacationDraft(previous => ({ ...previous, [side]: value }));
            else if (side === 'from') setFrom(value); else setTo(value);
          }}
          onSwap={() => {
            if (bookingCategory === 'vacations') setVacationDraft(previous => ({ ...previous, from: previous.to, to: previous.from }));
            else { setFrom(to); setTo(from); }
          }}
          onAirportFocus={event => openTool('Book', event.currentTarget, event.currentTarget.getAttribute('aria-label') as 'From' | 'To')} />
      </div>
      <div className="v3-tool-shortcuts" aria-label="Manage your travel" inert={focusedTool !== null} aria-hidden={focusedTool !== null ? true : undefined}>
        <Button variant="secondary" size="sm" leadingIcon={<Icon icon="airport:boarding-pass" size={16} />}
          onClick={event => openTool('Your trips / Check-in', event.currentTarget)}>Trips &amp; check-in</Button>
        <Button variant="secondary" size="sm" leadingIcon={<Icon icon="airport:boarding-pass" size={16} />}
          onClick={event => openTool('Flight status', event.currentTarget)}>Flight status</Button>
      </div>
      <FocusedSearchDialog open={focusedTool !== null} title={focusedTool === 'Book' ? 'Where can we take you today?' : focusedTool === 'Flight status' ? 'Flight status' : 'Trips & check-in'}
        initialAirport={initialAirport} onClose={closeTool}>
        <div className="v3-search-panel v3-book-panel" hidden={focusedTool !== 'Book'} inert={focusedTool !== 'Book'}>{bookContent}</div>
        <div className="v3-search-panel v3-trip-panel" hidden={focusedTool !== 'Your trips / Check-in'} inert={focusedTool !== 'Your trips / Check-in'}>
          <TripLookup persistentSearch dateInputRef={tripDateInputRef} startDate={tripStartDate} endDate={tripEndDate}
            calendarOpen={calendarOpen && calendarTarget === 'trip'} onOpenCalendar={field => openCalendar(field ?? 'first', 'trip')}
            onDateChange={(field, value) => { if (field === 'first') setTripStartDate(value); else setTripEndDate(value); }} />
        </div>
        <div className="v3-search-panel v3-status-panel" hidden={focusedTool !== 'Flight status'} inert={focusedTool !== 'Flight status'}>
          <FlightStatus persistentSearch mode={statusMode} onModeChange={setStatusMode} dates={activeStatusDates} dateInputRef={statusDateInputRef}
            calendarOpen={calendarOpen && calendarTarget === 'status'} onOpenCalendar={field => openCalendar(field ?? 'first', 'status')}
            onDateChange={(field, value) => setStatusDates(previous => ({
              ...previous, [statusMode]: { ...previous[statusMode], [field === 'first' ? 'start' : 'end']: value },
            }))} />
        </div>
      </FocusedSearchDialog>
      {calendarDialog}
    </section>;
  }

  if (designVersion === 'v2') return <section ref={bookingSectionRef} className={sectionClassName} data-treatment={treatment} aria-label="Plan and manage your travel">
    <Accordion className="booking-tool-cards" iconPosition="right" borderTop={false} borderBottom={false}
      openItems={cardOpen ? [`tool-${bookingCards.find(card => card.tab === tab)!.id}`] : []}
      onOpenChange={ids => {
        const next = bookingCards.find(card => `tool-${card.id}` === ids[0]);
        setCardOpen(Boolean(next));
        if (next) selectTab(next.tab);
      }}>
      {bookingCards.map(card => <AccordionItem key={card.id} itemId={`tool-${card.id}`} label={<span className="booking-tool-card-label">
        <Icon icon={card.icon} size={24} /><span>{card.label}</span>
      </span>} headingLevel={2} className={`booking-tool-card booking-tool-card-${card.id}`}>
        <div className="booking-tool-card-body" inert={!(cardOpen && tab === card.tab)}>
          {card.tab === 'Book' ? bookContent : card.tab === 'Your trips / Check-in'
            ? <TripLookup dateInputRef={tripDateInputRef} startDate={tripStartDate} endDate={tripEndDate}
                calendarOpen={calendarOpen && calendarTarget === 'trip'} onOpenCalendar={field => openCalendar(field ?? 'first', 'trip')}
                onDateChange={(field, value) => { if (field === 'first') setTripStartDate(value); else setTripEndDate(value); }} />
            : <FlightStatus mode={statusMode} onModeChange={setStatusMode} dates={activeStatusDates} dateInputRef={statusDateInputRef}
                calendarOpen={calendarOpen && calendarTarget === 'status'} onOpenCalendar={field => openCalendar(field ?? 'first', 'status')}
                onDateChange={(field, value) => setStatusDates(previous => ({
                  ...previous, [statusMode]: { ...previous[statusMode], [field === 'first' ? 'start' : 'end']: value },
                }))} />}
        </div>
      </AccordionItem>)}
    </Accordion>
    {announcement}
    {calendarDialog}
  </section>;

  return <section ref={bookingSectionRef} className={sectionClassName} data-treatment={treatment} aria-label="Plan and manage your travel">
    <div className="booking-tabs" role="tablist" aria-label="Travel tools">
      {tabs.map((item, index) => <button key={item} role="tab" id={`travel-tab-${index}`}
        aria-selected={tab === item} aria-controls={`travel-panel-${index}`} tabIndex={tab === item ? 0 : -1}
        ref={element => { tabRefs.current[index] = element; }}
        onKeyDown={event => onTabKeyDown(event, index)} onClick={() => selectTab(item)}>{item}</button>)}
    </div>
    <div role="tabpanel" id={`travel-panel-${tabs.indexOf(tab)}`} aria-labelledby={`travel-tab-${tabs.indexOf(tab)}`}>
      {tab === 'Book' ? bookContent : lookupContent(tab)}
    </div>
    {announcement}
    {calendarDialog}
  </section>;
}

function TravelAlerts() {
  const [open, setOpen] = useState(false);
  return <section className="travel-alerts" aria-label="Travel alerts">
    <Button className="alerts-button" variant="ghost" size="sm" aria-expanded={open} aria-controls="travel-alert-details"
      leadingIcon={<Icon icon="signal:warning" size={24} />}
      trailingIcon={<Icon icon={open ? 'navigation:chevron-down' : 'navigation:chevron-right'} size={24} />}
      onClick={() => setOpen(!open)}>Travel alerts</Button>
    {open && <div id="travel-alert-details" className="alert-details">
      <p>Check the latest travel advisories and flexible travel options before your trip.</p>
      <a href={links.alerts}>View current travel alerts <img src={asset('arrow-blue.svg')} alt="" /></a>
    </div>}
  </section>;
}

function PromotionalCarousel() {
  const [slide, setSlide] = useState(0);
  return <section className="promotional-carousel" aria-label="Featured offers" aria-roledescription="carousel">
    <div className="promotion" role="group" aria-roledescription="slide" aria-label={`${slide + 1} of 2`}>
      <img className="promotion-image" src={asset(slide === 0 ? 'credit-card-offer.png' : 'flight-deals.png')}
        alt={slide === 0 ? 'American Airlines aircraft and AAdvantage credit card at sunset' : 'A scenic destination at sunset'} />
      <div className="promotion-gradient" />
      {slide === 0 && <span className="limited-offer">LIMITED-TIME OFFER</span>}
      <div className="promotion-content" aria-live="polite">
        <h2>{slide === 0 ? 'Earn up to 90,000 bonus miles' : 'A little getaway. A lot to discover.'}</h2>
        <p>{slide === 0 ? 'Find the Citi® / AAdvantage® card that is right for you.' : 'Find great fares for your next adventure.'}</p>
        <a href={slide === 0 ? links.cards : links.offers} target="_blank" rel="noreferrer">
          {slide === 0 ? 'Explore cards' : 'Explore flight deals'}<img src={asset('arrow-white.svg')} alt="(opens in a new tab)" />
        </a>
      </div>
    </div>
    <div className="carousel-pagination">
      {[0, 1].map(index => <button key={index} aria-label={`Show offer ${index + 1}`} aria-pressed={slide === index}
        className={slide === index ? 'active' : ''} onClick={() => setSlide(index)}><span /></button>)}
    </div>
  </section>;
}

function TodaysOffers() {
  return <section className="todays-offers" aria-labelledby="offers-title">
    <div className="section-heading"><h2 id="offers-title">Today’s offers</h2>
      <a href={links.offers}>View all<img src={asset('arrow-blue.svg')} alt="" /></a>
    </div>
    <a className="offer-card" href={links.offers}>
      <img className="offer-image" src={asset('flight-deals.png')} alt="Scenic coastal getaway beneath a colorful sunset" />
      <div className="offer-content"><h3>A little getaway. A lot to discover.</h3>
        <p>Find great fares for your next adventure.</p>
        <span className="offer-link">Explore flight deals<img src={asset('arrow-blue.svg')} alt="" /></span>
      </div>
    </a>
  </section>;
}

const news = [
  { title: 'Have a travel credit? Here’s how to book', href: 'https://www.aa.com/i18n/customer-service/payment-options/travel-credit.jsp' },
  { title: 'Earn 500 bonus miles on car rentals', href: 'https://www.aa.com/i18n/aadvantage-program/miles/partners/cars.jsp' },
  { title: 'Support Red Cross relief efforts', href: 'https://www.aa.com/i18n/customer-service/about-us/american-airlines-giving.jsp' },
  { title: 'See all news and offers', href: links.offers },
];

function NewsAndOffers() {
  return <section className="news-and-offers" aria-labelledby="news-title">
    <h2 id="news-title">News and offers</h2>
    <p>Unlock more with American — exclusive deals, exciting offers, and endless ways to explore await.</p>
    <div className="news-links">{news.map(item => <a href={item.href} key={item.title}>
      {item.title}<img src={asset('news-arrow.svg')} alt="" />
    </a>)}</div>
  </section>;
}

function Footer() {
  return <footer className="page-footer">
    <div className="footer-top"><div className="footer-links">
      <a href="https://www.aa.com/i18n/customer-service/support/legal-privacy-copyright.jsp">Legal, privacy, copyright</a>
      <span aria-hidden="true">•</span><a href="https://www.aa.com/">Full site</a>
    </div><img src={asset('oneworld.png')} width="32" height="32" alt="oneworld alliance" /></div>
    <p>© 2026 American Airlines. Design exploration.</p>
  </footer>;
}

export default function App({ expansionTreatment = getBookingTreatment(), designVersion = getBookingDesignVersion(), bookingResetKey = 0, onBookingExpansionChange }: {
  expansionTreatment?: BookingTreatment;
  designVersion?: BookingDesignVersion;
  bookingResetKey?: number;
  onBookingExpansionChange?: (expanded: boolean) => void;
} = {}) {
  return <div className="mobile-homepage" data-phone-viewport data-design-version={designVersion}>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <StatusBar />
    <Header designVersion={designVersion} />
    <main id="main-content">
      <h1 className="visually-hidden">American Airlines — plan your next trip</h1>
      <div className={`booking-layout-${designVersion}`}>
        <BookingWidget key={`${designVersion}-${expansionTreatment}-${bookingResetKey}`} designVersion={designVersion} treatment={expansionTreatment} onExpansionChange={onBookingExpansionChange} />
        <TravelAlerts />
      </div>
      <PromotionalCarousel />
      <TodaysOffers />
      <NewsAndOffers />
    </main>
    <Footer />
  </div>;
}
