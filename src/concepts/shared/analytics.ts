import { useEffect, useRef, type RefObject } from 'react';

export type AnalyticsEvent = {
  event: string;
  variant: string;
  viewport: { width: number; height: number };
  timestamp: number;
  [key: string]: unknown;
};

declare global {
  interface Window { dataLayer?: AnalyticsEvent[] }
}

let currentVariant = 'unassigned';
const onceKeys = new Set<string>();

export function setVariant(variant: string) {
  currentVariant = variant;
}

/** FR-7: every event carries the experiment variant and viewport. Mirrors to the concept review page when framed. */
export function track(event: string, props: Record<string, unknown> = {}) {
  const payload: AnalyticsEvent = {
    event,
    variant: currentVariant,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    timestamp: Date.now(),
    ...props,
  };
  (window.dataLayer ??= []).push(payload);
  if (window.parent !== window) window.parent.postMessage({ type: 'aa-analytics', payload }, window.location.origin);
}

export function trackOnce(key: string, event: string, props: Record<string, unknown> = {}) {
  if (onceKeys.has(key)) return;
  onceKeys.add(key);
  track(event, props);
}

/** Fires one qualified impression when at least half of the element is visible. */
export function useImpression(ref: RefObject<HTMLElement | null>, event: string, props: Record<string, unknown> = {}) {
  const propsRef = useRef(props);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.intersectionRatio >= 0.5)) {
        const rect = element.getBoundingClientRect();
        trackOnce(`${currentVariant}:${event}`, event, { ...propsRef.current, aboveFold: rect.top < window.innerHeight && window.scrollY === 0 });
        observer.disconnect();
      }
    }, { threshold: [0.5] });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, event]);
}
