import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbInsert, dbGetOne, dbUpdate } from './database/db.js';

// Resolve directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize dotenv from workspace root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function addVaiUser() {
  console.log('[UACS] Starting creation of user Vai...');

  const name = 'Vai';
  const phone = '8169825915';
  const location = 'Mumbai';
  const password = 'vaibhav-hx';

  // Normalize
  const normalizedPhone = phone.trim().replace(/\s+/g, '');
  const hash = bcrypt.hashSync(password, 10);

  try {
    const existing = await dbGetOne('users', { email: normalizedPhone });
    if (existing) {
      console.log(`[UACS] User with phone number ${normalizedPhone} already exists. Updating to user account with new password.`);
      await dbUpdate('users', existing.id, {
        name: name,
        password: hash,
        location: location,
        zone: location,
        role: 'user' // Explicitly set role to user!
      });
      console.log(`[UACS] Updated existing user to 'user' role`);
    } else {
      const newUser = await dbInsert('users', {
        name: name,
        email: normalizedPhone,
        password: hash,
        role: 'user',
        location: location,
        zone: location,
        language: 'en'
      });
      console.log(`[UACS] Inserted user Vai successfully with ID: ${newUser.id}`);
    }

    // Auto-create/Update recipient
    const existingRecipient = await dbGetOne('recipients', { phone: normalizedPhone });
    if (!existingRecipient) {
      await dbInsert('recipients', {
        name: name,
        phone: normalizedPhone,
        zone: location,
        language: 'en',
        active: true
      });
      console.log(`[UACS] Inserted recipient Vai successfully.`);
    } else {
      await dbUpdate('recipients', existingRecipient.id, {
        name: name,
        zone: location,
        active: true
      });
      console.log(`[UACS] Updated recipient Vai successfully.`);
    }

    console.log('[UACS] User Vai completely updated as a user account.');
    process.exit(0);
  } catch (err) {
    console.error('[UACS] Error creating user Vai:', err);
    process.exit(1);
  }
}

addVaiUser();
