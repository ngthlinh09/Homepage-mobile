import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { aileronPhoneViewport } from './scripts/aileron-phone-viewport';

export default defineConfig({
  plugins: [
    react(),
    aileronPhoneViewport(),
    {
      name: 'local-aileron-icon-assets',
      // Icon has no configurable asset base. Keep the official renderer and
      // glyphs, but avoid browser CDN requests being rejected by the CDN.
      transform(code, id) {
        if (!id.includes('/@aileron/react-components/') || !id.split('?')[0].endsWith('.js')) return;
        const cdn = 'https://cdn.aa.com/aileron/icons';
        if (code.includes(cdn)) return { code: code.replaceAll(cdn, '/assets/aileron/icons'), map: null };
      },
    },
  ],
  optimizeDeps: { exclude: ['@aileron/react-components'] },
});
