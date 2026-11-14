// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { writeFileSync } from 'node:fs';
import { SITE_URL, NOINDEX_PATHS } from './src/lib/site-config.mjs';

// Preview builds only. Cloudflare Pages sets CF_PAGES=1 (or set PREVIEW=1 by hand).
// Writes dist/_headers so every preview URL sends X-Robots-Tag: noindex, nofollow.
// Production (Hostinger) builds never set these vars, so the file is not written there,
// and Apache ignores _headers anyway. HTML output is identical in both builds.
const IS_PREVIEW = process.env.CF_PAGES === '1' || process.env.PREVIEW === '1';
const previewNoindex = {
  name: 'preview-noindex',
  hooks: {
    'astro:build:done': ({ dir }) => {
      if (!IS_PREVIEW) return;
      writeFileSync(new URL('_headers', dir), '/*\n  X-Robots-Tag: noindex, nofollow\n');
      console.log('[preview-noindex] wrote _headers (preview build)');
    },
  },
};

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    previewNoindex,
    sitemap({
      // Placeholder stubs stay out of the sitemap until they have real content.
      filter: (page) => !NOINDEX_PATHS.some((p) => page === SITE_URL + p),
    }),
  ],
});
