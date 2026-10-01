# Design

Where the Figma side of the redesign is tracked.

- `figma-references.md` — the Figma node behind each screen and component.
- `exports/` — screenshots, SVG/PNG exports and other assets pulled from Figma.

## Connecting Figma to Copilot

1. Open the design in the **Figma desktop app** and enable the Dev Mode MCP
   server: **Figma → Preferences → Enable local MCP server**.
2. Open this repository in VS Code and start the `figma` server from
   `.vscode/mcp.json` (the Figma Dev Mode MCP server listens on
   `http://127.0.0.1:3845/mcp`).
3. In Copilot Chat (agent mode), select the frame in Figma or paste its link,
   then prompt — for example with `/figma-to-component`.

The MCP server only exposes the file that is open in the desktop app, so no
Figma credentials are stored in this repository.
