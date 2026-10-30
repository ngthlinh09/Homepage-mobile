import { useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { Button } from '@aileron/react-components';

type Mode = { id: string; label: string };
type LookupModeSwitcherProps<T extends string> = {
  id: string;
  label: string;
  modes: readonly (Mode & { id: T })[];
  value: T;
  onChange: (value: T) => void;
};

export default function LookupModeSwitcher<T extends string>({ id, label, modes, value, onChange }: LookupModeSwitcherProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % modes.length;
    else if (event.key === 'ArrowLeft') next = (index + modes.length - 1) % modes.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = modes.length - 1;
    else return;
    event.preventDefault();
    onChange(modes[next].id);
    buttons.current[next]?.focus();
  };

  return <div className="trip-mode-switcher" role="tablist" aria-label={label}
    style={{ '--trip-mode-index': modes.findIndex(mode => mode.id === value) } as CSSProperties}>
    <span className="trip-mode-indicator" aria-hidden="true" />
    {modes.map((mode, index) => <Button key={mode.id} ref={element => { buttons.current[index] = element; }}
      className="trip-mode-option" variant="ghost" size="sm" role="tab" id={`${id}-tab-${mode.id}`}
      aria-selected={value === mode.id} aria-controls={`${id}-panel`} tabIndex={value === mode.id ? 0 : -1}
      onClick={() => onChange(mode.id)} onKeyDown={event => onKeyDown(event, index)}>
      <span className="trip-mode-label" data-text={mode.label}>{mode.label}</span>
    </Button>)}
  </div>;
}
