<img src="assets/icon.svg" width="64" height="64" alt="">

# American Airlines mobile homepage

React + TypeScript implementation of the [American Airlines Figma frame](https://www.figma.com/design/ObecGCCfn8s4nKfTMCjZZl/?node-id=9209-52937), using Vite, Aileron React components, and Aileron design tokens. Original Figma images and American Sans fonts are stored locally in `public/assets/`.

## Run locally

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. At desktop widths the page remains a centered 390px mobile screen; smaller screens use the available width. The decorative iPhone status bar is included to reproduce the provided frame and does not represent live device information.

## Checks

```sh
npm run build
npx playwright install chromium
npm test
```

The browser tests cover frame geometry, asset loading, keyboard navigation, airport swapping, expanded search, trip and status lookups, travel alerts, carousel controls, and overflow at 320px, 430px, and 1280px. Screenshots are written to `test-results/`.

## Implementation notes

- `src/App.tsx`: header, booking widget, travel alerts, promotions, offers, news, and footer.
- `src/styles.css`: responsive layout and Figma styling, built on Aileron tokens.
- The date picker fills only the visible phone mockup, including on desktop preview pages. `scripts/aileron-phone-viewport.ts` adapts the shipped ADS Calendar breakpoint and mobile CSS to that container, retaining its native stacked-month selection and keyboard behavior. Review this adapter when upgrading Aileron; it fails the build if the expected library implementation changes.
- Booking and reservation forms are interactive design demos, not connected to airline services. Form submissions explicitly identify the demo and link to American Airlines for live availability or trip information.
- Aileron icons use the official `Icon` renderer and unmodified glyphs mirrored in `public/assets/aileron/icons/`. A scoped Vite transform points that renderer at the local assets because the CDN was rejecting browser requests. No icon drawing or replacement markup is used.
- `@aileron/react-components@2.0.1` references `@aileron/tokens@^0.11.0`, which was unavailable in the configured registry. A scoped npm override uses the available `0.10.0` tokens; production build and browser checks verify the components used here. Remove the override when the required token release becomes available.

## Booking design versions

Open `/versions` for a **Design version** control outside the phone mockup. Version 1 keeps the approved tabbed booking widget. Version 2 implements the stacked Book, Your trip & check-in, and Flight status cards from [Figma frame 9227:75918](https://www.figma.com/design/ObecGCCfn8s4nKfTMCjZZl/?node-id=9227-75918).

Clean previews are available at `/?version=v1` and `/?version=v2`. Version 2 shares the approved airport-focus/button disclosure, payment control, advanced search, and phone-contained ADS calendar. Its cards can be opened and closed, and field drafts survive switching cards. Switching design versions resets only the booking widget; the shared promotional carousel and lower homepage stay mounted and preserve their state. Browser tests require identical ad, offers, news, and footer assets, text, computed styling, and relative geometry, with a small screenshot tolerance for Chromium's gradient dithering and image-edge rasterization.

Version 3 is available at `/?version=v3` and in the `/versions` picker. It follows the supplied four-state screenshot: a compact booking prompt with Trips & check-in and Flight status shortcuts, plus focused booking, trip, and status panels below the shared header. Focusing From or To opens booking without interrupting typing. Panels preserve drafts, provide persistent bottom search actions, and close with the circle-X or Escape, restoring focus to the homepage. The shared calendar opens above the search panel; closing it returns to the originating date field. Flight status starts on Flight number; its date label uses “Flight dates” rather than the screenshot's leftover “Date of birth.” Tests in `tests/booking-version-3.spec.ts` cover all four layouts, validation, nested calendars, draft retention, version selection, and responsive containment.

Version 4 is available at `/?version=v4` and in the `/versions` picker. Its inline Book, Your trip & check-in, and Flight status sections use dividers instead of separate cards. `src/ExclusiveTravelTools.tsx` composes the Aileron accordion with a close-then-open sequence: it waits for the outgoing panel's actual animations to finish before revealing the next, cancels superseded requests, preserves input drafts, and announces the active section to screen readers. Keyboard navigation stays on the selected header, and an off-screen header is brought back into view. Reduced motion switches immediately. Book starts compact, expands through airport focus or Show all search options, and includes Show less below Search flights. `tests/booking-version-4.spec.ts` checks frame-by-frame exclusivity, rapid switching, keyboard behavior, independent advanced search, calendars, responsive layouts, and saved drafts. Versions 1–3 retain their existing behavior.

All four versions include a local **Vacations** category. `src/TravelCategories.tsx` shares category selection; `src/VacationSearch.tsx` adapts the supplied package-search reference to the existing mobile route field, round-trip calendar, passenger selector, and fare selector. Its illustrative defaults are DFW, one passenger, and Coach. Flight and vacation drafts (including their dates) remain independent and survive category/tool switches. Version 3 opens Vacations in its focused panel; Version 4 retains exclusive accordion behavior. A valid Search opens `https://www.aavacations.com/` in a new tab without sending demo inputs; the form explicitly explains this. `tests/vacations.spec.ts` covers all four versions, validation, external navigation with a stubbed destination, draft retention, independent calendars, and widths from 320px to desktop previews.

Version 2's **Your trip & check-in** card follows Figma node `9341:83703`: Find trip / Find travel credit tabs, inline last-name guidance, a date-range field, and a confirmation-code-or-ticket-number field. Its initial January 20–February 12, 2027 range is illustrative data from the reference. The existing Find action appears after the name and identifier are entered; Enter also submits. Both lookup modes preserve the form draft and use demo results linking to the appropriate American Airlines page. Lookup dates are independent of the Book form's dates.

Input fields follow the Figma component sheets **Input fields** (`5581:37299`) and **Date picker** (`5581:37608`), shared by both design versions:

- `src/RouteField.tsx`: From/To airport field with empty, hover, pressed, focus, filled (code + city), and per-side error states with captions. Known codes or city names are normalized to the airport code on blur. Searching with an empty airport shows the error state instead of the browser's native validation bubble.
- `src/TextField.tsx`: general text field with the same container states, a floating label once focused or filled, an optional trailing action, and an ADS error state that replaces the browser's required-field bubble.
- Both versions use these components everywhere: Book (route and dates), Your trips / check-in (last name, confirmation code, trip dates), and Flight status (flight number and an ADS date field that opens the shared phone calendar).
- `src/input-fields.css`: the route-field states plus a `date-field` skin for ADS `DateInput` (default, hover, pressed, focus, filled with a floating label, and error with the outlined error glyph and message).

## Booking reveal interaction study

Open `/interactions` to compare five alternatives against the current button without changing the rest of the Figma homepage. All six treatments now open smoothly:

- `/?reveal=airport-focus`: focusing From or To reveals the remaining fields, retaining airport focus and pushing the content below down over 360ms.
- `/?reveal=details-preview`: a compact dates/passengers preview row reveals the fields.
- `/?reveal=attached-handle`: a rounded icon handle attached to the airport picker reveals the fields.
- `/?reveal=route-ready`: enter both airports, then leave the picker. A forward Tab from To opens the fields and focuses Trip type; an outside tap retains its target's focus.
- `/?reveal=pull-reveal`: pull the grabber at least 64px downward and release. Short or cancelled pulls return to rest; tapping or keyboard activation also opens it.
- `/?reveal=baseline`: the current hybrid treatment. The tertiary button remains available, while focusing From or To also starts the same smooth reveal. Category chips stay visible and the airport picker stays in place; airport-triggered expansion retains focus for uninterrupted typing.

The comparison controls are outside the prototype. Use **Open clean preview** to view only the homepage, or **Reset interaction** to start another attempt. Alternatives keep the categories and airport inputs stationary, stay expanded after blur, and respect reduced-motion preferences. These are hypotheses to test, not validated usability findings.

## Homepage redesign concepts

Three working mobile homepage concepts based on the Homepage Redesign PRD (draft v0.1). Each one meets the MVP requirements FR-1 to FR-7, and each uses a different organizing model.

- `/concepts`: review page. Shows the three concepts side by side at a chosen viewport, with a live above-the-fold check, scenario switches, a live analytics event log, and a recommendation.
- `/concepts/a`, **One Canvas**: a single question; trips and status replace the booking form in place.
- `/concepts/b`, **Departure Board**: booking, trip lookup, and flight status are all typeable on the homepage.
- `/concepts/c`, **Thumb Dock**: suggested origin, one-tap destinations, and a fixed bottom bar with a search button that shows the route.

Add `?ops=irregular`, `?sim=offline`, or `?sim=slow` to any concept URL to preview the disruption, offline-autocomplete, and slow-network states. Concept code lives in `src/concepts/`; shared booking logic, the airport combobox, and analytics are in `src/concepts/shared/`. `tests/concepts.spec.ts` checks every concept against the fold matrix (375×548, 360×640, 390×664, 430×740), plus 320px overflow, keyboard autocomplete, error association, offline fallback, disruption precedence, analytics events, and 44px touch targets.

Created in [T3 Code](https://t3.codes).
