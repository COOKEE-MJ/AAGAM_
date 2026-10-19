// 11 disaster hazards that AAGAM covers.
// Each one points to the official Indian government agency responsible for it.
// To add a new hazard later: add one object here and run npm test — tests check every hazard has an agency.

const HAZARD_LIST = [
  {
    id: 'cyclone',
    label: 'Cyclone',
    category: 'hydro-meteorological',
    agency: 'India Meteorological Department (IMD)',
    sourceName: 'IMD Cyclone Warning',
    sourceUrl: 'https://mausam.imd.gov.in',
    whatToDo: [
      'Move away from coastal areas and low-lying ground immediately.',
      'Go to the nearest cyclone shelter or a strong concrete building.',
      'Do not go out during the eye of the storm — the danger is not over.',
    ],
  },
  {
    id: 'flood',
    label: 'Flood',
    category: 'hydro-meteorological',
    agency: 'Central Water Commission (CWC)',
    sourceName: 'CWC Flood Forecast',
    sourceUrl: 'https://ffs.india-water.gov.in',
    whatToDo: [
      'Move to higher ground immediately; do not wait for orders.',
      'Do not walk or drive through floodwater — even 15 cm can knock you down.',
      'Turn off electricity at the main switch if water enters your home.',
    ],
  },
  {
    id: 'rain',
    label: 'Heavy Rain',
    category: 'hydro-meteorological',
    agency: 'IMD (district wise warnings, nowcast)',
    sourceName: 'IMD District Warning',
    sourceUrl: 'https://mausam.imd.gov.in',
    whatToDo: [
      'Stay indoors and away from windows during heavy downpour.',
      'Avoid flooded streets, drains, and underpasses.',
      'Keep a torch and emergency kit ready in case of power cut.',
    ],
  },
  {
    id: 'earthquake',
    label: 'Earthquake',
    category: 'geological',
    agency: 'National Center for Seismology (NCS), MoES',
    sourceName: 'NCS Earthquake Report',
    sourceUrl: 'https://seismo.gov.in',
    whatToDo: [
      'Drop, cover your head, and hold on under a sturdy table or against an inner wall.',
      'Stay away from windows, heavy furniture, and exterior walls.',
      'After shaking stops, check for gas leaks and move to open ground.',
    ],
  },
  {
    id: 'landslide',
    label: 'Landslide',
    category: 'geological',
    agency: 'Geological Survey of India (GSI), nodal agency',
    sourceName: 'GSI Landslide Forecast',
    sourceUrl: 'https://www.gsi.gov.in',
    whatToDo: [
      'Evacuate hillside homes and areas near steep slopes immediately.',
      'Stay away from stream channels and drainage channels after heavy rain.',
      'Listen to local authority instructions and do not return until cleared.',
    ],
  },
  {
    id: 'tsunami',
    label: 'Tsunami',
    category: 'geological',
    agency: 'INCOIS, Indian Tsunami Early Warning Centre',
    sourceName: 'INCOIS Tsunami Advisory',
    sourceUrl: 'https://tsunami.incois.gov.in',
    whatToDo: [
      'If you feel a strong earthquake near the coast, move inland immediately — do not wait for a siren.',
      'Go to high ground or at least 3 km inland on foot if roads are blocked.',
      'Do not return to the coast until officials announce the all-clear.',
    ],
  },
  {
    id: 'heatwave',
    label: 'Heat Wave',
    category: 'climatological',
    agency: 'India Meteorological Department (IMD)',
    sourceName: 'IMD Heat Wave Warning',
    sourceUrl: 'https://mausam.imd.gov.in',
    whatToDo: [
      'Stay indoors between 11 AM and 4 PM; use fans, coolers, or air conditioning.',
      'Drink water every hour even if not thirsty; avoid tea, coffee, and alcohol.',
      'Check on elderly neighbours and children; call 108 if someone shows heat stroke signs.',
    ],
  },
  {
    id: 'coldwave',
    label: 'Cold Wave',
    category: 'climatological',
    agency: 'India Meteorological Department (IMD)',
    sourceName: 'IMD Cold Wave Warning',
    sourceUrl: 'https://mausam.imd.gov.in',
    whatToDo: [
      'Wear layers of warm clothing; cover head, hands, and feet.',
      'Keep homeless and elderly people warm; report anyone sleeping outdoors to 1077.',
      'Avoid alcohol — it reduces body temperature despite feeling warm.',
    ],
  },
  {
    id: 'lightning',
    label: 'Lightning / Thunderstorm',
    category: 'hydro-meteorological',
    agency: 'IMD (nowcast, Damini lightning alerts)',
    sourceName: 'IMD Thunderstorm Nowcast',
    sourceUrl: 'https://mausam.imd.gov.in',
    whatToDo: [
      'Go inside a building or a hard-topped car immediately.',
      'Stay away from tall trees, poles, open fields, and bodies of water.',
      'Unplug electronic equipment and avoid using corded phones.',
    ],
  },
  {
    id: 'forest_fire',
    label: 'Forest Fire',
    category: 'climatological',
    agency: 'Forest Survey of India (FSI), FAST alerts',
    sourceName: 'FSI Forest Fire Alert',
    sourceUrl: 'https://fsiforestfire.gov.in',
    whatToDo: [
      'Leave the area immediately if you see smoke or fire approaching.',
      'Close all windows and doors and seal gaps with wet cloth if evacuation is not possible.',
      'Call 101 (Fire) or 1078 (Disaster) and follow evacuation orders.',
    ],
  },
  {
    id: 'avalanche',
    label: 'Avalanche',
    category: 'geological',
    agency: 'NDMA / snow and avalanche agencies',
    sourceName: 'SACHET NDMA Alert',
    sourceUrl: 'https://sachet.ndma.gov.in',
    whatToDo: [
      'Avoid mountain slopes and high-altitude routes during avalanche warnings.',
      'If caught, try to swim to the surface and create an air pocket in front of your face.',
      'Call 112 immediately once safe; stay with the group.',
    ],
  },
  {
    id: 'dust_storm',
    label: 'Dust storm',
    category: 'hydro-meteorological',
    agency: 'India Meteorological Department (IMD)',
    sourceName: 'IMD Mausam',
    sourceUrl: 'https://mausam.imd.gov.in',
    whatToDo: [
      'Stay indoors, close windows, cover nose and mouth.',
      'Avoid driving and keep away from trees and hoardings.',
    ],
  },
  {
    id: 'drought',
    label: 'Drought',
    category: 'climatological',
    agency: 'Ministry of Agriculture & Farmers Welfare (Drought Management) / NDMA',
    sourceName: 'MoA&FW / NDMA',
    sourceUrl: 'https://mausam.imd.gov.in',
    whatToDo: [
      'Save water. Follow your district water-supply notices.',
      'Practice water conservation in domestic and agricultural use.',
    ],
  },
];

// Quick lookup: HAZARD_MAP['flood'] → the flood object
const HAZARD_MAP = Object.fromEntries(HAZARD_LIST.map((h) => [h.id, h]));

module.exports = { HAZARD_LIST, HAZARD_MAP };

