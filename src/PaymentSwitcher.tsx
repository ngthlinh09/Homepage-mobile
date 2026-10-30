import { useEffect, useRef, type CSSProperties } from 'react';
import { ContentSwitcher } from '@aileron/react-components';

const options = [
  { value: 'cash', label: 'Cash' },
  { value: 'cash-miles', label: 'Cash + miles' },
  { value: 'miles', label: 'Miles' },
];

export default function PaymentSwitcher({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const index = Math.max(0, options.findIndex(option => option.value === value));
  const indicator = useRef<HTMLSpanElement>(null);
  const previous = useRef(index);

  useEffect(() => {
    const distance = Math.abs(index - previous.current);
    previous.current = index;
    if (!distance || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Stretch in the direction of travel, then settle, while `translate` carries the overshoot.
    indicator.current?.animate([
      { scale: '1 1' },
      { scale: `${1 + 0.14 * distance} 0.92`, offset: 0.35 },
      { scale: '0.97 1.03', offset: 0.7 },
      { scale: '1 1' },
    ], { duration: 520, easing: 'ease-out' });
  }, [index]);

  return <div className="payment-switcher" style={{ '--payment-index': index, '--payment-count': options.length } as CSSProperties}>
    <span ref={indicator} className="payment-switcher-indicator" aria-hidden="true" />
    <ContentSwitcher variant="segmented-control" label="Pay with" value={value} onChange={next => onChange(next)}
      items={options.map(option => ({ value: option.value, label: <span className="payment-switcher-label" data-text={option.label}>{option.label}</span> }))} />
  </div>;
}
