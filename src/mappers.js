// Converts database rows (snake_case) into clean JSON (camelCase) for the API responses.
// Routes call these functions before sending data to the phone app or dashboard.

function mapUser(row) {
  return {
    id: row.id,
    role: row.role,
    name: row.name,
    phone: row.phone,
    homeDistrict: row.home_district,
    homeState: row.home_state,
    districtScope: row.district_scope,
  };
}

function mapAlert(row) {
  return {
    id: row.id,
    hazard: row.hazard,
    hazardLabel: row.hazard_label,
    advice: row.advice,
    agency: row.agency,
    severity: row.severity,
    title: row.title,
    message: row.message,
    district: row.district,
    state: row.state,
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    radiusKm: row.radius_km != null ? Number(row.radius_km) : null,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    fetchedAt: row.fetched_at,
    origin: row.origin,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function mapShelter(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    district: row.district,
    address: row.address,
    lat: Number(row.lat),
    lng: Number(row.lng),
    capacity: row.capacity,
    occupancy: row.occupancy,
    status: row.status,
    facilities: row.facilities,
    suitableFor: row.suitable_for,
    contact: row.contact,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    distanceKm: row.distance_km != null ? Number(row.distance_km) : null,
    updatedAt: row.updated_at,
  };
}

function mapSos(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    status: row.status,
    hazard: row.hazard,
    lat: Number(row.lat),
    lng: Number(row.lng),
    peopleCount: row.people_count,
    injured: row.injured,
    note: row.note,
    createdOnPhoneAt: row.created_on_phone_at,
    receivedAt: row.received_at,
    dispatchNote: row.dispatch_note,
    phone: row.phone,
    citizenName: row.citizen_name,
  };
}

function mapReport(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    type: row.type,
    hazard: row.hazard,
    note: row.note,
    status: row.status,
    aiLabel: row.ai_label,
    aiConfidence: row.ai_confidence != null ? Number(row.ai_confidence) : null,
    aiMode: row.ai_mode,
    rejectReason: row.reject_reason,
    lat: Number(row.lat),
    lng: Number(row.lng),
    createdAt: row.created_at,
    hasPhoto: row.has_photo,
  };
}

module.exports = { mapUser, mapAlert, mapShelter, mapSos, mapReport };

