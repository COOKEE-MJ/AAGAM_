const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function sign(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, district: user.district_scope || user.home_district || null },
    SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function readToken(req) {
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

module.exports = { sign, optionalAuth, requireAuth, requireRole };
