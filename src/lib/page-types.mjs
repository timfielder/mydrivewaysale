// Page type for each existing WordPress page path. Drives ads, Amazon picks and promos.
const TYPES = {
  '/about-contact/': 'legal',
  '/privacy-policy/': 'legal',
  '/terms-of-service/': 'legal',
  '/home/': 'home',
  '/hub/': 'hub',
  '/stickercalc-app/': 'app',
  '/stickercalc-web/': 'app',
};
export function pageTypeFor(path) {
  return TYPES[path] ?? 'topic';
}
