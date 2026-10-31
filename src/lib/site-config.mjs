// Single place for site-wide settings. Plain JS so astro.config and scripts can import it.
import pages from '../../data/pages.json' with { type: 'json' };

export const SITE_URL = 'https://mydrivewaysale.net';
export const SITE_NAME = 'My Driveway Sale';

// Amazon Associates tracking ID. Keep as config; do not hardcode in templates.
export const AMAZON_TAG = 'mydriveways0a-20';

// Tim's apps. Store URLs confirmed 2026-10-27 by opening each public listing (seller
// "Tim Fielder Enterprises, LLC" / developer "TF Dev"); prices are the US listings that day.
// BeamMe may be linked publicly (Tim, 2026-10-27). A null URL makes templates skip that button.
export const APPS = {
  stickercalc: {
    name: 'StickerCalc',
    price: '$2.99',
    // Free browser version (StickerCalc Lite): on the live site /stickercalc-web/ wraps the
    // Flutter build at /app/. TODO(port): that app isn't in this repo yet, so on this build
    // /stickercalc-web/ is still a stub. Port /app/ before cutover.
    webPath: '/stickercalc-web/',
    appStore: 'https://apps.apple.com/us/app/stickercalc-color-tag-checkout/id6761667962',
    googlePlay: 'https://play.google.com/store/apps/details?id=com.tfielder.sticker_calc',
  },
  beamme: {
    name: 'BeamMe',
    price: 'Free',
    site: 'https://tfdev.tfielder.com/beammeapp/',
    appStore: 'https://apps.apple.com/us/app/beamme-payment-requests/id6759508798',
    googlePlay: 'https://play.google.com/store/apps/details?id=com.tfielder.beamme',
  },
};

// When false, legal fields (permit, fee, limits, hours, signs, how to apply) from rows
// that are not "verified" render as "Unknown, check with your city".
// The brief says no unsourced values; flip to true only for a local side-by-side review.
export const SHOW_UNVERIFIED_VALUES = false;

// Paths that are placeholder stubs: rendered noindex and kept out of the sitemap.
export const NOINDEX_PATHS = pages.filter((p) => p.stub).map((p) => p.path);
