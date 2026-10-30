import { Icon } from '@aileron/react-components';
import { asset, disruption, links } from './data';
import { track } from './analytics';

export function DisruptionNotice({ className = '' }: { className?: string }) {
  return <section className={`disruption ${className}`} aria-labelledby="disruption-title">
    <Icon icon="signal:warning" size={24} />
    <div>
      <h2 id="disruption-title">{disruption.title}</h2>
      <p>{disruption.body}</p>
      <a href={links.alerts} onClick={() => track('alert_click')}>{disruption.cta}</a>
    </div>
  </section>;
}

export function SiteFooter({ className = '' }: { className?: string }) {
  return <footer className={`site-footer ${className}`}>
    <div className="site-footer-top">
      <nav aria-label="Footer" className="site-footer-links">
        <a href={links.legal}>Legal, privacy, copyright</a>
        <a href="https://www.aa.com/i18n/customer-service/contact-american/american-customer-service.jsp">Contact American</a>
        <a href="https://www.aa.com/">Full site</a>
      </nav>
      <img src={asset('oneworld.png')} width="32" height="32" alt="oneworld alliance member" />
    </div>
    <p>© 2026 American Airlines. Homepage concept for research — not a live booking service.</p>
  </footer>;
}
