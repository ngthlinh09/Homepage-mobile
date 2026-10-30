import type { Plugin } from 'vite';

/** Keep the shipped ADS Calendar, but let a phone preview act as its viewport. */
export function aileronPhoneViewport(): Plugin {
  return {
    name: 'aileron-phone-viewport',
    enforce: 'pre',
    transform(code, id) {
      const path = id.split('?')[0];
      if (!path.includes('/@aileron/react-components/')) return;

      if (path.endsWith('/react-components.js')) {
        // The pinned component has no viewport/container prop. Adapt just its
        // Calendar breakpoint effect, without changing window.innerWidth or
        // replacing any selection, validation, or keyboard behavior.
        const breakpoint = /let e = \(\) => \{\s*let e = window\.innerWidth;\s*G\(e < Q\), q\(e >= Q && e <= re\);\s*\};\s*return e\(\), window\.addEventListener\("resize", e\), \(\) => window\.removeEventListener\("resize", e\);/;
        if (!breakpoint.test(code)) this.error('The ADS Calendar breakpoint adapter needs reviewing for this Aileron release.');
        return {
          code: code.replace(breakpoint, `
            const phone = k.current?.closest("[data-phone-viewport]");
            const measure = () => {
              const width = phone?.getBoundingClientRect().width || window.innerWidth;
              G(width < Q); q(width >= Q && width <= re);
            };
            measure();
            const observer = phone ? new ResizeObserver(measure) : null;
            if (phone) observer.observe(phone);
            window.addEventListener("resize", measure);
            return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
          `),
          map: null,
        };
      }

      if (path.endsWith('/index.css')) {
        // Mirror the library's mobile Calendar rules as container queries.
        // Outside the phone preview its original viewport rules remain intact.
        const mobile = /@media\s*\(\s*width\s*<=\s*513px\s*\)\s*\{/g;
        const blocks: string[] = [];
        let match: RegExpExecArray | null;
        while ((match = mobile.exec(code))) {
          const start = mobile.lastIndex;
          let end = start;
          let depth = 1;
          while (depth && end < code.length) {
            if (code[end] === '{') depth++;
            else if (code[end] === '}') depth--;
            end++;
          }
          const body = code.slice(start, end - 1);
          if (body.includes('.cal__')) {
            blocks.push(`@container phone-viewport (width <= 513px){${body.replaceAll('100dvw', '100cqw')}}`);
          }
          mobile.lastIndex = end;
        }
        if (!blocks.length) this.error('The ADS Calendar mobile stylesheet adapter needs reviewing for this Aileron release.');
        return { code: `${code}\n${blocks.join('\n')}`, map: null };
      }
    },
  };
}
