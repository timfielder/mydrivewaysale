// Title formula for every page. Used now for the 100 city guides, and later
// for state, region, and topic pages. Base.astro adds the site name through
// withSiteName(). No em or en dashes.
import { SITE_NAME } from './site-config.mjs';

export { SITE_NAME };

export function withSiteName(title) {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

// City guide: "San Antonio, TX Garage Sale Rules: Permits, Fees and Signs"
export function cityGuideTitle(r) {
  return `${r.city}, ${r.state} ${r.sale_term} Rules: Permits, Fees and Signs`;
}

// State guide (later). Matches the live URL words "garage-sale-guide".
// Example: "Texas Garage Sale Rules: Permits, Fees and Signs"
export function stateGuideTitle(stateName) {
  return `${stateName} Garage Sale Rules: Permits, Fees and Signs`;
}

// Region guide (later). Example: "Southeast Garage Sale Rules: Permits, Fees and Signs"
export function regionGuideTitle(regionName) {
  return `${regionName} Garage Sale Rules: Permits, Fees and Signs`;
}

// Topic pages (later).
// national: "Driveway Liability Checklist"
// city:     "San Antonio, TX Garage Sale Driveway Liability Checklist"
// state:    "Texas Garage Sale Driveway Liability Checklist"
// region:   "Southeast Garage Sale Driveway Liability Checklist"
export function topicTitle({ level, topicName, city, state, saleTerm, stateName, regionName }) {
  if (level === 'city') return `${city}, ${state} ${saleTerm} ${topicName}`;
  if (level === 'state') return `${stateName} Garage Sale ${topicName}`;
  if (level === 'region') return `${regionName} Garage Sale ${topicName}`;
  return topicName;
}
