// AdSense settings and where ads go on each page type.
// Ads are OFF. AdSense rejected the site in July 2026; nothing renders (no loader,
// no <ins>, no empty "Sponsored" boxes) until ADS_ENABLED is true AND the IDs below are real.

// Flip to true only after Tim's AdSense account is approved for mydrivewaysale.net.
export const ADS_ENABLED = false;

// TODO(Tim, AdSense account): publisher ID from AdSense > Account > Account information,
// format 'ca-pub-0000000000000000'. The old WordPress snippets used ca-pub-2398634112645558;
// whether that account is Tim's current, approved one is unknown, so it is NOT wired in here.
export const ADSENSE_CLIENT = null;

// TODO(Tim, AdSense account): real ad unit IDs from AdSense > Ads > By ad unit.
// The live WordPress slots 1000000001 to 1000000004 are sequential placeholders, not real units.
export const AD_UNITS = {
  inArticle: { slot: null, format: 'fluid', layout: 'in-article', label: 'Advertisement' }, // was 1000000003
  rectangle: { slot: null, format: 'rectangle', label: 'Advertisement' },                 // was 1000000002 (300x250)
  multiplex: { slot: null, format: 'autorelaxed', label: 'Advertisement' },               // was 1000000004
  anchor: { slot: null, format: 'auto', label: 'Advertisement' },                         // was 1000000001 (mobile anchor)
};

// Placement map: page type -> named spots -> ad unit. Templates ask for a spot by name;
// a spot not listed here renders nothing. Mirrors the live site's ad positions (hub and
// city pages: in-article near the top, a rectangle mid-page, multiplex at the end) minus the
// fixed bottom anchor, which stays off until AdSense Auto ads anchor is chosen instead.
export const AD_PLACEMENTS = {
  city: { afterIntro: 'inArticle', afterRules: 'rectangle', end: 'multiplex' },
  topic: { afterIntro: 'inArticle', end: 'multiplex' },
  hub: { end: 'multiplex' },
  home: {},
  app: {},    // StickerCalc pages: no ads around the product we sell
  legal: {},  // privacy, terms, about: no ads
  error: {},  // 404: no ads (AdSense policy)
};

const isClient = (v) => typeof v === 'string' && /^ca-pub-\d{16}$/.test(v);
const isSlot = (v) => typeof v === 'string' && /^\d{6,}$/.test(v) && !/^100000000\d$/.test(v);

// True when real ads can render on this page type at all.
export function adsLive(pageType, { noindex = false } = {}) {
  if (!ADS_ENABLED || !isClient(ADSENSE_CLIENT) || noindex) return false;
  return Object.values(AD_PLACEMENTS[pageType] ?? {}).some((u) => isSlot(AD_UNITS[u]?.slot));
}

// The unit for one spot, or null when that spot should render nothing.
export function adUnitFor(pageType, spot, opts) {
  if (!adsLive(pageType, opts)) return null;
  const name = AD_PLACEMENTS[pageType]?.[spot];
  const unit = name && AD_UNITS[name];
  return unit && isSlot(unit.slot) ? { name, ...unit } : null;
}
