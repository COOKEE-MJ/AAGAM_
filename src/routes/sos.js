const router = require('express').Router();
const { query } = require('../db');
const { optionalAuth, requireAuth, requireRole } = require('../auth');
const { createSos, listSos, httpErr, sosSelect } = require('../services');

// Allowed officer state transitions. Citizens may only cancel their own SOS.
const NEXT = {
  new: ['acknowledged', 'dispatched', 'resolved', 'duplicate'],
  acknowledged: ['dispatched', 'resolved', 'duplicate'],
  dispatched: ['resolved'],
  resolved: [],
  cancelled: [],
  duplicate: [],
};

// In-memory rate limiter: max 10 SOS triggers per minute per IP/user
const sosLimits = new Map();
function checkSosRateLimit(key) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;
  const history = sosLimits.get(key) || [];
  const recent = history.filter((t) => now - t < windowMs);
  if (recent.length >= maxRequests) {
    throw httpErr(429, 'SOS trigger rate limit reached. Please wait a moment before re-submitting.');
  }
  recent.push(now);
  sosLimits.set(key, recent);
}

// Audit logging helper
async function audit(req, action, targetId, detail) {
  try {
    await query(
      'INSERT INTO audit_log (actor_id, actor_role, action, target_type, target_id, detail) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user?.sub || null, req.user?.role || null, action, 'sos', String(targetId), JSON.stringify(detail || {})]
    );
  } catch (e) {
    console.error('audit log error:', e.message);
  }
}

// POST /api/sos/trigger (Idempotent SOS distress trigger with rate limiting & retention)
router.post('/trigger', optionalAuth, async (req, res, next) => {
  try {
    const guestOk = String(process.env.ALLOW_GUEST_SOS ?? 'true') === 'true';
    if (!req.user && !guestOk) throw httpErr(401, 'Login required to send SOS');

    const rateKey = req.user?.sub || req.ip || 'guest';
    checkSosRateLimit(rateKey);

    const { created, sos } = await createSos(req.body || {}, req.user);

    // Apply 90-day privacy retention policy on creation
    if (created && sos.id) {
      await query(`UPDATE sos_events SET retention_expires_at = now() + interval '90 days' WHERE id = $1`, [sos.id]);
    }

    res.status(created ? 201 : 200).json({ duplicate: !created, sos });
  } catch (e) {
    next(e);
  }
});

// GET /api/sos (Authority queue restricted to designated district scope)
router.get('/', requireAuth, requireRole('authority'), async (req, res, next) => {
  try {
    const { status } = req.query;
    let sos = await listSos({ status });

    // Enforce district scope for authority officers
    if (req.user?.district_scope) {
      const scopeCheck = await query(
        `SELECT ST_Y(center::geometry) AS lat, ST_X(center::geometry) AS lng FROM alerts WHERE district = $1 AND center IS NOT NULL LIMIT 1`,
        [req.user.district_scope]
      );
      if (scopeCheck.rowCount) {
        const { lat: dLat, lng: dLng } = scopeCheck.rows[0];
        // Filter in-memory using distance calculation (50km district radius)
        sos = sos.filter((item) => {
          if (!item.lat || !item.lng) return true;
          const d = Math.hypot(item.lat - dLat, item.lng - dLng) * 111; // ~km
          return d <= 60;
        });
      }
    }

    res.json({ sos });
  } catch (e) {
    next(e);
  }
});

// GET /api/sos/mine (Citizen views their own distress calls only)
router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const sos = await listSos({ userId: req.user.sub });
    res.json({ sos });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/sos/:id (Officer updates lifecycle or Citizen cancels own SOS)
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const cur = await query('SELECT id, status, user_id, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng FROM sos_events WHERE id = $1', [req.params.id]);
    if (!cur.rowCount) throw httpErr(404, 'SOS event not found');
    const row = cur.rows[0];
    const b = req.body || {};

    if (req.user.role === 'citizen') {
      if (row.user_id !== req.user.sub) throw httpErr(403, 'Not your SOS event');
      const sets = [];
      const p = [];
      if (b.status === 'cancelled') {
        if (['resolved', 'cancelled'].includes(row.status)) throw httpErr(409, 'SOS event is already closed');
        p.push('cancelled');
        sets.push(`status = $${p.length}`);
      } else if (b.status) {
        throw httpErr(403, 'Citizens can only cancel their SOS');
      }

      for (const [k, col] of [['peopleCount', 'people_count'], ['injured', 'injured'], ['note', 'note']]) {
        if (b[k] !== undefined) {
          p.push(b[k]);
          sets.push(`${col} = $${p.length}`);
        }
      }
      if (!sets.length) throw httpErr(400, 'Nothing to update');
      p.push(row.id);
      await query(`UPDATE sos_events SET ${sets.join(', ')}, updated_at = now() WHERE id = $${p.length}`, p);
      await audit(req, 'sos.cancel', row.id, { by: 'citizen' });
    } else {
      // Officer role: enforce district scope
      if (req.user.district_scope) {
        const scopeAlert = await query(
          `SELECT center FROM alerts WHERE district = $1 AND center IS NOT NULL LIMIT 1`,
          [req.user.district_scope]
        );
        if (scopeAlert.rowCount) {
          const within = await query(
            `SELECT ST_DWithin(location, $1::geography, 60000) AS in_scope FROM sos_events WHERE id = $2`,
            [scopeAlert.rows[0].center, row.id]
          );
          if (within.rows[0]?.in_scope === false) {
            throw httpErr(403, `You are only authorized for SOS events in district: ${req.user.district_scope}`);
          }
        }
      }

      if (!b.status) throw httpErr(400, 'status required');
      if (!(NEXT[row.status] || []).includes(b.status)) {
        throw httpErr(409, `Invalid status transition: cannot change from ${row.status} to ${b.status}`);
      }

      await query(
        `UPDATE sos_events SET status = $1, handled_by = $2, dispatch_note = COALESCE($3, dispatch_note), updated_at = now() WHERE id = $4`,
        [b.status, req.user.sub, b.dispatchNote ?? null, row.id]
      );
      await audit(req, `sos.${b.status}`, row.id, { status: b.status, dispatchNote: b.dispatchNote });
    }

    res.json({ sos: (await query(`${sosSelect} WHERE s.id = $1`, [row.id])).rows[0] });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
