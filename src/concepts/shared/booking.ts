import { useEffect, useState } from 'react';
import { findAirport, type Airport } from './data';
import { track } from './analytics';

export type AirportValue = { query: string; airport: Airport | null };
export type TripType = 'round' | 'oneway';
export type Draft = {
  from: AirportValue;
  to: AirportValue;
  trip: TripType;
  depart: string | null;
  ret: string | null;
  travelers: number;
};
export type DraftErrors = Partial<Record<'from' | 'to' | 'dates', string>>;

const emptyAirport: AirportValue = { query: '', airport: null };

export function airportValue(code: string, format: (airport: Airport) => string = airport => airport.code): AirportValue {
  const airport = findAirport(code);
  return { query: airport ? format(airport) : '', airport };
}

export function useBookingDraft(storageKey: string, initial: Partial<Draft> = {}) {
  const [draft, setDraft] = useState<Draft>(() => {
    const base: Draft = { from: emptyAirport, to: emptyAirport, trip: 'round', depart: null, ret: null, travelers: 1, ...initial };
    try {
      const saved = sessionStorage.getItem(storageKey);
      return saved ? { ...base, ...JSON.parse(saved) } : base;
    } catch { return base; }
  });
  const [errors, setErrors] = useState<DraftErrors>({});

  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(draft)); } catch { /* storage unavailable */ }
  }, [draft, storageKey]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return;
      const started = Boolean(draft.from.query || draft.to.query);
      if (started) track('booking_abandon', { hasOrigin: Boolean(draft.from.airport), hasDestination: Boolean(draft.to.airport), hasDates: Boolean(draft.depart) });
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [draft]);

  const update = (patch: Partial<Draft>) => {
    setDraft(current => ({ ...current, ...patch }));
    setErrors(current => {
      const next = { ...current };
      if ('from' in patch) delete next.from;
      if ('to' in patch) delete next.to;
      if ('depart' in patch || 'ret' in patch || 'trip' in patch) delete next.dates;
      return next;
    });
  };

  const swap = () => update({ from: draft.to, to: draft.from });

  const validate = (options: { requireDates?: boolean } = {}) => {
    const next: DraftErrors = {};
    if (!draft.from.airport) next.from = draft.from.query ? `Choose an airport from the list for “${draft.from.query}”.` : 'Enter where you’re flying from.';
    if (!draft.to.airport) next.to = draft.to.query ? `Choose an airport from the list for “${draft.to.query}”.` : 'Enter where you’re flying to.';
    if (draft.from.airport && draft.to.airport && draft.from.airport.code === draft.to.airport.code) next.to = 'Choose a destination that’s different from your departure airport.';
    if (options.requireDates !== false) {
      if (!draft.depart) next.dates = 'Choose your travel dates.';
      else if (draft.trip === 'round' && !draft.ret) next.dates = 'Choose a return date, or switch to one way.';
    }
    setErrors(next);
    if (Object.keys(next).length) track('search_validation_error', { fields: Object.keys(next) });
    return next;
  };

  return { draft, update, swap, errors, setErrors, validate };
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
export function formatDate(iso: string | null) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  return dateFormatter.format(new Date(year, month - 1, day));
}

export function formatDates(draft: Draft) {
  if (!draft.depart) return '';
  if (draft.trip === 'oneway') return formatDate(draft.depart);
  if (!draft.ret) return `${formatDate(draft.depart)} – return?`;
  const sameMonth = draft.depart.slice(0, 7) === draft.ret.slice(0, 7);
  return sameMonth ? `${formatDate(draft.depart)} – ${Number(draft.ret.slice(8))}` : `${formatDate(draft.depart)} – ${formatDate(draft.ret)}`;
}

export function searchSummary(draft: Draft) {
  const travelers = `${draft.travelers} ${draft.travelers === 1 ? 'traveler' : 'travelers'}`;
  return `${draft.from.airport?.code} to ${draft.to.airport?.code}, ${formatDates(draft)}, ${draft.trip === 'round' ? 'round trip' : 'one way'}, ${travelers}`;
}
