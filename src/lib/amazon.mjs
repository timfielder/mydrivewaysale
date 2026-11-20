// Amazon Associates links. Every link is an Amazon SEARCH URL with our tag; no ASINs are
// hard-coded, because none were confirmed. Product names and search phrases are ported from
// the live site's [supply_url] catalog (WordPress "Functions" snippet) and the hand-made links
// on the topic pages, so nothing here is new or made up.
import { AMAZON_TAG } from './site-config.mjs';

export const AMAZON_DISCLOSURE =
  'As an Amazon Associate, My Driveway Sale earns from qualifying purchases. Prices and availability are set by Amazon.';

export function amazonSearchUrl(query) {
  const u = new URL('https://www.amazon.com/s');
  u.searchParams.set('k', query);
  u.searchParams.set('tag', AMAZON_TAG);
  return u.href;
}

// item id -> [label shown to visitors, Amazon search phrase]
const ITEMS = {
  // Stickers (hub step 03 and the sticker strategy page)
  royalGreen: ['Royal Green 10-color coding labels', 'Royal Green Color Coding Labels 10 Color Variety'],
  avery5472: ['Avery 5472 color coding labels (4 colors)', 'Avery 5472 Color Coding Labels'],
  chromaLabel: ['ChromaLabel matte color coding labels (10 colors)', 'ChromaLabel Pro Matte Color Coding Labels 10 Color'],
  garageSalePup: ['Garage Sale Pup pricing stickers (8 colors)', 'Garage Sale Pup Pricing Stickers 8 Color'],
  removableDots: ['Removable color dot stickers', 'removable color dot stickers'],
  multiColorDots: ['Multi-color dot stickers', 'multi color dot stickers garage sale'],
  // Checkout gear
  cashBox: ['Locking cash box with money tray', 'Heavy Duty Locking Cash Box with Money Tray'],
  apron: ['Canvas cashier apron, 3 pockets', 'Canvas Waitress Apron 3 Pockets'],
  counterfeitPens: ['Counterfeit bill detector pens', 'Counterfeit Bill Detector Pens'],
  bags: ['Plastic thank-you bags, bulk', 'Plastic T-Shirt Thank You Bags Bulk'],
  powerBank: ['High-capacity power bank', 'Portable Charger High Capacity Power Bank'],
  // Signs
  posterBoard: ['Neon poster board, bulk pack', 'Neon Poster Board Bulk Pack'],
  stakeSigns: ['Blank yard signs with stakes', 'Heavy Duty Blank Yard Signs with Stakes'],
  chiselMarkers: ['Thick chisel-tip permanent markers', 'Thick Chisel Tip Permanent Markers Black'],
  sharpieExtreme: ['Sharpie Extreme permanent markers', 'sharpie extreme permanent markers'],
  // Display and host comfort
  foldingTable: ['6-foot folding table', 'Portable Folding Table 6 Foot'],
  garmentRack: ['Collapsible rolling garment rack', 'Collapsible Rolling Garment Rack Heavy Duty'],
  canopy: ['10x10 pop-up canopy', '10x10 Pop Up Canopy Tent'],
  standingMat: ['Anti-fatigue standing mat', 'Anti Fatigue Standing Mat Thick'],
  neckFan: ['Rechargeable neck fan', 'Wearable Portable Neck Fan Rechargeable'],
  // Weather
  clearTarp: ['Heavy-duty clear tarp', 'Heavy Duty Clear Tarp Waterproof'],
  sandbags: ['Canopy sandbag weights', 'Canopy Tent Sandbag Weights'],
  cooler: ['Roto-molded cooler', 'Heavy Duty Roto Molded Cooler'],
  // Pricing protocol page asked for this; the old catalog was missing it and linked Amazon's homepage.
  sheetProtectors: ['Heavyweight sheet protectors', 'Heavyweight Plastic Sheet Protectors'],
  // Already linked from the live hub and city-guide playbook.
  tablecloth: ['Fitted tablecloth for a 6-foot table', 'fitted tablecloth 6 foot table'],
  neonLabels: ['Neon color coding labels', 'neon color coding labels price stickers'],
  // Search links for driveway hazard marking, the same supplies the liability guide already tells hosts to use.
  neonTape: ['Neon duct tape', 'neon duct tape brightly colored'],
  trafficCones: ['Orange traffic cones', 'orange traffic cones 18 inch'],
  gafferTape: ['Gaffer tape', 'heavy duty gaffer tape'],
};

export function amazonItem(id) {
  const it = ITEMS[id];
  if (!it) throw new Error(`Unknown Amazon item "${id}" (add it to src/lib/amazon.mjs)`);
  return { id, label: it[0], url: amazonSearchUrl(it[1]) };
}

