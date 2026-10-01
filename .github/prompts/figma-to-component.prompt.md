---
mode: agent
description: Turn a Figma frame into a React component in this project.
---

Build a React component from the Figma frame I provide (selection or link).

1. Read the frame with the Figma MCP server: its layout, variables, text
   styles, states and any nested components.
2. Map every design value to a token in `src/styles/tokens.css`. If a value has
   no token, add one named after the Figma variable before using it.
3. Create `src/components/<Name>.tsx` and `src/components/<Name>.css`, mobile
   first, semantic and accessible, with BEM class names scoped to the component.
4. Render it from the screen that uses it and add a row to
   `design/figma-references.md` linking the component to the Figma node.
5. Run `npm run lint` and `npm run build`, then summarise anything in the design
   you could not reproduce exactly.
