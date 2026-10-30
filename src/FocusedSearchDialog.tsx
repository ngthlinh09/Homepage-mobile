import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@aileron/react-components';

type Bounds = { left: number; top: number; width: number; height: number };
type FocusedSearchDialogProps = {
  open: boolean;
  title: string;
  initialAirport: 'From' | 'To' | null;
  onClose: () => void;
  children: ReactNode;
};

export default function FocusedSearchDialog({ open, title, initialAirport, onClose, children }: FocusedSearchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [bounds, setBounds] = useState<Bounds>();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const phone = dialog.closest<HTMLElement>('[data-phone-viewport]')!;
    const updateBounds = () => {
      const rect = phone.getBoundingClientRect();
      const header = phone.querySelector('.airline-header')!.getBoundingClientRect();
      const viewportTop = window.visualViewport?.offsetTop ?? 0;
      const viewportBottom = Math.min(window.innerHeight, viewportTop + (window.visualViewport?.height ?? window.innerHeight));
      const top = Math.max(viewportTop, Math.min(header.bottom, viewportBottom - 1));
      const left = Math.max(0, rect.left);
      setBounds({ left, top, width: Math.max(1, Math.min(rect.right, window.innerWidth) - left), height: Math.max(1, viewportBottom - top) });
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    updateBounds();
    dialog.showModal();
    const target = initialAirport
      ? dialog.querySelector<HTMLInputElement>(`.v3-book-panel form:not([hidden]) [aria-label="${initialAirport}"]`)
      : dialog.querySelector<HTMLElement>('#focused-search-title');
    target?.focus({ preventScroll: true });
    const observer = new ResizeObserver(updateBounds);
    observer.observe(phone);
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
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return <dialog ref={dialogRef} className="v3-search-dialog" style={bounds} aria-labelledby="focused-search-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="v3-search-heading">
      <h2 id="focused-search-title" tabIndex={-1}>{title}</h2>
      <button className="v3-close-search" type="button" aria-label="Close search" onClick={onClose}>
        <span className="v3-close-glyph"><Icon icon="action:close" size={16} /></span>
      </button>
    </div>
    {children}
  </dialog>;
}
