// Single place for site-wide settings. Plain JS so astro.config and scripts can import it.
import pages from '../../data/pages.json' with { type: 'json' };

export const SITE_URL = 'https://mydrivewaysale.net';
export const SITE_NAME = 'My Driveway Sale';

// Amazon Associates tracking ID. Keep as config; do not hardcode in templates.
export const AMAZON_TAG = 'mydrivewaysal-20';

// BeamMe may be linked publicly (Tim, 2026-10-27). No public store URL captured yet,
// so this stays null until one is confirmed; templates skip the link when null.
export const BEAMME_URL = null;

// When false, legal fields (permit, fee, limits, hours, signs, how to apply) from rows
// that are not "verified" render as "Unknown, check with your city".
// The brief says no unsourced values; flip to true only for a local side-by-side review.
export const SHOW_UNVERIFIED_VALUES = false;

// Paths that are placeholder stubs: rendered noindex and kept out of the sitemap.
export const NOINDEX_PATHS = pages.filter((p) => p.stub).map((p) => p.path);
