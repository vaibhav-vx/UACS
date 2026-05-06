// ═══════════════════════════════════════
// UACS Auth Routes — Login / Register / Logout / Me
// FIXED: Real zone detection, no hardcoded zones
// ═══════════════════════════════════════

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { dbGetOne, dbUpdate, dbInsert, dbSelect, getSupabase } from '../database/db.js';
import { detectZone, detectZoneFromLocation } from '../utils/zoneMapper.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';

// Twilio Client
import twilio from 'twilio';
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// OTP Cache (In-Memory for single-server stability)
const OTP_STORE = new Map();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// ─── POST /api/auth/login ───────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password)
      return res.status(400).json({ error: 'Mobile number and password are required' });

    const normalizedPhone = phone.trim().replace(/\s+/g, '');
    let user = null;

    // Direct match for special user credentials using environment variables
    const adminPhone = process.env.ADMIN_PHONE;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminPhone && adminPassword && normalizedPhone === adminPhone) {
      if (password === adminPassword) {
        // Admin Profile
        user = await dbGetOne('users', { email: `${adminPhone}_admin` });
        if (!user) {
          user = await dbInsert('users', {
            name: 'Vai Admin',
            email: `${adminPhone}_admin`,
            password: bcrypt.hashSync(adminPassword, 10),
            role: 'admin',
            location: 'Mumbai',
            zone: 'Mumbai',
            language: 'en'
          });
        }
      }
    }

    // Fallback to standard login
    if (!user) {
      user = await dbGetOne('users', { email: normalizedPhone });
      if (!user) return res.status(401).json({ error: 'Invalid mobile or password' });

      const validPassword = bcrypt.compareSync(password, user.password);
      if (!validPassword) return res.status(401).json({ error: 'Invalid mobile or password' });
    }

    // Re-detect zone from location if missing or stale
    let userZone = user.zone;
    let userCity = null;
    if (!userZone || userZone === 'General' || userZone === 'Field Ops') {
      const detected = detectZone(user.location, user.lat, user.lng);
      userZone = detected.fullZone;
      userCity = detected.city;
      await dbUpdate('users', user.id, { zone: userZone });
    } else {
      // Extract city from existing zone string
      const cityMatch = userZone.match(/—\s*(.*)/);
      userCity = cityMatch ? cityMatch[1] : userZone;
    }

    // Update last_login
    await dbUpdate('users', user.id, { last_login: new Date().toISOString() });

    const token = jwt.sign(
      { id: user.id, phone: user.email, role: user.role, jti: uuidv4() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log(`[UACS AUTH] User "${user.name}" (${user.role}) logged in — Zone: ${userZone}`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.email.replace(/_(admin|user)$/, ''),
        role: user.role,
        location: user.location,
        zone: userZone,
        city: userCity,
        language: user.language || 'en',
        lat: user.lat,
        lng: user.lng,
      },
    });
  } catch (err) {
    console.error('[UACS AUTH] Login error:', err.message);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ─── POST /api/auth/logout ─────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token);
      if (decoded && decoded.jti && decoded.exp) {
        const sb = getSupabase();
        await sb.from('token_blocklist').insert({
          jti: decoded.jti,
          expires_at: new Date(decoded.exp * 1000).toISOString()
        });
      }
    }
    console.log(`[UACS AUTH] User ${req.user?.name || 'Unknown'} logged out (token revoked)`);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('[UACS AUTH] Logout error:', err.message);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

