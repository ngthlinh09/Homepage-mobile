---
applyTo: '**'
---

# Homepage-mobile — Copilot instructions

Mobile homepage redesign. The source of truth for visual design is Figma; this
repository holds the implementation of those designs.

## Stack

- Vite + React 19 + TypeScript, plain CSS (one `.css` file per component).
- `npm run dev` (dev server), `npm run build` (type-check + build), `npm run lint` (oxlint).
- Components live in `src/components`, design tokens in `src/styles/tokens.css`.

## Designing from Figma

- The Figma Dev Mode MCP server is configured in `.vscode/mcp.json`
  (`http://127.0.0.1:3845/mcp`). Start it from the Figma desktop app
  (**Preferences → Enable local MCP server**) before prompting, then select a
  frame in Figma or paste its link into chat so Copilot can read the real
  design instead of guessing.
- Record the Figma node behind every screen or component in
  `design/figma-references.md`, and keep screenshots/exports in `design/exports/`.

## Design rules

- Never hard-code colors, spacing, radii, shadows or font sizes in a component.
  Use the custom properties from `src/styles/tokens.css`. If a design uses a
  value that has no token, add the token first, named after the Figma variable.
- Mobile first: design at the `--layout-max-width` frame width, then layer on
  wider breakpoints with `min-width` media queries.
- Keep markup semantic and accessible: real headings, `button`/`nav`/`main`
  elements, labels for icon-only controls, and tap targets of at least 44px.
- Class names follow BEM (`.homepage__nav-item`), scoped to the component file.

## Working agreement

- Build one screen or section per change, and run `npm run lint` and
  `npm run build` before finishing.
- Reuse the agents, skills and prompt files already available in Copilot — the
  reusable prompt for turning a frame into a component lives in
  `.github/prompts/figma-to-component.prompt.md`.
