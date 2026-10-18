const router = require('express').Router();
const { query } = require('../db');
const { optionalAuth, requireAuth, requireRole } = require('../auth');
const { createReport, httpErr, reportSelect, REPORT_TYPES } = require('../services');

// In-memory sliding window rate limiter: max 15 reports per 10 minutes per IP/user
const reportLimits = new Map();
function checkReportRateLimit(key) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 15;
  const userHistory = reportLimits.get(key) || [];
  const recent = userHistory.filter((t) => now - t < windowMs);
  if (recent.length >= maxRequests) {
    throw httpErr(429, 'Rate limit exceeded: maximum 15 reports per 10 minutes. Please try again later.');
  }
  recent.push(now);
  reportLimits.set(key, recent);
}

// Validates photo MIME type and size (max 500 KB ~ 700,000 base64 chars)
function validatePhoto(photoData) {
  if (!photoData) return;
  if (typeof photoData !== 'string') {
    throw httpErr(400, 'photoData must be a valid base64 data URL string');
  }
  // Enforce image MIME types: jpeg, png, webp
  const mimeMatch = photoData.match(/^data:(image\/(jpeg|png|webp));base64,/i);
  if (!mimeMatch) {
    throw httpErr(400, 'Invalid photo format. Only image/jpeg, image/png, and image/webp data URLs are allowed');
  }
  // Max size limit: 500 KB (approx 685,000 base64 chars)
  if (photoData.length > 700000) {
    throw httpErr(413, 'Photo exceeds maximum size of 500 KB. Please compress photo on device before upload');
  }
}

// Searches for existing reports within 500m and 2 hours of the same category
async function findPossibleDuplicate(lat, lng, type) {
  try {
    const q = await query(
      `SELECT id FROM reports
       WHERE type = $1
         AND ST_DWithin(location, ST_MakePoint($3, $2)::geography, 500)
         AND created_at >= (now() - interval '2 hours')
       ORDER BY created_at ASC LIMIT 1`,
      [type, Number(lat), Number(lng)]
    );
    return q.rows[0]?.id || null;
  } catch {
    return null;
  }
}

// Audit logging helper
async function audit(req, action, targetId, detail) {
  try {
    await query(
      'INSERT INTO audit_log (actor_id, actor_role, action, target_type, target_id, detail) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user?.sub || null, req.user?.role || null, action, 'report', String(targetId), JSON.stringify(detail || {})]
    );
  } catch (e) {
    console.error('audit log error:', e.message);
  }
}

// Extended SQL select with provenance and review fields
const fullReportSelect = `SELECT r.id, r.client_id AS "clientId", r.type, r.hazard, r.note, r.status,
  r.ai_label AS "aiLabel", r.ai_confidence AS "aiConfidence", r.ai_mode AS "aiMode",
  r.reject_reason AS "rejectReason", r.officer_notes AS "officerNotes",
  r.possible_duplicate_of AS "possibleDuplicateOf",
  ST_Y(r.location::geometry) AS lat, ST_X(r.location::geometry) AS lng,
  r.created_at AS "createdAt", r.updated_at AS "updatedAt",
  r.retention_expires_at AS "retentionExpiresAt",
  (r.photo_data IS NOT NULL) AS "hasPhoto"
  FROM reports r`;

// POST /api/reports (Submit crowdsourced incident report with photo triage)
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const guestOk = String(process.env.ALLOW_GUEST_SOS ?? 'true') === 'true';
    if (!req.user && !guestOk) throw httpErr(401, 'Login required to submit an incident report');

    const rateKey = req.user?.sub || req.ip || 'guest';
    checkReportRateLimit(rateKey);

    const b = req.body || {};
    validatePhoto(b.photoData);

    // Check for clustering / duplicate incidents within 500m in the last 2 hours
    const duplicateId = await findPossibleDuplicate(b.lat, b.lng, b.type);

    const { created, report } = await createReport(b, req.user);

    // If duplicate was flagged, attach to report
    if (created && duplicateId) {
      await query(
        `UPDATE reports SET possible_duplicate_of = $1, retention_expires_at = now() + interval '30 days' WHERE id = $2`,
        [duplicateId, report.id]
      );
      report.possibleDuplicateOf = duplicateId;
    }

    res.status(created ? 201 : 200).json({ duplicate: !created, report });
  } catch (e) {
    next(e);
  }
});

// GET /api/reports (Authority queue filtered by status & officer district scope)
router.get('/', requireAuth, requireRole('authority'), async (req, res, next) => {
  try {
    const { status = 'needs_review' } = req.query;
    const p = [];
    const where = [];
    const add = (v) => { p.push(v); return '$' + p.length; };

    if (status !== 'all') {
      where.push(`r.status = ${add(status)}`);
    }

    // Enforce officer district scope if assigned
    if (req.user?.district_scope) {
      where.push(`ST_DWithin(r.location, (SELECT center FROM alerts WHERE district = ${add(req.user.district_scope)} AND center IS NOT NULL LIMIT 1), 50000)`);
    }

    const sql = `${fullReportSelect} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY r.created_at DESC LIMIT 200`;
    res.json({ reports: (await query(sql, p)).rows });
  } catch (e) {
    next(e);
  }
});

// GET /api/reports/mine (Citizen's own report history)
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    res.json({ reports: (await query(`${fullReportSelect} WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 50`, [req.user.sub])).rows });
  } catch (e) {
    next(e);
  }
});

// GET /api/reports/:id/photo (Authorized photo inspection)
router.get('/:id/photo', requireAuth, requireRole('authority'), async (req, res, next) => {
  try {
    const r = await query('SELECT photo_data FROM reports WHERE id = $1', [req.params.id]);
    if (!r.rowCount || !r.rows[0].photo_data) throw httpErr(404, 'No photo attached to this report');
    res.json({ photoData: r.rows[0].photo_data });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/reports/:id (Officer approves, rejects, or requests more information)
router.patch('/:id', requireAuth, requireRole('authority'), async (req, res, next) => {
  try {
    const { status, rejectReason = null, officerNotes = null } = req.body || {};
    const allowed = ['verified', 'rejected', 'needs_more_info'];
    if (!allowed.includes(status)) {
      throw httpErr(400, "status must be 'verified', 'rejected', or 'needs_more_info'");
    }
    if (status === 'rejected' && !rejectReason) {
      throw httpErr(400, 'rejectReason required (e.g. unrelated, duplicate, unclear)');
    }
    if (status === 'needs_more_info' && !officerNotes) {
      throw httpErr(400, 'officerNotes required when requesting more information');
    }

    const r = await query(
      `UPDATE reports
       SET status = $1, reject_reason = $2, officer_notes = $3, reviewed_by = $4, reviewed_at = now(), updated_at = now()
       WHERE id = $5
       RETURNING id`,
      [status, status === 'rejected' ? rejectReason : null, officerNotes || null, req.user.sub, req.params.id]
    );

    if (!r.rowCount) throw httpErr(404, 'Report not found');

    await audit(req, `report.${status}`, req.params.id, { status, rejectReason, officerNotes });

    const updated = (await query(`${fullReportSelect} WHERE r.id = $1`, [req.params.id])).rows[0];
    res.json({ report: updated });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
