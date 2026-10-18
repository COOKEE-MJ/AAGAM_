// Generates realistic demo seed data around a chosen district and center coordinates.
// Usage: node seed/build-seed.mjs [district] [lat] [lng]
// Example: node seed/build-seed.mjs "New Delhi" 28.6139 77.2090

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const district = process.argv[2] || 'New Delhi';
const centerLat = parseFloat(process.argv[3] || '28.6139');
const centerLng = parseFloat(process.argv[4] || '77.2090');

// Small jitter around center
const offset = (dLat, dLng) => ({
  lat: Number((centerLat + dLat).toFixed(5)),
  lng: Number((centerLng + dLng).toFixed(5)),
});

const now = new Date();
const hoursAgo = (h) => new Date(now.getTime() - h * 3600 * 1000).toISOString();
const hoursFromNow = (h) => new Date(now.getTime() + h * 3600 * 1000).toISOString();

const users = [
  {
    role: 'authority',
    name: 'Demo Officer',
    email: 'officer@demo.local',
    phone: '9000000001',
    password: 'demo-officer-123',
    homeDistrict: district,
    homeState: 'Delhi',
    districtScope: district,
  },
  {
    role: 'citizen',
    name: 'Demo Citizen',
    email: 'citizen@demo.local',
    phone: '9000000002',
    password: 'Demo@1234',
    homeDistrict: district,
    homeState: 'Delhi',
    districtScope: null,
  },
  {
    role: 'citizen',
    name: 'Rahul Sharma',
    email: 'citizen2@demo.local',
    phone: '9000000003',
    password: 'Demo@1234',
    homeDistrict: district,
    homeState: 'Delhi',
    districtScope: null,
  },
];

