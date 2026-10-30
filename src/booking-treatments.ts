export type BookingTreatment = 'airport-focus' | 'details-preview' | 'attached-handle' | 'route-ready' | 'pull-reveal' | 'baseline';

export const bookingTreatments: { id: BookingTreatment; label: string; instruction: string; hypothesis: string; watchFor: string }[] = [
  {
    id: 'airport-focus',
    label: 'Airport focus',
    instruction: 'Tap From or To. Keep typing as the remaining fields unfold underneath.',
    hypothesis: 'Starting the route is enough to reveal the rest of the task; no extra expansion action is needed.',
    watchFor: 'Does the movement feel natural, or does it distract while entering an airport?',
  },
  {
    id: 'details-preview',
    label: 'Details preview',
    instruction: 'Tap the compact dates and passenger row below the airports.',
    hypothesis: 'A preview of the hidden fields makes the next action more discoverable than a generic options label.',
    watchFor: 'Do people recognize this as a control and understand that it opens the full search?',
  },
  {
    id: 'attached-handle',
    label: 'Attached handle',
    instruction: 'Tap the rounded + handle attached to the bottom of the airport picker.',
    hypothesis: 'An attached control makes the expanded fields feel like part of the same booking object.',
    watchFor: 'Is the icon understandable without an explanatory text label?',
  },
  {
    id: 'route-ready',
    label: 'Route-ready reveal',
    instruction: 'Enter both airports, then Tab out of To or tap outside the airport picker. Trip details unfold next.',
    hypothesis: 'Waiting until the route is entered avoids adding motion while the first airport is being typed.',
    watchFor: 'Does the reveal feel like a useful next step, or is the route-completion trigger too hidden?',
  },
  {
    id: 'pull-reveal',
    label: 'Pull-to-reveal',
    instruction: 'Pull the grabber downward and release. A shorter pull cancels; a tap or Enter also opens it.',
    hypothesis: 'A direct-manipulation gesture makes the booking form feel like one expandable surface.',
    watchFor: 'Do people discover the gesture, and can they distinguish it from scrolling the page?',
  },
  {
    id: 'baseline',
    label: 'Current button',
    instruction: 'Tap Show all search options, or start directly in From or To. Both smoothly open the trip details.',
    hypothesis: 'Keep an explicit affordance for discovery, while letting people start in the airports without an extra tap.',
    watchFor: 'Does combining both triggers improve discovery without making the opening feel unexpected?',
  },
];

export function getBookingTreatment(fallback: BookingTreatment = 'baseline'): BookingTreatment {
  const requested = new URLSearchParams(window.location.search).get('reveal');
  return bookingTreatments.find(treatment => treatment.id === requested)?.id ?? fallback;
}
