import { Icon } from '@aileron/react-components';

export type BookingCategory = 'flights' | 'vacations';
const categories = [
  { id: 'flights', label: 'Flights', icon: 'transportation:flight-angled-right-alt' },
  { id: 'vacations', label: 'Vacations', icon: 'transportation:vacation' },
  { id: 'hotels', label: 'Hotels', icon: 'transportation:hotel', href: 'https://www.aadvantagehotels.com/' },
  { id: 'cars', label: 'Cars', icon: 'transportation:car', href: 'https://www.aa.com/car' },
  { id: 'cruises', label: 'Cruises', icon: 'transportation:cruise', href: 'https://www.aacruises.com/' },
  { id: 'experiences', label: 'Experiences', icon: 'transportation:activities', href: 'https://www.aa.com/i18n/travel-info/travel-offers.jsp' },
] as const;

export default function TravelCategories({ value, onChange }: {
  value: BookingCategory;
  onChange: (value: BookingCategory, trigger: HTMLButtonElement) => void;
}) {
  return <div className="travel-categories" aria-label="Travel categories">
    {categories.map(category => 'href' in category
      ? <a className="travel-chip" key={category.id} href={category.href} target="_blank" rel="noreferrer">
          <Icon icon={category.icon} size={16} />{category.label}
          <img src="/assets/external-link.svg" alt="(opens in a new tab)" />
        </a>
      : <button type="button" className={`travel-chip${value === category.id ? ' selected' : ''}`} key={category.id}
          data-category={category.id} aria-pressed={value === category.id} onClick={event => onChange(category.id, event.currentTarget)}>
          <Icon icon={category.icon} size={16} />{category.label}
        </button>)}
  </div>;
}
