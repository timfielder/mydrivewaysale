// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_URL, NOINDEX_PATHS } from './src/lib/site-config.mjs';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      // Placeholder stubs stay out of the sitemap until they have real content.
      filter: (page) => !NOINDEX_PATHS.some((p) => page === SITE_URL + p),
    }),
  ],
});