// Named groups, used by templates.
export const AMAZON_GROUPS = {
  stickers: { title: 'Color pricing stickers', items: ['avery5472', 'royalGreen', 'chromaLabel'] },
  signs: { title: 'Sign supplies', items: ['stakeSigns', 'posterBoard', 'chiselMarkers'], note: 'Check your city\'s sign rules before you buy or post anything.' },
  checkout: { title: 'Checkout table gear', items: ['cashBox', 'apron', 'counterfeitPens', 'bags'] },
  display: { title: 'Tables and racks', items: ['foldingTable', 'tablecloth', 'garmentRack', 'canopy'] },
  comfort: { title: 'Host comfort kit', items: ['canopy', 'standingMat', 'neckFan', 'cooler'] },
  weather: { title: 'Rain and wind backup', items: ['clearTarp', 'sandbags', 'cooler'] },
  security: { title: 'Cash safety', items: ['cashBox', 'counterfeitPens', 'apron'] },
  stickerStrategy: { title: 'What we use for color pricing', items: ['removableDots', 'royalGreen', 'sharpieExtreme'] },
  multiFamily: { title: 'Stickers for a multi-family sale', items: ['multiColorDots', 'royalGreen', 'chromaLabel'] },
  pricing: { title: 'Pricing supplies', items: ['sheetProtectors', 'avery5472', 'chiselMarkers'] },
  hazards: { title: 'Mark the trip hazards', items: ['neonTape', 'gafferTape', 'trafficCones'] },
};

// Which groups each page shows. City pages: what the hub's steps 03, 04, 06 and 07 pointed at.
// Topic pages: the products those pages already linked on the live site. Pages with no
// sensible product (pets, liability, attractive nuisance, best weekends) get none.
export const AMAZON_BY_PAGE = {
  city: ['stickers', 'signs', 'checkout', 'display', 'weather'],
  hub: ['stickers', 'signs', 'checkout', 'display', 'weather'],
  'color-sticker-pricing': ['stickerStrategy'],
  'pricing-appraisal': ['pricing'],
  'host-comfort': ['comfort'],
  'weather-plan': ['weather'],
  'multi-family': ['multiFamily'],
  'security-lockdown': ['security'],
  'liability': ['hazards'],
  '/multifamily-sales/': ['multiFamily'],
  '/local_regulations_guide/': ['signs'],
  '/the-host-comfort-survival-kit/': ['comfort'],
  '/the-weather-rain-pivot-plan/': ['weather'],
  '/house-security-lockdown/': ['security'],
  '/the-ultimate-color-sticker-pricing-strategy/': ['stickerStrategy'],
  '/the-pricing-and-appriasal-protocol/': ['pricing'],
  '/driveway-liability-checklist/': ['hazards'],
  '/stickercalc-web/': ['stickers'],
  '/stickercalc-app/': ['stickers'],
};

export function amazonGroup(name) {
  const g = AMAZON_GROUPS[name];
  if (!g) throw new Error(`Unknown Amazon group "${name}"`);
  return { name, title: g.title, note: g.note ?? null, items: g.items.map(amazonItem) };
}


const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// HTML product block for canvas pages (city guides, topics, articles, hub). Inline styles
// so it still looks fine without the non-canvas base CSS. Disclosure is included; LiveHubBody
// also adds one when amazon.com is present.
export function renderAmazonBlock(groupNames, { heading = 'Supplies that fit this page' } = {}) {
  const names = [...new Set(groupNames)].filter(Boolean);
  if (!names.length) return '';
  const groups = names.map(amazonGroup);
  const blocks = groups.map((g) => {
    const note = g.note ? `<p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #4A5568;">${esc(g.note)}</p>` : '';
    const items = g.items.map((it) =>
      `<li style="margin: 0 0 6px 0;"><a href="${esc(it.url)}" target="_blank" rel="sponsored nofollow noopener" style="color: #4A7D8F;">${esc(it.label)}</a> <span style="color: #718096; font-size: 12px;">(Amazon search)</span></li>`
    ).join('');
    return `<div style="margin: 0 0 16px 0;"><h3 style="margin: 0 0 8px 0; font-size: 16px; color: #00264C;">${esc(g.title)}</h3>${note}<ul style="margin: 0; padding-left: 1.2rem;">${items}</ul></div>`;
  }).join('');
  return `<aside class="mds-amazon-picks" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px 20px; margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2D3748;">
  <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #00264C; font-family: Montserrat, system-ui, sans-serif;">${esc(heading)}</h2>
  <p style="margin: 0 0 14px 0; font-size: 13px; line-height: 1.5; color: #4A5568;">${esc(AMAZON_DISCLOSURE)}</p>
  ${blocks}
</aside>`;
}

export function amazonGroupsFor(key) {
  return AMAZON_BY_PAGE[key] ?? [];
}
