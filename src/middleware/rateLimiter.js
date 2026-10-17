/**
 * Lightweight In-Memory Sliding Window Rate Limiter Middleware
 * Protects public endpoints from brute-force attacks and volumetric spam.
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const max = options.max || 60; // 60 requests per window
  const message = options.message || 'Too many requests, please try again later.';

  const clients = new Map();

  // Periodic cleanup of stale buckets every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of clients.entries()) {
      if (now - data.resetTime > windowMs) {
        clients.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupInterval.unref) {
    cleanupInterval.unref(); // Ensure process can exit cleanly
  }

  return function rateLimiter(req, res, next) {
    const key = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let record = clients.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      clients.set(key, record);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      return next();
    }

    record.count += 1;
    const remaining = Math.max(0, max - record.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (record.count > max) {
      return res.status(429).json({
        error: {
          message,
          statusCode: 429,
          retryAfterMs: record.resetTime - now
        }
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter
};
