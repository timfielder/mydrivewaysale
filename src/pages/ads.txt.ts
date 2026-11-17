import type { APIRoute } from 'astro';
import { ADSENSE_CLIENT } from '../lib/ads-config.mjs';

// ads.txt lists the publisher ID once it is set. Ad rendering stays gated by ADS_ENABLED.
export const GET: APIRoute = () => {
  const pub = typeof ADSENSE_CLIENT === 'string' ? ADSENSE_CLIENT.replace(/^ca-/, '') : null;
  const body = pub
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : '# No ad networks authorized yet.\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
