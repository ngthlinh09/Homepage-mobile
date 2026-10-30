export type Airport = { code: string; city: string; name: string; region: string };

export const airports: Airport[] = [
  { code: 'DFW', city: 'Dallas/Fort Worth', name: 'Dallas Fort Worth International', region: 'TX' },
  { code: 'DAL', city: 'Dallas', name: 'Dallas Love Field', region: 'TX' },
  { code: 'CLT', city: 'Charlotte', name: 'Charlotte Douglas International', region: 'NC' },
  { code: 'ORD', city: 'Chicago', name: "O'Hare International", region: 'IL' },
  { code: 'MIA', city: 'Miami', name: 'Miami International', region: 'FL' },
  { code: 'PHL', city: 'Philadelphia', name: 'Philadelphia International', region: 'PA' },
  { code: 'PHX', city: 'Phoenix', name: 'Phoenix Sky Harbor International', region: 'AZ' },
  { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles International', region: 'CA' },
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy International', region: 'NY' },
  { code: 'LGA', city: 'New York', name: 'LaGuardia', region: 'NY' },
  { code: 'DCA', city: 'Washington', name: 'Reagan National', region: 'DC' },
  { code: 'BOS', city: 'Boston', name: 'Logan International', region: 'MA' },
  { code: 'AUS', city: 'Austin', name: 'Austin-Bergstrom International', region: 'TX' },
  { code: 'IAH', city: 'Houston', name: 'George Bush Intercontinental', region: 'TX' },
  { code: 'SFO', city: 'San Francisco', name: 'San Francisco International', region: 'CA' },
  { code: 'SAN', city: 'San Diego', name: 'San Diego International', region: 'CA' },
  { code: 'SEA', city: 'Seattle', name: 'Seattle-Tacoma International', region: 'WA' },
  { code: 'DEN', city: 'Denver', name: 'Denver International', region: 'CO' },
  { code: 'LAS', city: 'Las Vegas', name: 'Harry Reid International', region: 'NV' },
  { code: 'ATL', city: 'Atlanta', name: 'Hartsfield-Jackson International', region: 'GA' },
  { code: 'MCO', city: 'Orlando', name: 'Orlando International', region: 'FL' },
  { code: 'TPA', city: 'Tampa', name: 'Tampa International', region: 'FL' },
  { code: 'FLL', city: 'Fort Lauderdale', name: 'Fort Lauderdale-Hollywood International', region: 'FL' },
  { code: 'BNA', city: 'Nashville', name: 'Nashville International', region: 'TN' },
  { code: 'RDU', city: 'Raleigh/Durham', name: 'Raleigh-Durham International', region: 'NC' },
  { code: 'MSY', city: 'New Orleans', name: 'Louis Armstrong New Orleans International', region: 'LA' },
  { code: 'HNL', city: 'Honolulu', name: 'Daniel K. Inouye International', region: 'HI' },
  { code: 'SJU', city: 'San Juan', name: 'Luis Muñoz Marín International', region: 'Puerto Rico' },
  { code: 'CUN', city: 'Cancún', name: 'Cancún International', region: 'Mexico' },
  { code: 'SJD', city: 'Los Cabos', name: 'Los Cabos International', region: 'Mexico' },
  { code: 'MEX', city: 'Mexico City', name: 'Benito Juárez International', region: 'Mexico' },
  { code: 'LHR', city: 'London', name: 'Heathrow', region: 'United Kingdom' },
  { code: 'MAD', city: 'Madrid', name: 'Adolfo Suárez Madrid-Barajas', region: 'Spain' },
  { code: 'CDG', city: 'Paris', name: 'Charles de Gaulle', region: 'France' },
  { code: 'DUB', city: 'Dublin', name: 'Dublin', region: 'Ireland' },
  { code: 'NRT', city: 'Tokyo', name: 'Narita International', region: 'Japan' },
  { code: 'HND', city: 'Tokyo', name: 'Haneda', region: 'Japan' },
  { code: 'GRU', city: 'São Paulo', name: 'Guarulhos International', region: 'Brazil' },
  { code: 'LIM', city: 'Lima', name: 'Jorge Chávez International', region: 'Peru' },
];

export const popularFrom: Record<string, string[]> = {
  DFW: ['CUN', 'LAX', 'MIA', 'LGA', 'LAS', 'ORD'],
  default: ['MIA', 'LAX', 'LGA', 'ORD', 'CUN', 'LHR'],
};

export const findAirport = (code: string) => airports.find(airport => airport.code === code.toUpperCase()) ?? null;

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function rank(query: string) {
  const q = normalize(query);
  if (!q) return [];
  return airports
    .map(airport => {
      const code = airport.code.toLowerCase();
      const city = normalize(airport.city);
      const name = normalize(airport.name);
      const score = code === q ? 0 : city.startsWith(q) ? 1 : code.startsWith(q) ? 2
        : name.split(/[\s/-]+/).some(word => word.startsWith(q)) || city.split(/[\s/-]+/).some(word => word.startsWith(q)) ? 3
        : normalize(airport.region).startsWith(q) ? 4 : 9;
      return { airport, score };
    })
    .filter(item => item.score < 9)
    .sort((a, b) => a.score - b.score)
    .slice(0, 6)
    .map(item => item.airport);
}

export type SimMode = { offline: boolean; slow: boolean; irregularOps: boolean };

export function readSimMode(): SimMode {
  const params = new URLSearchParams(window.location.search);
  const sim = params.get('sim') ?? '';
  return { offline: sim === 'offline', slow: sim === 'slow', irregularOps: params.get('ops') === 'irregular' };
}

/** Simulated autocomplete service with latency and failure modes for state testing. */
export function searchAirports(query: string, sim: SimMode, signal: AbortSignal): Promise<Airport[]> {
  const delay = sim.slow ? 1600 : 160;
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      if (sim.offline || !navigator.onLine) reject(new Error('network'));
      else resolve(rank(query));
    }, delay);
    signal.addEventListener('abort', () => { window.clearTimeout(timer); reject(new DOMException('aborted', 'AbortError')); });
  });
}

export const links = {
  login: 'https://www.aa.com/loyalty/login',
  flights: 'https://www.aa.com/booking/find-flights',
  trips: 'https://www.aa.com/reservation/view/find-your-reservation',
  status: 'https://www.aa.com/travelInformation/flights/status',
  alerts: 'https://www.aa.com/i18n/travel-info/travel-alerts.jsp',
  cards: 'https://www.aa.com/i18n/aadvantage-program/credit-cards/',
  offers: 'https://www.aa.com/i18n/travel-info/travel-offers.jsp',
  aadvantage: 'https://www.aa.com/i18n/aadvantage-program/aadvantage-program.jsp',
  bags: 'https://www.aa.com/i18n/travel-info/baggage/baggage.jsp',
  legal: 'https://www.aa.com/i18n/customer-service/support/legal-privacy-copyright.jsp',
};

/** Card ad copy carried over from the current homepage creative. The headline is one complete sentence. */
export const cardAd = {
  eyebrow: 'Citi® / AAdvantage® card offer',
  headline: 'Earn up to 90,000 bonus miles.',
  body: 'Find the Citi® / AAdvantage® card that’s right for you.',
  cta: 'Explore cards',
  legal: 'Terms apply.',
};

export const disruption = {
  title: 'Winter weather in Chicago (ORD)',
  body: 'Flights may be delayed or canceled. Check your trip before you head to the airport.',
  cta: 'View travel alert',
};

export const asset = (name: string) => `/assets/${name}`;