// 10 alerts: 8 active/published, 1 expired coldwave, 1 pending forest_fire from unofficial news
const alerts = [
  {
    hazard: 'cyclone',
    severity: 'extreme',
    title: 'Severe Cyclone Alert',
    message: 'Cyclone landfall expected within 12 hours. Coastal and low-lying evacuations ordered.',
    district,
    state: 'Delhi',
    center: offset(0.01, 0.01),
    radiusKm: 40,
    validUntil: hoursFromNow(24),
    sourceName: 'India Meteorological Department (IMD)',
    sourceUrl: 'https://mausam.imd.gov.in',
    status: 'published',
    origin: 'radar',
    dedupeKey: `alert-${district}-cyclone`,
  },
  {
    hazard: 'flood',
    severity: 'high',
    title: 'River Above Warning Level',
    message: 'Water level rising rapidly. Riverbank residents must move to designated shelters.',
    district,
    state: 'Delhi',
    center: offset(-0.015, -0.01),
    radiusKm: 25,
    validUntil: hoursFromNow(18),
    sourceName: 'Central Water Commission (CWC)',
    sourceUrl: 'https://ffs.india-water.gov.in',
    status: 'published',
    origin: 'radar',
    dedupeKey: `alert-${district}-flood`,
  },
  {
    hazard: 'rain',
    severity: 'high',
    title: 'Heavy Rainfall Warning',
    message: 'Inundation and waterlogging expected in low-lying city zones.',
    district,
    state: 'Delhi',
    center: offset(0.02, -0.015),
    radiusKm: 30,
    validUntil: hoursFromNow(12),
    sourceName: 'IMD Nowcast',
    sourceUrl: 'https://mausam.imd.gov.in',
    status: 'published',
    origin: 'radar',
    dedupeKey: `alert-${district}-rain`,
  },
  {
    hazard: 'earthquake',
    severity: 'medium',
    title: 'Earthquake Advisory (M 4.6)',
    message: 'Tremors felt across the district. Report structural damage immediately.',
    district,
    state: 'Delhi',
    center: offset(0.0, 0.0),
    radiusKm: 50,
    validUntil: hoursFromNow(36),
    sourceName: 'National Center for Seismology (NCS)',
    sourceUrl: 'https://seismo.gov.in',
    status: 'published',
    origin: 'radar',
    dedupeKey: `alert-${district}-earthquake`,
  },
  {
    hazard: 'landslide',
    severity: 'high',
    title: 'Landslide Warning on Slopes',
    message: 'Slope instability detected following intense precipitation.',
    district,
    state: 'Delhi',
    center: offset(-0.02, 0.02),
    radiusKm: 20,
    validUntil: hoursFromNow(20),
    sourceName: 'Geological Survey of India (GSI)',
    sourceUrl: 'https://www.gsi.gov.in',
    status: 'published',
    origin: 'radar',
    dedupeKey: `alert-${district}-landslide`,
  },
  {
    hazard: 'tsunami',
    severity: 'medium',
    title: 'Coastal Surge & Tsunami Watch',
    message: 'Heightened sea levels observed along regional coastlines.',
    district,
    state: 'Delhi',
    center: offset(0.03, 0.02),
    radiusKm: 45,
    validUntil: hoursFromNow(15),
    sourceName: 'INCOIS Tsunami Warning Centre',
    sourceUrl: 'https://tsunami.incois.gov.in',
    status: 'published',
    origin: 'radar',
    dedupeKey: `alert-${district}-tsunami`,
  },
  {
    hazard: 'heatwave',
    severity: 'high',
    title: 'Severe Heatwave Warning',
    message: 'Daytime temperatures exceeding 45°C. Avoid outdoor exposure between 11 AM and 4 PM.',
    district,
    state: 'Delhi',
    center: null,
    radiusKm: null,
    validUntil: hoursFromNow(48),
    sourceName: 'India Meteorological Department (IMD)',
    sourceUrl: 'https://mausam.imd.gov.in',
    status: 'published',
    origin: 'radar',
    dedupeKey: `alert-${district}-heatwave`,
  },
  {
    hazard: 'lightning',
    severity: 'medium',
    title: 'Thunderstorm with Lightning',
    message: 'Thunderstorm activity detected; take shelter indoors.',
    district,
    state: 'Delhi',
    center: offset(0.005, -0.02),
    radiusKm: 20,
    validUntil: hoursFromNow(6),
    sourceName: 'IMD Damini Lightning Alerts',
    sourceUrl: 'https://mausam.imd.gov.in',
    status: 'published',
    origin: 'radar',
    dedupeKey: `alert-${district}-lightning`,
  },
  {
    hazard: 'coldwave',
    severity: 'medium',
    title: 'Expired Cold Wave Bulletin',
    message: 'Temperatures dropped below seasonal average.',
    district,
    state: 'Delhi',
    center: null,
    radiusKm: null,
    validUntil: hoursAgo(12), // Expired!
    sourceName: 'IMD Coldwave Desk',
    sourceUrl: 'https://mausam.imd.gov.in',
    status: 'published',
    origin: 'radar',
    dedupeKey: `alert-${district}-coldwave`,
  },
  {
    hazard: 'forest_fire',
    severity: 'high',
    title: 'Unconfirmed Forest Fire Notice',
    message: 'Media report of blaze on regional ridge area.',
    district,
    state: 'Delhi',
    center: offset(0.04, -0.03),
    radiusKm: 15,
    validUntil: hoursFromNow(24),
    sourceName: 'Local Press News',
    sourceUrl: 'https://dailynews.example.com/fire', // Non-official -> pending
    status: 'pending',
    origin: 'radar',
    dedupeKey: `alert-${district}-forestfire`,
  },
];

