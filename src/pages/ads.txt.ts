import type { APIRoute } from 'astro';
import { ADS_ENABLED, ADSENSE_CLIENT } from '../lib/ads-config.mjs';

// ads.txt gets the Google line only once AdSense is approved and the publisher ID is set.
export const GET: APIRoute = () => {
  const pub = typeof ADSENSE_CLIENT === 'string' ? ADSENSE_CLIENT.replace(/^ca-/, '') : null;
  const body = ADS_ENABLED && pub
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : '# No ad networks authorized yet.\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
