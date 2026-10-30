import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Accordion, AccordionItem, Icon } from '@aileron/react-components';

type TravelTool = { id: string; label: string; icon: string; content: ReactNode };
type ExclusiveTravelToolsProps = {
  items: TravelTool[];
  onActiveChange: (id: string | null) => void;
};

export default function ExclusiveTravelTools({ items, onActiveChange }: ExclusiveTravelToolsProps) {
  const [active, setActive] = useState<string | null>('book');
  const [pending, setPending] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>('book');
  const pendingRef = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const requestRef = useRef(0);

  useEffect(() => () => {
    requestRef.current += 1;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, []);

  const changeSection = (ids: string[]) => {
    const next = ids[0] ?? null;
    const current = activeRef.current;
    const wasClosing = pendingRef.current !== null;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const request = ++requestRef.current;
    const panels = () => [...(rootRef.current?.querySelectorAll<HTMLElement>('.v4-travel-tools > .v4-tool-section > .aileron-accordion-item__content-wrapper') ?? [])];
    const alreadyAnimating = panels().some(panel => panel.getAnimations().some(animation => animation.playState === 'running'));
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    pendingRef.current = null;
    setPending(null);

    const commit = () => {
      pendingRef.current = null;
      activeRef.current = next;
      setPending(null); setActive(next); onActiveChange(next);
      setAnnouncement(next ? `${items.find(item => item.id === next)!.label} opened. All other travel sections are closed.` : 'All travel sections are closed.');
      if (next) frameRef.current = requestAnimationFrame(() => {
        const trigger = rootRef.current?.querySelector<HTMLButtonElement>(`#v4-${next}-trigger`);
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        if (rect.top < 16 || rect.bottom > window.innerHeight) {
          window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - 16), behavior: reduceMotion ? 'instant' : 'smooth' });
        }
      });
    };

    if (next && (current || wasClosing || alreadyAnimating) && !reduceMotion) {
      activeRef.current = null; pendingRef.current = next;
      setActive(null); setPending(next);
      setAnnouncement(`${current ? items.find(item => item.id === current)!.label : 'Previous section'} closing. ${items.find(item => item.id === next)!.label} will open next.`);
      // Wait for the actual closing animation, not a timer that can run before
      // the browser's first painted frame. Superseded requests cannot reopen.
      frameRef.current = requestAnimationFrame(() => {
        const animations = panels().flatMap(panel => {
          panel.getBoundingClientRect();
          return panel.getAnimations();
        });
        void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
          if (requestRef.current === request) commit();
        });
      });
    } else commit();
  };

  return <div ref={rootRef} className="v4-tools-root" data-switching={pending !== null}>
    <Accordion className="v4-travel-tools" multi={false} iconPosition="right" borderTop={false} borderBottom={false}
      openItems={active ? [`v4-${active}`] : []} onOpenChange={ids => changeSection(ids.map(id => id.replace(/^v4-/, '')))}>
      {items.map(item => <AccordionItem key={item.id} itemId={`v4-${item.id}`} headingLevel={2}
        className={`v4-tool-section v4-tool-${item.id}`} data-pending={pending === item.id}
        label={<span className="booking-tool-card-label"><Icon icon={item.icon} size={24} /><span>{item.label}</span></span>}>
        <div className="v4-tool-body" inert={active !== item.id}>{item.content}</div>
      </AccordionItem>)}
    </Accordion>
    <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </div>;
}
