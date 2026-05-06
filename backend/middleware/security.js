// ═══════════════════════════════════════════════════════════════
// UACS — Security Middleware
// Rate limiting, input sanitization, payload guards
// ═══════════════════════════════════════════════════════════════

import rateLimit from 'express-rate-limit';
import helmet   from 'helmet';
import { body, param, query, validationResult } from 'express-validator';

// ─── Generic rate-limit formatter ────────────────────────────────
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    error:   'Too many requests. Please try again later.',
    code:    'RATE_LIMITED',
    retryAfter: Math.ceil(req.rateLimit?.resetTime
      ? (req.rateLimit.resetTime - Date.now()) / 1000
      : 900),
  });
};

// ─── 1. Auth limiter — 5 attempts / 15 min per IP ────────────────
export const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              5,
  standardHeaders:  true,
  legacyHeaders:    false,
  skipSuccessfulRequests: true,      // only count failures
  handler:          rateLimitHandler,
  keyGenerator:     (req) => req.ip,
});

// ─── 2. OTP limiter — 3 sends / 15 min per IP ────────────────────
export const otpLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              3,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
});

// ─── 3. General API limiter — 120 req / 1 min per IP ─────────────
export const apiLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              120,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
});

// ─── 4. CGA verify limiter — 20 verifications / 5 min per IP ─────
export const cgaLimiter = rateLimit({
  windowMs:         5 * 60 * 1000,
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
});

// ─── 5. Dispatch limiter — 10 dispatches / 5 min (admin) ─────────
export const dispatchLimiter = rateLimit({
  windowMs:         5 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
});

// ─── Input sanitizer: strip null bytes, trim, truncate ───────────
export function sanitizeString(value, maxLen = 1000) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\0/g, '')            // null bytes
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .trim()
    .substring(0, maxLen);
}

// ─── Middleware: sanitize req.body strings recursively ───────────
export function sanitizeBody(maxDepth = 4) {
  return (req, _res, next) => {
    const sanitize = (obj, depth) => {
      if (depth > maxDepth || obj === null || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key], depth + 1);
        }
      }
    };
    if (req.body) sanitize(req.body, 0);
    next();
  };
}

// ─── Middleware: validate & return errors ─────────────────────────
export function validate(rules) {
  return async (req, res, next) => {
    await Promise.all(rules.map(r => r.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        error:  'Validation failed',
        details: errors.array().map(e => ({ field: e.path, msg: e.msg })),
      });
    }
    next();
  };
}

// ─── Reusable validation rule sets ────────────────────────────────
export const rules = {
  login: [
    body('phone')
      .notEmpty().withMessage('Phone is required')
      .isLength({ max: 15 }).withMessage('Phone too long')
      .matches(/^[0-9\s\-+()]+$/).withMessage('Invalid phone format'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 1, max: 128 }).withMessage('Password too long'),
  ],

  register: [
    body('name')
      .trim().notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters')
      .matches(/^[a-zA-Z\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0900-\u097F .'"\-]+$/)
      .withMessage('Name contains invalid characters'),
    body('phone')
      .notEmpty().withMessage('Phone is required')
      .isLength({ max: 15 }).withMessage('Phone too long')
      .matches(/^[0-9\s\-+()]+$/).withMessage('Invalid phone format'),
    body('password')
      .isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters'),
    body('location')
      .optional().isLength({ max: 200 }).withMessage('Location too long'),
    body('latitude')
      .optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude')
      .optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('language')
      .optional().isIn(['en', 'hi', 'mr', 'ta', 'te']).withMessage('Unsupported language'),
  ],

  message: [
    body('title')
      .optional().isLength({ max: 200 }).withMessage('Title too long'),
    body('master_content')
      .notEmpty().withMessage('Content is required')
      .isLength({ max: 5000 }).withMessage('Content too long (max 5000 chars)'),
    body('urgency')
      .optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid urgency level'),
    body('target_zone')
      .optional().isLength({ max: 200 }).withMessage('Zone too long'),
  ],

  cgaVerify: [
    body('claim_text')
      .optional().isLength({ max: 10000 }).withMessage('Claim text too long (max 10000 chars)'),
    body('input_url')
      .optional().isURL().withMessage('Invalid URL format'),
  ],

  idParam: [
    param('id')
      .isInt({ min: 1 }).withMessage('Invalid ID parameter'),
  ],
};

// ─── Helmet security headers preset ──────────────────────────────
export const helmetConfig = helmet({
  contentSecurityPolicy: false, // managed by Vercel/nginx in prod
  crossOriginEmbedderPolicy: false,
});
