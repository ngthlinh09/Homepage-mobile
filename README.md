# Homepage-mobile

Mobile homepage redesign, designed in Figma and built with Copilot.

## Getting started

```bash
npm install
npm run dev     # start the dev server
npm run build   # type-check and build
npm run lint    # oxlint
```

Open the dev server URL and view it at a mobile width — the screen is
constrained to the Figma frame width (`--layout-max-width`).

## Project layout

| Path | What it holds |
| ---- | ------------- |
| `src/components/` | Screens and components (`.tsx` + matching `.css`) |
| `src/styles/tokens.css` | Design tokens, mirroring the Figma variables |
| `src/styles/global.css` | Resets and base element styles |
| `design/` | Figma references, exports and the Figma ↔ Copilot setup |
| `.github/copilot-instructions.md` | Project conventions Copilot follows |
| `.github/prompts/` | Reusable prompts, e.g. `/figma-to-component` |

## Designing with Figma and Copilot

1. Enable the Dev Mode MCP server in the Figma desktop app
   (**Preferences → Enable local MCP server**).
2. Open this repository in VS Code and start the `figma` MCP server configured
   in `.vscode/mcp.json`.
3. In Copilot Chat agent mode, select a frame in Figma (or paste its link) and
   prompt. Your own agents, skills and prompt files stay available, plus
   `/figma-to-component` from this repository.
4. Add the Figma node for anything you build to `design/figma-references.md`.

See `design/README.md` for details, and `.github/copilot-instructions.md` for
the design rules (tokens over hard-coded values, mobile first, accessible
markup) that Copilot applies automatically.

## Prompts to start with

- `/figma-to-component` with a frame selected in Figma.
- "Rebuild the hero section of `src/components/Homepage.tsx` from this frame."
- "Sync `src/styles/tokens.css` with the variables in this Figma file."
