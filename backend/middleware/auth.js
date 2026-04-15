const jwt = require('jsonwebtoken');

/**
 * Express middleware that:
 *  1. Reads the JWT from the `Authorization: Bearer <token>` header
 *  2. Verifies it with JWT_SECRET
 *  3. Attaches decoded payload to req.admin
 *  4. Returns 401 on missing / invalid / expired tokens
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorisation required. Please log in.' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // { id, username, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please log in again.' });
  }
}

module.exports = authMiddleware;
