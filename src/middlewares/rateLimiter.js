const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// Global rate limiter (Based on client IP)
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: `Rate limit exceeded. Please wait before making more requests. Maximum ${config.rateLimit.max} requests per minute.`
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use IP address as key
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

// Per-phone rate limiter (Protects users from spam prompts)
const phoneRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 3, // 3 requests per phone number per minute
  keyGenerator: (req) => {
    // Use the single phoneNumber from req.body as the identifier, fall back to IP if absent
    return req.body.phoneNumber || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many STK Push requests triggered for this phone number. Please wait a minute before trying again.'
    });
  }
});

module.exports = {
  globalLimiter,
  phoneRateLimiter
};
