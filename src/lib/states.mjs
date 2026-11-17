// The 50 states plus DC, exactly as the homepage search names them (CitySelector stateMap, the
// Open-Meteo admin1 names). The Location Pending modal sends unknown cities to
// /general-<state>-garage-sale-guide/ (name lowercased, spaces to dashes), like live.
// On live those URLs are the hub template (page 392) with no city data, canonical /hub/.
export const STATES = {"Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA","Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA","Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA","Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY","District of Columbia":"DC"};

export const stateGuideSlug = (name) => 'general-' + name.toLowerCase().replace(/\s+/g, '-') + '-garage-sale-guide';
export const STATE_GUIDE_PATHS = Object.keys(STATES).map((n) => `/${stateGuideSlug(n)}/`);