// ─── POST /api/auth/demo ───────────────────────────────
router.post('/demo', async (req, res) => {
  try {
    const demoEmail = '00000 00000'; // We use email column for phone
    let demoUser = await dbGetOne('users', { email: demoEmail });

    if (!demoUser) {
      // Create demo user if it doesn't exist
      const hash = bcrypt.hashSync('demo1234', 10);
      demoUser = await dbInsert('users', {
        name: 'Demo User',
        email: demoEmail,
        password: hash,
        role: 'user',
        location: 'Mumbai',
        zone: 'Zone 2 — Mumbai',
        language: 'en',
      });
      console.log('[UACS AUTH] Created new Demo User');
    }

    const detected = detectZone(demoUser.location, demoUser.lat, demoUser.lng);

    const token = jwt.sign(
      { id: demoUser.id, phone: demoUser.email, role: demoUser.role, jti: uuidv4() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log(`[UACS AUTH] Demo User logged in`);

    res.json({
      token,
      user: {
        id: demoUser.id,
        name: demoUser.name,
        phone: demoUser.email,
        role: demoUser.role,
        location: demoUser.location,
        zone: demoUser.zone || detected.fullZone,
        city: detected.city,
        language: demoUser.language || 'en',
      },
    });
  } catch (err) {
    console.error('[UACS AUTH] Demo login error:', err.message);
    res.status(500).json({ error: 'Server error during demo login' });
  }
});

// ─── POST /api/auth/otp/send ─────────────────────────────
router.post('/otp/send', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Mobile number is required' });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + OTP_EXPIRY_MS;

    // Save to cache
    OTP_STORE.set(phone, { code, expiry });

    // Format phone for Twilio (+91 followed by digits only)
    const twilioPhone = '+91' + phone.replace(/\D/g, '');

    // Send via Twilio
    await twilioClient.messages.create({
      body: `Your UACS registration code is: ${code}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: twilioPhone,
    });

    console.log(`[UACS OTP] Code ${code} sent to ${phone}`);
    res.json({ success: true, message: 'Verification code sent' });
  } catch (err) {
    console.error('[UACS OTP] Send error:', err.message);
    res.status(500).json({ error: 'Failed to send SMS. Please check the mobile number format.' });
  }
});

// ─── POST /api/auth/register ────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, location, latitude, longitude, language } = req.body;

    if (!name?.trim() || !phone?.trim() || !password)
      return res.status(400).json({ error: 'Name, mobile number, and password are required' });

    if (name.trim().length < 2)
      return res.status(400).json({ error: 'Name must be at least 2 characters' });

    const normalizedPhone = phone.trim().replace(/\s+/g, '');

    // Extract digits only for validation
    const digitsOnly = normalizedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10)
      return res.status(400).json({ error: 'Valid 10-digit mobile number is required' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // Check phone not already taken (using email column)
    const existing = await dbGetOne('users', { email: normalizedPhone });
    if (existing)
      return res.status(409).json({ error: 'This number is already registered. Please login.' });

    // Hash password and detect zone
    const hash = bcrypt.hashSync(password, 10);
    const detected = detectZone(location, latitude, longitude);

    const newUser = await dbInsert('users', {
      name:       name.trim(),
      email:      normalizedPhone, // Use email column to store phone
      password:   hash,
      role:       'user',
      location:   location || null,
      zone:       detected.fullZone,
      language:   language || 'en',
      lat:        latitude || null,
      lng:        longitude || null,
    });

    // AUTO-CREATE recipient entry
    const existingRecipient = await dbGetOne('recipients', { phone: normalizedPhone });
    if (!existingRecipient) {
      await dbInsert('recipients', {
        name:       name.trim(),
        phone:      normalizedPhone,
        zone:       detected.fullZone,
        language:   language || 'en',
        active:     true,
        lat:        latitude || null,
        lng:        longitude || null,
      });
      console.log(`[UACS AUTH] Auto-added ${normalizedPhone} to Recipients list — ${detected.fullZone}`);
    } else {
      // Update existing recipient with new zone data
      await dbUpdate('recipients', existingRecipient.id, {
        zone: detected.fullZone,
        lat: latitude || existingRecipient.lat,
        lng: longitude || existingRecipient.lng,
      });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: newUser.id, phone: newUser.email, role: newUser.role, jti: uuidv4() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log(`[UACS AUTH] New user registered: "${newUser.name}" — ${detected.fullZone}`);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.email,
        role: newUser.role,
        location: location || null,
        zone: detected.fullZone,
        city: detected.city,
        language: language || 'en',
        lat: latitude || null,
        lng: longitude || null,
      },
    });
  } catch (err) {
    console.error('[UACS AUTH] Register error:', err.message);
    res.status(500).json({ error: 'Server error during registration' });
  }
});


// ─── GET /api/auth/me ──────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await dbGetOne('users', { id: decoded.id });

    if (!user) return res.status(401).json({ error: 'User not found' });

    // ALWAYS re-detect zone to ensure accuracy
    const locationText = user.location || '';
    const detected = detectZone(locationText, user.lat, user.lng);
    
    let currentZone = user.zone;
    let currentCity = detected.city;

    // Fix stale/missing zones
    if (!currentZone || currentZone === 'General' || currentZone === 'Field Ops' || currentZone === 'Central Command') {
      currentZone = detected.fullZone;
      currentCity = detected.city;
      // Persist the fix
      await dbUpdate('users', user.id, { zone: currentZone });
    } else {
      // Extract city from zone string
      const cityMatch = currentZone.match(/—\s*(.*)/);
      currentCity = cityMatch ? cityMatch[1] : detected.city;
    }

    const { password: _, ...safe } = user;

    const rawLoc = (user.location && user.location !== 'Field Ops' && user.location !== 'General') ? user.location : null;
    const profileData = {
      ...safe,
      zone: rawLoc || (currentZone && currentZone !== 'Field Ops' && currentZone !== 'General' ? currentZone : 'Not Available'),
      city: rawLoc || (currentCity && currentCity !== 'Field Ops' && currentCity !== 'General' ? currentCity : 'Not Available'),
      location: rawLoc,
      language: safe.language || 'en',
      phone: safe.email, // Expose phone field from email column
    };

    res.json(profileData);
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    if (err.name === 'JsonWebTokenError')  return res.status(401).json({ error: 'Invalid token',  code: 'INVALID_TOKEN' });
    console.error('[UACS AUTH] Me error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUT /api/auth/profile ─────────────────────────────
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { name, location, zone, lat, lng } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const locationText = zone || location || '';
    const detected = detectZone(locationText, lat, lng);

    const userUpdates = { name: name.trim() };
    if (locationText) {
      userUpdates.location = locationText;
      userUpdates.zone = detected.fullZone;
    }
    if (lat !== undefined) userUpdates.lat = lat;
    if (lng !== undefined) userUpdates.lng = lng;

    const updated = await dbUpdate('users', decoded.id, userUpdates);

    // Sync to Recipients table (by phone/email)
    if (updated && updated.email) {
       const existingRecipient = await dbGetOne('recipients', { phone: updated.email });
       const recUpdates = { 
         name: updated.name,
         phone: updated.email,
         zone: locationText || 'Not Provided',
         lat: lat !== undefined ? lat : updated.lat,
         lng: lng !== undefined ? lng : updated.lng,
         active: true
       };
       if (existingRecipient) {
          await dbUpdate('recipients', existingRecipient.id, recUpdates);
       } else {
          await dbInsert('recipients', recUpdates);
       }
    }

    const { password: _, ...safe } = updated;
    res.json({ success: true, user: { ...safe, city: detected.city } });
  } catch (err) {
    console.error('[UACS AUTH] Profile update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/auth/password ─────────────────────────────
router.put('/password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords are required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    const user = await dbGetOne('users', { id: decoded.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!bcrypt.compareSync(currentPassword, user.password))
      return res.status(401).json({ error: 'Current password is incorrect' });
    await dbUpdate('users', decoded.id, { password: bcrypt.hashSync(newPassword, 10) });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('[UACS AUTH] Password error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/preferences ─────────────────────────────
router.get('/preferences', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    
    const user = await dbGetOne('users', { id: decoded.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const detected = detectZone(user.location, user.lat, user.lng);
    
    res.json({ 
      language: user.language || 'en', 
      zone: user.zone || detected.fullZone, 
      lat: user.lat,
      lng: user.lng,
      active: true
    });
  } catch (err) {
    console.error('[UACS AUTH] Get preferences error:', err.message);
    res.status(500).json({ error: 'Server error fetching preferences' });
  }
});

// ─── PUT /api/auth/preferences ─────────────────────────────
router.put('/preferences', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    
    const { language, zone, lat, lng, active } = req.body;
    
    const detected = detectZone(zone, lat, lng);

    // 1. Update users table
    await dbUpdate('users', decoded.id, { 
      zone: detected.fullZone,
      language: language || 'en',
      lat: lat || null,
      lng: lng || null
    });

    // 2. Sync to recipients table for dispatching
    const recipient = await dbGetOne('recipients', { phone: decoded.phone });
    if (recipient) {
      await dbUpdate('recipients', recipient.id, { 
        zone: detected.fullZone,
        language: language || 'en',
        lat: lat || null,
        lng: lng || null,
        active: active !== undefined ? active : true
      });
    } else {
      const user = await dbGetOne('users', { id: decoded.id });
      await dbInsert('recipients', {
        name: user.name,
        phone: decoded.phone,
        language: language || 'en',
        zone: detected.fullZone,
        lat: lat || null,
        lng: lng || null,
        active: active !== undefined ? active : true
      });
    }
    
    res.json({ success: true, message: 'Preferences updated and synced' });
  } catch (err) {
    console.error('[UACS AUTH] Update preferences error:', err.message);
    res.status(500).json({ error: 'Server error updating preferences' });
  }
});

// ─── POST /api/auth/emergency-contact ─────────────────────────────
router.post('/emergency-contact', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    
    let { phone, name } = req.body;
    if (!phone) return res.status(400).json({ error: 'Emergency contact number is required' });
    
    const normalizedPhone = '+91' + phone.replace(/\D/g, '');
    if (normalizedPhone.length < 13) return res.status(400).json({ error: 'Valid mobile number is required' });

    // Check if recipient already exists
    let existing = await dbGetOne('recipients', { phone: normalizedPhone });
    if (existing) {
      return res.json({ success: true, message: 'Contact is already registered in the system.' });
    }

    const user = await dbGetOne('users', { id: decoded.id });
    
    await dbInsert('recipients', {
      name: `${user.name} (Emergency Contact)`,
      phone: normalizedPhone,
      zone: 'Emergency',
      language: 'en',
      active: true
    });
    
    console.log(`[UACS AUTH] Emergency contact ${normalizedPhone} added by ${user.name}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[UACS AUTH] Add emergency contact error:', err.message);
    res.status(500).json({ error: 'Server error adding emergency contact' });
  }
});

// ─── POST /api/auth/migrate-zones — One-time zone fix ──────
router.post('/migrate-zones', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const caller = await dbGetOne('users', { id: decoded.id });
    if (caller?.role !== 'admin')
      return res.status(403).json({ error: 'Admin only' });

    let fixedUsers = 0;
    let fixedRecipients = 0;

    // Fix users
    const allUsers = await dbSelect('users', {}, { limit: 5000 });
    for (const u of allUsers) {
      const detected = detectZone(u.location, u.lat, u.lng);
      const currentZone = u.zone || '';
      if (!currentZone || currentZone === 'General' || currentZone === 'Field Ops' || currentZone === 'Central Command') {
        await dbUpdate('users', u.id, { zone: detected.fullZone });
        fixedUsers++;
      }
    }

    // Fix recipients
    const allRecipients = await dbSelect('recipients', {}, { limit: 5000 });
    for (const r of allRecipients) {
      const detected = detectZone(r.zone, r.lat, r.lng);
      // If zone doesn't contain "—", it's probably a raw city name
      if (r.zone && !r.zone.includes('—')) {
        await dbUpdate('recipients', r.id, { zone: detected.fullZone });
        fixedRecipients++;
      }
    }

    console.log(`[UACS MIGRATION] Fixed ${fixedUsers} users and ${fixedRecipients} recipients`);
    res.json({ success: true, fixedUsers, fixedRecipients });
  } catch (err) {
    console.error('[UACS MIGRATION] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
