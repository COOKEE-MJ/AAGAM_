const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { sign, requireAuth } = require('../auth');
const { httpErr } = require('../services/incidents');

const publicUser = (u) => ({ id: u.id, role: u.role, name: u.name, phone: u.phone, homeDistrict: u.home_district, homeState: u.home_state, districtScope: u.district_scope });

// POST /api/auth/signup  (citizens only; officers are created by scripts/seed.js or an admin SQL insert)
// OTP is MOCKED: no SMS is sent and no OTP is checked. Say so in the README.
router.post('/signup', async (req, res, next) => {
  try {
    const { name, phone, password, homeDistrict = null, homeState = null } = req.body || {};
    if (!name || !phone || !password) throw httpErr(400, 'name, phone and password required');
    if (String(password).length < 6) throw httpErr(400, 'password must be at least 6 characters');
    const hash = await bcrypt.hash(String(password), 10);
    const r = await query(
      `INSERT INTO users (role, name, phone, password_hash, home_district, home_state)
       VALUES ('citizen',$1,$2,$3,$4,$5) ON CONFLICT (phone) DO NOTHING RETURNING *`,
      [name, phone, hash, homeDistrict, homeState]
    );
    if (!r.rowCount) throw httpErr(409, 'phone already registered, log in instead');
    res.status(201).json({ token: sign(r.rows[0]), user: publicUser(r.rows[0]) });
  } catch (e) { next(e); }
});

// POST /api/auth/login  (citizens and officers - accepts phone or email)
router.post('/login', async (req, res, next) => {
  try {
    const { phone, email, password } = req.body || {};
    const identifier = phone || email;
    if (!identifier || !password) throw httpErr(400, 'phone or email, and password required');
    const r = await query('SELECT * FROM users WHERE phone = $1 OR email = $1', [String(identifier)]);
    const u = r.rows[0];
    if (!u || !(await bcrypt.compare(String(password), u.password_hash))) throw httpErr(401, 'wrong credentials');
    res.json({ token: sign(u), user: publicUser(u) });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM users WHERE id = $1', [req.user.sub]);
    if (!r.rowCount) throw httpErr(404, 'user not found');
    res.json({ user: publicUser(r.rows[0]) });
  } catch (e) { next(e); }
});

module.exports = router;