// 8 shelters: open, filling, full, closed; includes earthquake suitable
const shelters = [
  {
    name: 'District Community Relief Hall',
    type: 'community hall',
    district,
    address: 'Sector 4, Main Road',
    location: offset(0.004, 0.003),
    capacity: 250,
    occupancy: 50,
    status: 'open',
    facilities: ['drinking water', 'medical kits', 'generator power'],
    suitableFor: ['cyclone', 'flood', 'rain', 'earthquake'],
    contact: '011-23456781',
  },
  {
    name: 'Govt Higher Secondary School Shelter',
    type: 'school',
    district,
    address: 'Near Central Park',
    location: offset(0.008, -0.006),
    capacity: 300,
    occupancy: 245,
    status: 'filling',
    facilities: ['drinking water', 'washrooms', 'kitchen'],
    suitableFor: ['flood', 'cyclone', 'lightning'],
    contact: '011-23456782',
  },
  {
    name: 'Civil Hospital Emergency Complex',
    type: 'hospital',
    district,
    address: 'Hospital Square, Block B',
    location: offset(-0.005, 0.008),
    capacity: 150,
    occupancy: 150,
    status: 'full',
    facilities: ['intensive care', 'trauma unit', 'oxygen supply'],
    suitableFor: ['earthquake', 'heatwave', 'cyclone', 'flood'],
    contact: '011-23456783',
  },
  {
    name: 'Railway Colony Community Center',
    type: 'community hall',
    district,
    address: 'Station Road',
    location: offset(-0.01, -0.005),
    capacity: 200,
    occupancy: 0,
    status: 'closed',
    facilities: ['spacious hall'],
    suitableFor: ['flood', 'rain'],
    contact: '011-23456784',
  },
  {
    name: 'Sports Stadium Assembly Grounds',
    type: 'open assembly point',
    district,
    address: 'Stadium Avenue',
    location: offset(0.012, 0.01),
    capacity: 800,
    occupancy: 120,
    status: 'open',
    facilities: ['open field', 'tents', 'mobile toilets'],
    suitableFor: ['earthquake', 'tsunami'],
    contact: '011-23456785',
  },
  {
    name: 'Municipal Youth Club',
    type: 'community hall',
    district,
    address: 'Ward 12, South Colony',
    location: offset(0.015, -0.012),
    capacity: 180,
    occupancy: 40,
    status: 'open',
    facilities: ['food distribution', 'first aid'],
    suitableFor: ['cyclone', 'flood', 'heatwave'],
    contact: '011-23456786',
  },
  {
    name: 'Red Cross Disaster Relief Center',
    type: 'relief camp',
    district,
    address: 'Ring Road Junction',
    location: offset(-0.018, 0.014),
    capacity: 350,
    occupancy: 285,
    status: 'filling',
    facilities: ['doctor on duty', 'bedding', 'counseling'],
    suitableFor: ['flood', 'cyclone', 'earthquake', 'landslide'],
    contact: '011-23456787',
  },
  {
    name: 'Vocational Training Institute Shelter',
    type: 'institute',
    district,
    address: 'Industrial Area Phase 1',
    location: offset(0.02, 0.018),
    capacity: 220,
    occupancy: 60,
    status: 'open',
    facilities: ['clean water', 'solar battery'],
    suitableFor: ['cyclone', 'rain', 'flood'],
    contact: '011-23456788',
  },
];

// 5 SOS events: exactly 3 within 200m of each other (to trigger cluster detection) + 2 separate
const clusterBase = offset(0.005, 0.005);
const sosEvents = [
  {
    clientId: 'seed-sos-1',
    location: { lat: clusterBase.lat, lng: clusterBase.lng },
    hazard: 'flood',
    peopleCount: 4,
    injured: true,
    note: 'Water rising up to first floor, elderly parents inside',
    status: 'new',
    createdAgoMin: 30,
  },
  {
    clientId: 'seed-sos-2',
    location: { lat: clusterBase.lat + 0.0008, lng: clusterBase.lng + 0.0006 }, // ~100m away
    hazard: 'flood',
    peopleCount: 2,
    injured: false,
    note: 'Stuck on roof, boat rescue needed',
    status: 'new',
    createdAgoMin: 25,
  },
  {
    clientId: 'seed-sos-3',
    location: { lat: clusterBase.lat - 0.0007, lng: clusterBase.lng - 0.0005 }, // ~120m away
    hazard: 'flood',
    peopleCount: 6,
    injured: true,
    note: 'Wall collapsed, 1 child injured',
    status: 'new',
    createdAgoMin: 15,
  },
  {
    clientId: 'seed-sos-4',
    location: offset(-0.012, 0.015), // far away (not in cluster)
    hazard: 'earthquake',
    peopleCount: 3,
    injured: false,
    note: 'Staircase cracked, door jammed',
    status: 'acknowledged',
    createdAgoMin: 60,
  },
  {
    clientId: 'seed-sos-5',
    location: offset(0.018, -0.016), // far away (not in cluster)
    hazard: 'landslide',
    peopleCount: 1,
    injured: false,
    note: 'Mud blocking front entrance',
    status: 'dispatched',
    createdAgoMin: 90,
  },
];

