// Single place for site-wide settings. Plain JS so astro.config and scripts can import it.
import pages from '../../data/pages.json' with { type: 'json' };
import cities from '../../data/cities.json' with { type: 'json' };
import pagesMeta from '../live/pages-meta.json' with { type: 'json' };
import { STATE_GUIDE_PATHS } from './states.mjs';

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
    // Free browser version (StickerCalc Lite): /stickercalc-web/ wraps the Flutter build at /app/
    // (App Wrapper snippet 13), copied from live into public/app/ on 2026-11-17.
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
// The general state guides are live's empty hub template (same content as /hub/, canonical /hub/ on
// live), so they are noindex too, like the international guide.
// City topic pages default to noindex (AdSense low-value-content risk, 2026-11-19). Flip
// TOPIC_INDEX_DEFAULT, or add a city slug, topic suffix, or exact path below, to put sets back
// in the index later. A page is indexable if the default is true, or its city is listed, or its
// topic suffix is listed, or its path is listed.
export const TOPIC_INDEX_DEFAULT = false;
export const TOPIC_INDEXABLE_CITIES = []; // city guide slugs, e.g. 'chicago-il-garage-sale-guide'
export const TOPIC_INDEXABLE_TOPICS = []; // suffixes, e.g. 'liability'
export const TOPIC_INDEXABLE_PAGES = []; // exact paths, e.g. '/chicago-il-garage-sale-liability/'

export const TOPIC_SUFFIXES = Object.keys(pagesMeta.city_topics);

export function topicPagePath(city, suffix) {
  const slug = typeof city === 'string' ? city : city.slug;
  return `/${slug.replace(/guide$/, suffix)}/`;
}

export function isTopicIndexable(city, suffix) {
  if (TOPIC_INDEX_DEFAULT) return true;
  const slug = typeof city === 'string' ? city : city.slug;
  if (TOPIC_INDEXABLE_CITIES.includes(slug)) return true;
  if (TOPIC_INDEXABLE_TOPICS.includes(suffix)) return true;
  if (TOPIC_INDEXABLE_PAGES.includes(topicPagePath(slug, suffix))) return true;
  return false;
}

const noindexTopicPaths = cities.flatMap((c) =>
  TOPIC_SUFFIXES.filter((suffix) => !isTopicIndexable(c, suffix)).map((suffix) => topicPagePath(c, suffix)),
);

export const NOINDEX_PATHS = [...pages.filter((p) => p.stub).map((p) => p.path), ...STATE_GUIDE_PATHS, ...noindexTopicPaths];

// Indexable pages when no city topic is on: homepage, hub, 100 city guides, 11 national articles,
// 3 legal pages, 2 StickerCalc pages.
export const BASE_INDEXABLE_COUNT = 118;
