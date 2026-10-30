export type BookingDesignVersion = 'v1' | 'v2' | 'v3' | 'v4';

export const bookingVersions = [
  { id: 'v1', label: 'Version 1 — Current tabs' },
  { id: 'v2', label: 'Version 2 — Stacked cards' },
  { id: 'v3', label: 'Version 3 — Focused search' },
  { id: 'v4', label: 'Version 4 — Exclusive accordion' },
] as const;

export function getBookingDesignVersion(): BookingDesignVersion {
  const version = new URLSearchParams(window.location.search).get('version');
  return version === 'v2' || version === 'v3' || version === 'v4' ? version : 'v1';
}
