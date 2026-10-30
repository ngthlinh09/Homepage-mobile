import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';

const OPEN_DISTANCE = 64;
const MAX_DISTANCE = 96;

export default function PullToReveal({ expanded, onReveal }: { expanded: boolean; onReveal: (keyboard: boolean) => void }) {
  const [distance, setDistance] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ pointerId: number; startX: number; startY: number; distance: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (expanded || !event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    gesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, distance: 0, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const delta = event.clientY - current.startY;
    const sideways = event.clientX - current.startX;
    current.moved ||= Math.hypot(sideways, delta) > 6;
    current.distance = Math.abs(sideways) > Math.abs(delta) ? 0 : Math.max(0, Math.min(MAX_DISTANCE, delta));
    setDistance(current.distance);
    if (current.moved) event.preventDefault();
  };
  const finish = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    gesture.current = null;
    suppressClick.current = current.moved || cancelled;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    setDistance(0);
    if (!cancelled && current.distance >= OPEN_DISTANCE) onReveal(false);
  };

  return <div className="pull-reveal-surface" data-dragging={dragging} data-ready={distance >= OPEN_DISTANCE}
    style={{ '--pull-distance': `${distance}px` } as CSSProperties}>
    <button type="button" className="pull-reveal-grabber" aria-label="Reveal trip details"
      aria-expanded={expanded} aria-controls="search-options" title="Drag down or tap to open trip details"
      onPointerDown={start} onPointerMove={move} onPointerUp={event => finish(event)}
      onPointerCancel={event => finish(event, true)} onLostPointerCapture={event => finish(event, true)}
      onClick={event => {
        if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return; }
        onReveal(event.detail === 0);
      }}>
      <span className="pull-reveal-bar" aria-hidden="true" />
      <span aria-hidden="true">{distance >= OPEN_DISTANCE ? 'Release to open' : dragging ? 'Keep pulling' : 'Pull for trip details'}</span>
    </button>
  </div>;
}