// 6 Photo reports
const reports = [
  {
    clientId: 'seed-rep-1',
    location: offset(0.004, 0.006),
    type: 'flooding',
    hazard: 'flood',
    note: 'Main intersection 3 feet under water',
    aiLabel: 'flood',
    aiConfidence: 0.92,
    aiMode: 'mock',
    status: 'ai_verified',
    hasPhoto: true,
  },
  {
    clientId: 'seed-rep-2',
    location: offset(0.006, 0.004),
    type: 'building_damage',
    hazard: 'earthquake',
    note: 'Commercial complex pillar cracked',
    aiLabel: 'building_damage',
    aiConfidence: 0.88,
    aiMode: 'mock',
    status: 'ai_verified',
    hasPhoto: true,
  },
  {
    clientId: 'seed-rep-3',
    location: offset(-0.008, 0.012),
    type: 'road_blocked',
    hazard: 'rain',
    note: 'Uprooted banyan tree blocking bus route',
    aiLabel: 'road_blocked',
    aiConfidence: 0.84,
    aiMode: 'mock',
    status: 'ai_verified',
    hasPhoto: true,
  },
  {
    clientId: 'seed-rep-4',
    location: offset(-0.015, -0.01),
    type: 'landslide',
    hazard: 'landslide',
    note: 'Hill cut debris on highway',
    aiLabel: 'landslide',
    aiConfidence: 0.79,
    aiMode: 'mock',
    status: 'ai_verified',
    hasPhoto: true,
  },
  {
    clientId: 'seed-rep-5',
    location: offset(0.014, -0.018),
    type: 'fire',
    hazard: 'forest_fire',
    note: 'Dry grass smoke near outskirts',
    aiLabel: 'smoke',
    aiConfidence: 0.65, // Below 0.70 threshold -> needs_review
    aiMode: 'mock',
    status: 'needs_review',
    hasPhoto: true,
  },
  {
    clientId: 'seed-rep-6',
    location: offset(0.02, 0.015),
    type: 'flooding',
    hazard: 'flood',
    note: 'Storm water drain overflowing',
    aiLabel: 'flood',
    aiConfidence: 0.95,
    aiMode: 'mock',
    status: 'verified', // Officer manually verified
    hasPhoto: true,
  },
];

// 3 SMS logs
const smsLogs = [
  { toPhone: 'control-room', body: `SOS seed-sos-1 @ ${clusterBase.lat},${clusterBase.lng}`, mode: 'mock' },
  { toPhone: 'control-room', body: `SOS seed-sos-2 @ ${clusterBase.lat},${clusterBase.lng}`, mode: 'mock' },
  { toPhone: 'control-room', body: `ALERT: Cyclone warning issued for ${district}`, mode: 'mock' },
];

const seedPayload = { district, center: { lat: centerLat, lng: centerLng }, users, alerts, shelters, sosEvents, reports, smsLogs };

const outPath = path.join(__dirname, 'seed-data.json');
fs.writeFileSync(outPath, JSON.stringify(seedPayload, null, 2), 'utf8');

console.log(
  `Seed written for ${district} (${centerLat}, ${centerLng}) / alerts ${alerts.length} | shelters ${shelters.length} | sos ${sosEvents.length} | reports ${reports.length} | users ${users.length} | sms ${smsLogs.length}`
);

