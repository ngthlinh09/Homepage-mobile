import { useEffect, useRef, useState } from 'react';
import { Icon, Logo } from '@aileron/react-components';
import { asset, links } from './data';
import { track } from './analytics';

export function SiteHeader({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); button.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return <header className={`site-header site-header-${tone}`}>
    <div className="site-header-bar">
      <a href="https://www.aa.com/" className="site-header-brand" aria-label="American Airlines home">
        {tone === 'dark'
          ? <Logo logo="aa-american" inverse height="28" width="121" />
          : <img src={asset('american-airlines.png')} alt="" width="121" height="28" />}
      </a>
      <div className="site-header-actions">
        <a className="site-header-login" href={links.login} onClick={() => track('nav_click', { target: 'login' })}>Log in</a>
        <button ref={button} type="button" className="icon-button" aria-expanded={open} aria-controls="site-menu"
          aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => { setOpen(!open); track('nav_menu', { open: !open }); }}>
          <Icon icon={open ? 'action:close' : 'operation:menu'} size={24} />
        </button>
      </div>
    </div>
    {open && <nav id="site-menu" className="site-menu" aria-label="Main">
      <a href={links.flights}>Book flights</a>
      <a href={links.trips}>Trips and check-in</a>
      <a href={links.status}>Flight status</a>
      <a href={links.alerts}>Travel alerts</a>
      <a href={links.aadvantage}>AAdvantage®</a>
    </nav>}
  </header>;
}
