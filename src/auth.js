const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

function requireJwtSecret() {
  if (!SECRET || SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return SECRET;
}

function getDistrictScope(user) {
  if (!user || user.role !== 'authority') return null;
  return user.district_scope || user.district || null;
}

function requireDistrictScope(req, res, next) {
  if (!getDistrictScope(req.user)) {
    return res.status(403).json({ error: 'Authority account must have an assigned district scope' });
  }
  next();
}

function sign(user) {
  const secret = requireJwtSecret();
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      district: user.district_scope || user.home_district || null,
      district_scope: user.role === 'authority' ? user.district_scope || null : null,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function readToken(req) {
  if (!SECRET || SECRET.length < 32) return null;
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), SECRET); } catch { return null; }
}

// Attaches req.user if a valid token is present; never blocks.
function optionalAuth(req, _res, next) { req.user = readToken(req); next(); }

function requireAuth(req, res, next) {
  const u = readToken(req);
  if (!u) return res.status(401).json({ error: 'login required' });
  req.user = u;
  next();
}

const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) return res.status(403).json({ error: `${role} role required` });
  next();
};

module.exports = { sign, optionalAuth, requireAuth, requireRole, getDistrictScope, requireDistrictScope, requireJwtSecret };
