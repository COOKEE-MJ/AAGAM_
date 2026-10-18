// PURE business rules — no database calls, no HTTP. Unit-tested in tests/rules.test.mjs.
// These are the three rules that matter most for the demo.

const REPORT_TYPES = ['flooding', 'building_damage', 'road_blocked', 'landslide', 'fire', 'other'];

// Which AI labels confirm each report type. Keep in sync with M3's model label list.
const TYPE_LABELS = {
  flooding:        ['flood', 'flooding', 'water'],
  building_damage: ['building_damage', 'collapsed_building', 'earthquake_damage', 'structural_damage'],
  road_blocked:    ['road_blocked', 'road_damage', 'debris'],
  landslide:       ['landslide', 'debris', 'mudslide'],
  fire:            ['fire', 'smoke', 'burning'],
  other:           [],
};

/**
 * PHOTO RULE (70%):
 * Returns 'ai_verified' when the AI confidence is 70% or above AND the label matches the report type.
 * Returns 'needs_review' for everything else — an officer will check it manually.
 */
function decideAiStatus({ type, label, confidence }) {
  const threshold = Number(process.env.AI_THRESHOLD || 0.7);
  const matches = (TYPE_LABELS[type] || []).includes(label);
  const ok = label && confidence != null && confidence >= threshold && matches;
  return ok ? 'ai_verified' : 'needs_review';
}

/**
 * SHELTER AUTO-STATUS:
 * Below 80% full → open
 * 80% to 99% full → filling
 * 100% or above → full
 * Officers can still manually set it to 'closed'.
 */
function shelterAutoStatus(capacity, occupancy) {
  if (capacity <= 0) return 'full';
  const ratio = occupancy / capacity;
  return ratio >= 1 ? 'full' : ratio >= 0.8 ? 'filling' : 'open';
}

/**
 * ALERT INGEST RULE:
 * Radar alerts from official Indian government sites (.gov.in or .nic.in) are published immediately.
 * Alerts from any other source are saved as 'pending' until an officer approves them.
 */
function isOfficialSource(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith('.gov.in') || host.endsWith('.nic.in') || host === 'gov.in' || host === 'nic.in';
  } catch {
    return false;
  }
}

/**
 * SOS LIFECYCLE:
 * new → acknowledged → dispatched → resolved
 * Officers can also mark any open SOS as 'duplicate'.
 * Citizens can only 'cancel' their own SOS.
 */
const SOS_TRANSITIONS = {
  new:          ['acknowledged', 'dispatched', 'resolved', 'duplicate'],
  acknowledged: ['dispatched', 'resolved', 'duplicate'],
  dispatched:   ['resolved'],
  resolved:     [],
  cancelled:    [],
  duplicate:    [],
};

function canTransition(from, to) {
  return (SOS_TRANSITIONS[from] || []).includes(to);
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function markClusters(items, radiusMeters = 500) {
  return items.map((item, idx) => {
    if (item.lat == null || item.lng == null) return { ...item, isCluster: false };
    const nearby = items.filter((other, oIdx) => {
      if (idx === oIdx || other.lat == null || other.lng == null) return false;
      return distanceMeters(item.lat, item.lng, other.lat, other.lng) <= radiusMeters;
    });
    return { ...item, isCluster: nearby.length >= 2 };
  });
}

function toGridCell(lat, lng, cellSize = 0.05) {
  const snapLat = Math.floor(lat / cellSize) * cellSize;
  const snapLng = Math.floor(lng / cellSize) * cellSize;
  return { lat: Number(snapLat.toFixed(4)), lng: Number(snapLng.toFixed(4)) };
}

module.exports = {
  REPORT_TYPES,
  TYPE_LABELS,
  decideAiStatus,
  shelterAutoStatus,
  isOfficialSource,
  SOS_TRANSITIONS,
  canTransition,
  distanceMeters,
  markClusters,
  toGridCell
};

